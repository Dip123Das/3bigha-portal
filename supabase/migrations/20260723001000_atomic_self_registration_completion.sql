begin;

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
  v_registration_complete boolean := false;
  v_module_key text;
  v_allowed_roles constant text[] :=
    array[
      'buyer',
      'vendor',
      'builder',
      'hub_vendor',
      'blogger',
      'investor'
    ];
  v_allowed_modules constant text[] :=
    array[
      'materials',
      'services',
      'rentals',
      'property_owner',
      'property_builder',
      'blog_author',
      'investor'
    ];
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select profile.role
    into v_role
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'Member profile not found';
  end if;

  if v_role is null or not (v_role = any(v_allowed_roles)) then
    raise exception
      'Registration completion requires an existing permitted member role.'
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
      'registration_complete', false
    );
  end if;

  foreach v_module_key in array coalesce(
    p_module_grants,
    array[]::text[]
  )
  loop
    if not (v_module_key = any(v_allowed_modules)) then
      raise exception 'Unsupported registration module grant: %',
        v_module_key;
    end if;
  end loop;

  update public.business_profiles
     set registration_complete = true,
         registration_completed_at =
           coalesce(registration_completed_at, now()),
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
         full_name = coalesce(
           nullif(trim(coalesce(p_full_name, '')), ''),
           full_name
         ),
         phone = coalesce(
           nullif(trim(coalesce(p_phone, '')), ''),
           phone
         ),
         city = coalesce(
           nullif(trim(coalesce(p_city, '')), ''),
           city
         ),
         state = coalesce(
           nullif(trim(coalesce(p_state, '')), ''),
           state
         ),
         updated_at = now()
   where id = v_user_id;

  delete from public.vendor_module_grants
  where user_id = v_user_id;

  insert into public.vendor_module_grants(
    user_id,
    module_key,
    is_active
  )
  select
    v_user_id,
    module_key,
    true
  from (
    select distinct unnest(
      coalesce(p_module_grants, array[]::text[])
    ) as module_key
  ) grants
  where module_key is not null
    and trim(module_key) <> '';

  select coalesce(view_row.registration_complete, false)
    into v_registration_complete
  from public.v_vendor_profile_completeness view_row
  where view_row.user_id = v_user_id
  limit 1;

  return jsonb_build_object(
    'ok', v_registration_complete,
    'reason',
      case
        when v_registration_complete
          then 'REGISTRATION_COMPATIBILITY_COMPLETED'
        else 'REGISTRATION_COMPLETION_NOT_CONFIRMED'
      end,
    'role', v_role,
    'registration_complete', v_registration_complete,
    'onboarding_completed', true,
    'module_grants',
      coalesce(to_jsonb(p_module_grants), '[]'::jsonb)
  );
end;
$function$;

alter function public.complete_self_registration_compatibility(
  text,
  text,
  text,
  text,
  text,
  text,
  text[]
)
owner to postgres;

revoke all on function
  public.complete_self_registration_compatibility(
    text,
    text,
    text,
    text,
    text,
    text,
    text[]
  )
from public, anon;

grant execute on function
  public.complete_self_registration_compatibility(
    text,
    text,
    text,
    text,
    text,
    text,
    text[]
  )
to authenticated;

comment on function
  public.complete_self_registration_compatibility(
    text,
    text,
    text,
    text,
    text,
    text,
    text[]
  )
is
  'Atomically finalizes legacy registration compatibility fields for the authenticated member. It does not assign roles, approve identity, activate subscriptions or activate dashboard access.';

commit;
