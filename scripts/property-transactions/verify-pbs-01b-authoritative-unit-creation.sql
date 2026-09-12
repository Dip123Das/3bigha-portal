begin transaction read only;

select
  'column:' || expected.column_name as check_name,
  case when actual.column_name is not null then 'PASS' else 'FAIL' end as status,
  coalesce(actual.udt_name, 'missing') as detail
from (
  values ('catalog_id'), ('bedroom_count'), ('structure_floors')
) expected(column_name)
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'builder_inventory_units'
 and actual.column_name = expected.column_name

union all

select
  'function:create_builder_inventory_units_authoritative',
  case when function_row.oid is not null then 'PASS' else 'FAIL' end,
  case
    when function_row.oid is null then 'missing'
    else concat(
      'security_definer=', function_row.prosecdef,
      ', authenticated_execute=', has_function_privilege(
        'authenticated',
        function_row.oid,
        'EXECUTE'
      ),
      ', service_role_execute=', has_function_privilege(
        'service_role',
        function_row.oid,
        'EXECUTE'
      )
    )
  end
from (
  select resolved.oid, routine.prosecdef
  from (
    select to_regprocedure(
      'public.create_builder_inventory_units_authoritative(uuid,uuid,jsonb,uuid[])'
    ) as oid
  ) resolved
  left join pg_proc routine on routine.oid = resolved.oid
) function_row

union all

select
  'legacy:unit_count_preserved',
  case when count(*) = 26 then 'PASS' else 'REVIEW' end,
  count(*)::text
from public.builder_inventory_units

union all

select
  'legacy:available_status_preserved',
  case when count(*) = 25 then 'PASS' else 'REVIEW' end,
  count(*)::text
from public.builder_inventory_units
where status = 'available'::public.inventory_status

union all

select
  'legacy:sold_status_preserved',
  case when count(*) = 1 then 'PASS' else 'REVIEW' end,
  count(*)::text
from public.builder_inventory_units
where status = 'sold'::public.inventory_status

order by check_name;

rollback;
