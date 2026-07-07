select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike 'geo_%'
    or table_name ilike '%post%'
    or table_name ilike '%pin%'
  )
order by table_name, ordinal_position;
