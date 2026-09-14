begin transaction read only;

with verification as (
  select 'relation:property_unit_completion_events'::text check_name,
    case when to_regclass('public.property_unit_completion_events') is not null then 'PASS' else 'FAIL' end::text status,
    coalesce(to_regclass('public.property_unit_completion_events')::text, 'missing') detail
  union all
  select 'security:completion_events_rls', case when relrowsecurity then 'PASS' else 'FAIL' end, relrowsecurity::text
  from pg_class where oid = to_regclass('public.property_unit_completion_events')
  union all
  select 'function:complete_builder_inventory_unit_authoritative',
    case when p.prosecdef and not has_function_privilege('authenticated', p.oid, 'EXECUTE') and has_function_privilege('service_role', p.oid, 'EXECUTE') then 'PASS' else 'FAIL' end,
    'security_definer=' || p.prosecdef::text || ', authenticated_execute=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_builder_inventory_unit_authoritative'
  union all
  select 'legacy:unit_count_preserved', 'INFO', count(*)::text from public.builder_inventory_units
  union all
  select 'events:current_count', 'INFO', count(*)::text from public.property_unit_completion_events
)
select check_name, status, detail from verification
order by case status when 'FAIL' then 1 when 'PASS' then 2 else 3 end, check_name;

rollback;
