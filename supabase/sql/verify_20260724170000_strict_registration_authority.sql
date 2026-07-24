begin;

do $$
declare
  v_guard_exists boolean;
  v_compat_definition text;
begin
  select exists (
    select 1
    from pg_trigger
    where tgname = 'business_profiles_registration_completion_guard'
      and not tgisinternal
  ) into v_guard_exists;

  if not v_guard_exists then
    raise exception 'Registration completion guard trigger is missing.';
  end if;

  select pg_get_functiondef(p.oid)
    into v_compat_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_self_registration_compatibility'
  limit 1;

  if v_compat_definition ilike '%set registration_complete = true%' then
    raise exception 'Compatibility completion still grants registration completion.';
  end if;

  if v_compat_definition not ilike '%registration_complete = false%' then
    raise exception 'Compatibility completion does not preserve incomplete state.';
  end if;
end
$$;

select
  p.proname,
  p.prosecdef as is_security_definer,
  pg_get_userbyid(p.proowner) = 'postgres' as owner_is_postgres,
  replace(array_to_string(p.proconfig, ','), ' ', '') like '%search_path=public,auth,pg_catalog%'
    as hardened_search_path_preserved
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'business_registration_evidence_ready',
    'guard_business_registration_completion',
    'vendor_registration_complete',
    'complete_self_registration_compatibility'
  )
order by p.proname;

rollback;
