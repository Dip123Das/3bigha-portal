begin;

create or replace function public.business_registration_evidence_ready(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $function$
  select coalesce(
    (
      select
        case
          when profile.role in ('vendor', 'builder', 'hub_vendor') then
            coalesce(business.is_complete, false)
            and lower(trim(coalesce(business.location_verification_status, ''))) = 'verified'
            and lower(trim(coalesce(business.selfie_capture_status, ''))) = 'verified'
            and business.selfie_media_json is not null
            and business.selfie_media_json <> '{}'::jsonb
            and business.selfie_media_json <> '[]'::jsonb
            and business.selfie_media_json <> 'null'::jsonb
            and lower(trim(coalesce(business.workplace_evidence_status, ''))) = 'verified'
            and business.workplace_media_json is not null
            and business.workplace_media_json <> '{}'::jsonb
            and business.workplace_media_json <> '[]'::jsonb
            and business.workplace_media_json <> 'null'::jsonb
            and lower(trim(coalesce(
              business.automated_verification_json #>> '{documentVerification,status}',
              business.automated_verification_json #>> '{document_verification,status}',
              business.automated_verification_json #>> '{document,status}',
              business.automated_verification_json ->> 'document_verification_status',
              ''
            ))) in ('verified_by_ai', 'verified', 'matched')
            and coalesce(
              nullif(business.automated_verification_json #>> '{documentVerification,confidence}', '')::numeric,
              nullif(business.automated_verification_json #>> '{document_verification,confidence}', '')::numeric,
              nullif(business.automated_verification_json #>> '{document,confidence}', '')::numeric,
              nullif(business.automated_verification_json ->> 'document_verification_confidence', '')::numeric,
              0
            ) >= 85
            and profile.registration_verification_status in ('auto_verified', 'admin_verified')
          else
            coalesce(business.is_complete, false)
            and lower(trim(coalesce(business.location_verification_status, ''))) = 'verified'
            and profile.registration_verification_status in ('auto_verified', 'admin_verified')
        end
      from public.business_profiles business
      join public.profiles profile on profile.id = business.user_id
      where business.user_id = p_user_id
      limit 1
    ),
    false
  );
$function$;

alter function public.business_registration_evidence_ready(uuid) owner to postgres;
revoke all on function public.business_registration_evidence_ready(uuid) from public, anon;
grant execute on function public.business_registration_evidence_ready(uuid) to authenticated;

create or replace function public.guard_business_registration_completion()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
begin
  if new.registration_complete is true
     and not public.business_registration_evidence_ready(new.user_id) then
    raise exception
      'Registration cannot be completed before canonical evidence verification succeeds.'
      using errcode = '23514';
  end if;

  if new.registration_complete is false then
    new.registration_completed_at := null;
  elsif old.registration_complete is distinct from true then
    new.registration_completed_at := coalesce(new.registration_completed_at, now());
  end if;

  return new;
end;
$function$;

alter function public.guard_business_registration_completion() owner to postgres;
revoke all on function public.guard_business_registration_completion() from public, anon, authenticated;

drop trigger if exists business_profiles_registration_completion_guard on public.business_profiles;
create trigger business_profiles_registration_completion_guard
before insert or update of registration_complete, registration_completed_at
on public.business_profiles
for each row
execute function public.guard_business_registration_completion();

create or replace function public.vendor_registration_complete(
  p_vendor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  v_ready boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if auth.uid() <> p_vendor_id then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  v_ready := public.business_registration_evidence_ready(p_vendor_id);

  update public.business_profiles
     set registration_complete = v_ready,
         registration_completed_at = case
           when v_ready then coalesce(registration_completed_at, now())
           else null
         end,
         updated_at = now()
   where user_id = p_vendor_id;

  return v_ready;
end;
$function$;

alter function public.vendor_registration_complete(uuid) owner to postgres;
revoke all on function public.vendor_registration_complete(uuid) from public, anon;
grant execute on function public.vendor_registration_complete(uuid) to authenticated;

create or replace function public.complete_self_registration_compatibility(
  p_portal_use_reason text,
  p_role_display_label text,
  p_full_name text,
  p_phone text,
  p_city text,
  p_state text,
  p_module_grants text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_is_complete boolean := false;
  v_module_key text;
  v_allowed_roles constant text[] := array['buyer', 'vendor', 'builder', 'hub_vendor', 'blogger', 'investor'];
  v_allowed_modules constant text[] := array[
    'materials', 'services', 'rentals', 'property_owner',
    'property_builder', 'blog_author', 'investor'
  ];
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select profile.role into v_role
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'Member profile not found';
  end if;

  if v_role is null or not (v_role = any(v_allowed_roles)) then
    raise exception 'Registration completion requires an existing permitted member role.'
      using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_portal_use_reason, '')), '') is null then
    raise exception 'Portal use reason is required.';
  end if;

  if nullif(trim(coalesce(p_role_display_label, '')), '') is null then
    raise exception 'Role display label is required.';
  end if;

  select coalesce(view_row.is_complete, false)
    into v_is_complete
  from public.v_vendor_profile_completeness view_row
  where view_row.user_id = v_user_id
  limit 1;

  if not v_is_complete then
    return jsonb_build_object(
      'ok', false,
      'reason', 'BUSINESS_PROFILE_INCOMPLETE',
      'registration_complete', false,
      'onboarding_completed', false
    );
  end if;

  foreach v_module_key in array coalesce(p_module_grants, array[]::text[])
  loop
    if not (v_module_key = any(v_allowed_modules)) then
      raise exception 'Unsupported registration module grant: %', v_module_key;
    end if;
  end loop;

  update public.business_profiles
     set registration_complete = false,
         registration_completed_at = null,
         updated_at = now()
   where user_id = v_user_id;

  if not found then
    raise exception 'Business profile not found.';
  end if;

  update public.profiles
     set onboarding_version = 2,
         onboarding_completed = true,
         portal_use_reason = trim(p_portal_use_reason),
         role_display_label = trim(p_role_display_label),
         full_name = coalesce(nullif(trim(coalesce(p_full_name, '')), ''), full_name),
         phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone),
         city = coalesce(nullif(trim(coalesce(p_city, '')), ''), city),
         state = coalesce(nullif(trim(coalesce(p_state, '')), ''), state),
         registration_verification_status = case
           when registration_verification_status in ('auto_verified', 'admin_verified', 'restricted')
             then registration_verification_status
           else 'automated_verification_pending'
         end,
         dashboard_activation_status = case
           when dashboard_activation_status in ('active', 'suspended')
             then dashboard_activation_status
           else 'not_ready'
         end,
         updated_at = now()
   where id = v_user_id;

  delete from public.vendor_module_grants where user_id = v_user_id;

  insert into public.vendor_module_grants(user_id, module_key, is_active)
  select v_user_id, module_key, true
  from (
    select distinct unnest(coalesce(p_module_grants, array[]::text[])) as module_key
  ) grants
  where module_key is not null and trim(module_key) <> '';

  return jsonb_build_object(
    'ok', true,
    'reason', 'PROFILE_SUBMITTED_FOR_EVIDENCE_VERIFICATION',
    'role', v_role,
    'registration_complete', false,
    'onboarding_completed', true,
    'verification_pending', true,
    'module_grants', coalesce(to_jsonb(p_module_grants), '[]'::jsonb)
  );
end;
$function$;

alter function public.complete_self_registration_compatibility(text, text, text, text, text, text, text[]) owner to postgres;
revoke all on function public.complete_self_registration_compatibility(text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.complete_self_registration_compatibility(text, text, text, text, text, text, text[]) to authenticated;

update public.business_profiles business
   set registration_complete = false,
       registration_completed_at = null,
       updated_at = now()
  from public.profiles profile
 where profile.id = business.user_id
   and profile.role in ('vendor', 'builder', 'hub_vendor')
   and not public.business_registration_evidence_ready(business.user_id);

commit;
