begin transaction read only;

select
  'column:builder_inventory_units.' || expected.column_name as check_name,
  case when actual.column_name is not null then 'PASS' else 'FAIL' end as status,
  coalesce(actual.udt_name, 'missing') as detail
from (
  values
    ('plot_area_sqft'),
    ('built_up_sqft'),
    ('carpet_sqft'),
    ('super_built_up_sqft'),
    ('dimension_length_ft'),
    ('dimension_width_ft'),
    ('boundary_north'),
    ('boundary_south'),
    ('boundary_east'),
    ('boundary_west'),
    ('availability_note')
) as expected(column_name)
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'builder_inventory_units'
 and actual.column_name = expected.column_name

union all

select
  'relation:property_unit_status_events',
  case
    when to_regclass('public.property_unit_status_events') is not null then 'PASS'
    else 'FAIL'
  end,
  coalesce(to_regclass('public.property_unit_status_events')::text, 'missing')

union all

select
  'relation:v_property_unit_transaction_readiness',
  case
    when to_regclass('public.v_property_unit_transaction_readiness') is not null then 'PASS'
    else 'FAIL'
  end,
  coalesce(to_regclass('public.v_property_unit_transaction_readiness')::text, 'missing')

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

union all

select
  'history:one_or_more_events_per_legacy_unit',
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  count(*)::text || ' units without an event'
from public.builder_inventory_units unit
where not exists (
  select 1
  from public.property_unit_status_events event
  where event.unit_id = unit.id
)

union all

select
  'readiness:ready_units',
  'INFO',
  count(*) filter (where transaction_data_ready)::text
from public.v_property_unit_transaction_readiness

union all

select
  'readiness:units_missing_four_boundaries',
  'INFO',
  count(*) filter (where not has_four_boundaries)::text
from public.v_property_unit_transaction_readiness

union all

select
  'readiness:units_missing_positive_price',
  'INFO',
  count(*) filter (where not has_positive_price)::text
from public.v_property_unit_transaction_readiness

union all

select
  'readiness:units_missing_property_mapping',
  'INFO',
  count(*) filter (
    where not has_property_type or not has_property_subtype
  )::text
from public.v_property_unit_transaction_readiness

union all

select
  'legacy:listing_source_project_mismatch_preserved_for_review',
  case when count(*) = 1 then 'PASS' else 'REVIEW' end,
  count(*)::text
from public.property_listing_sources source
join public.builder_inventory_units unit
  on unit.id = source.unit_id
where source.source_kind = 'builder_inventory'::public.source_kind
  and source.project_id is distinct from unit.project_id

order by check_name;

rollback;
