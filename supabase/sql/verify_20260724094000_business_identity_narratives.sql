-- Verification: Human-First Business Identity narrative columns
-- Expected result:
--   both columns exist
--   data type is text
--   nullable is YES

with expected_columns(column_name) as (
  values
    ('about_person'::text),
    ('about_business'::text)
),
actual_columns as (
  select
    c.column_name,
    c.data_type,
    c.is_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'business_profiles'
    and c.column_name in (
      'about_person',
      'about_business'
    )
)
select
  e.column_name,
  coalesce(a.data_type, 'MISSING') as data_type,
  coalesce(a.is_nullable, 'MISSING') as is_nullable,
  case
    when a.column_name is null then false
    when a.data_type <> 'text' then false
    when a.is_nullable <> 'YES' then false
    else true
  end as verification_passed
from expected_columns e
left join actual_columns a
  on a.column_name = e.column_name
order by e.column_name;

do $$
declare
  missing_columns text[];
begin
  select array_agg(expected.column_name)
  into missing_columns
  from (
    values
      ('about_person'::text),
      ('about_business'::text)
  ) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'business_profiles'
      and c.column_name = expected.column_name
      and c.data_type = 'text'
      and c.is_nullable = 'YES'
  );

  if missing_columns is not null then
    raise exception
      'Business identity narrative verification failed for columns: %',
      array_to_string(missing_columns, ', ');
  end if;

  raise notice
    'Business identity narrative columns verified successfully.';
end
$$;
