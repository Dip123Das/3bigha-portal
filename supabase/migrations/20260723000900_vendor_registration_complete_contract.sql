begin;

create or replace function public.vendor_registration_complete(
  p_vendor_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $function$
declare
  v_is_complete boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  if auth.uid() <> p_vendor_id then
    raise exception 'Not allowed'
      using errcode = '42501';
  end if;

  select coalesce(v.is_complete, false)
    into v_is_complete
  from public.v_vendor_profile_completeness v
  where v.user_id = p_vendor_id
  limit 1;

  if not v_is_complete then
    return false;
  end if;

  update public.business_profiles bp
     set registration_complete = true,
         registration_completed_at =
           coalesce(bp.registration_completed_at, now())
   where bp.user_id = p_vendor_id;

  return coalesce(
    (
      select v.registration_complete
      from public.v_vendor_profile_completeness v
      where v.user_id = p_vendor_id
      limit 1
    ),
    false
  );
end;
$function$;

alter function public.vendor_registration_complete(uuid)
  owner to postgres;

revoke all on function
  public.vendor_registration_complete(uuid)
from public, anon;

grant execute on function
  public.vendor_registration_complete(uuid)
to authenticated;

comment on function public.vendor_registration_complete(uuid) is
  'Legacy compatibility finalizer. It marks business profile completeness only. It does not approve identity, perform verification, activate subscriptions or activate dashboard access.';

commit;
