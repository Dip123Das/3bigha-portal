with checks as (
  select 'relation:property_unit_legal_profiles'::text check_name,
    case when to_regclass('public.property_unit_legal_profiles') is not null then 'PASS' else 'FAIL' end status,
    coalesce(to_regclass('public.property_unit_legal_profiles')::text, 'missing') detail
  union all
  select 'relation:property_project_legal_documents',
    case when to_regclass('public.property_project_legal_documents') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regclass('public.property_project_legal_documents')::text, 'missing')
  union all
  select 'relation:property_unit_legal_document_links',
    case when to_regclass('public.property_unit_legal_document_links') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regclass('public.property_unit_legal_document_links')::text, 'missing')
  union all
  select 'security:all_legal_tables_rls',
    case when count(*) = 3 and bool_and(c.relrowsecurity) then 'PASS' else 'FAIL' end,
    concat('secured=', count(*) filter (where c.relrowsecurity), '/3')
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (
    'property_unit_legal_profiles','property_project_legal_documents','property_unit_legal_document_links'
  )
  union all
  select 'privilege:authenticated_direct_access',
    case when not has_table_privilege('authenticated','public.property_unit_legal_profiles','select,insert,update,delete')
      and not has_table_privilege('authenticated','public.property_project_legal_documents','select,insert,update,delete')
      and not has_table_privilege('authenticated','public.property_unit_legal_document_links','select,insert,update,delete')
      then 'PASS' else 'FAIL' end,
    'private server authority required'
  union all
  select 'storage:property-documents-private',
    case when exists(select 1 from storage.buckets where id='property-documents-private' and public=false) then 'PASS' else 'FAIL' end,
    coalesce((select concat('public=', public, ', limit=', file_size_limit) from storage.buckets where id='property-documents-private'),'missing')
  union all
  select 'documents:current_count','INFO',count(*)::text from public.property_project_legal_documents
  union all
  select 'links:current_count','INFO',count(*)::text from public.property_unit_legal_document_links
  union all
  select 'legacy:unit_count_preserved','INFO',count(*)::text from public.builder_inventory_units
)
select * from checks order by check_name;
