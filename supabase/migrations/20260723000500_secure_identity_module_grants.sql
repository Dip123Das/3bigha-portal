-- Module grants are derived from validated identity entitlements. The browser
-- cannot choose arbitrary modules or write directly through table RLS.

create or replace function public.sync_member_module_grants()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.member_identity_entitlements entitlement
    where entitlement.user_id = v_user_id
  ) then
    raise exception 'Declare at least one valid identity before modules are granted'
      using errcode = '42501';
  end if;

  delete from public.vendor_module_grants
  where user_id = v_user_id;

  insert into public.vendor_module_grants(
    user_id,
    module_key,
    is_active
  )
  select
    v_user_id,
    modules.module_key,
    true
  from (
    select distinct unnest(identity.legacy_modules) as module_key
    from public.member_identity_entitlements entitlement
    join public.identity_master identity
      on identity.identity_key = entitlement.identity_key
     and identity.is_active
    where entitlement.user_id = v_user_id
      and entitlement.status in ('active', 'pending_verification')
  ) modules
  where modules.module_key = any(
    array[
      'materials',
      'services',
      'rentals',
      'property_owner',
      'property_builder',
      'blog_author',
      'investor'
    ]::text[]
  );
end;
$$;

alter function public.sync_member_module_grants() owner to postgres;
revoke all on function public.sync_member_module_grants()
  from public, anon, authenticated;
grant execute on function public.sync_member_module_grants()
  to authenticated;
