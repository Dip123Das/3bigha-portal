begin transaction read only;

with verification as (
  select
    'relation:builder_project_catalog_unit_templates'::text as check_name,
    case when to_regclass('public.builder_project_catalog_unit_templates') is not null then 'PASS' else 'FAIL' end::text as status,
    coalesce(to_regclass('public.builder_project_catalog_unit_templates')::text, 'missing') as detail
  union all
  select 'security:rls_enabled', case when c.relrowsecurity then 'PASS' else 'FAIL' end, c.relrowsecurity::text
  from pg_class c where c.oid = to_regclass('public.builder_project_catalog_unit_templates')
  union all
  select 'constraint:' || con.conname, 'PASS', pg_get_constraintdef(con.oid, true)
  from pg_constraint con where con.conrelid = to_regclass('public.builder_project_catalog_unit_templates')
  union all
  select 'privilege:anon',
    case when has_table_privilege('anon', 'public.builder_project_catalog_unit_templates', 'SELECT,INSERT,UPDATE,DELETE') then 'FAIL' else 'PASS' end,
    'direct table access must be denied'
  union all
  select 'privilege:authenticated',
    case when has_table_privilege('authenticated', 'public.builder_project_catalog_unit_templates', 'SELECT,INSERT,UPDATE,DELETE') then 'FAIL' else 'PASS' end,
    'direct table access must be denied'
  union all
  select 'privilege:service_role',
    case when has_table_privilege('service_role', 'public.builder_project_catalog_unit_templates', 'SELECT,INSERT,UPDATE,DELETE') then 'PASS' else 'FAIL' end,
    'server authority requires access'
  union all
  select 'templates:current_count', 'INFO', count(*)::text
  from public.builder_project_catalog_unit_templates
)
select check_name, status, detail
from verification
order by case status when 'FAIL' then 1 when 'PASS' then 2 else 3 end, check_name;

rollback;
