begin transaction read only;

with verification as (
  select 'column:' || column_name check_name, 'PASS'::text status, data_type detail
  from information_schema.columns
  where table_schema = 'public' and table_name = 'builder_inventory_units'
    and column_name in ('land_vacancy_status', 'existing_structure_type', 'boundary_demarcation_type')
  union all
  select 'constraint:' || conname, 'PASS', pg_get_constraintdef(oid, true)
  from pg_constraint
  where connamespace = 'public'::regnamespace
    and conrelid = 'public.builder_inventory_units'::regclass
    and conname in (
      'builder_units_land_vacancy_status_check',
      'builder_units_existing_structure_type_check',
      'builder_units_boundary_demarcation_type_check',
      'builder_units_land_fields_only_for_plots'
    )
  union all
  select 'function:create_units_wrapper',
    case when p.prosecdef and not has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'PASS' else 'FAIL' end,
    'security_definer=' || p.prosecdef::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_builder_inventory_units_authoritative'
  union all
  select 'function:complete_unit_wrapper',
    case when p.prosecdef and not has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'PASS' else 'FAIL' end,
    'security_definer=' || p.prosecdef::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_builder_inventory_unit_authoritative'
  union all
  select 'legacy:unit_count_preserved', 'INFO', count(*)::text from public.builder_inventory_units
)
select check_name, status, detail from verification
order by case status when 'FAIL' then 1 when 'PASS' then 2 else 3 end, check_name;

rollback;
