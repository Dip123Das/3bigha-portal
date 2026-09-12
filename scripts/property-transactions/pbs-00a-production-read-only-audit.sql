begin transaction read only;

select
  'PBS_00A_PROPERTY_TRANSACTION_PRODUCTION_READ_ONLY_AUDIT' as audit_name,
  current_database() as database_name,
  current_user as database_user,
  current_setting('transaction_read_only') as transaction_read_only,
  current_timestamp as audited_at;

-- Canonical relations that the transaction workspace may extend or depend on.
with expected(relation_name) as (
  values
    ('builder_profiles'),
    ('builder_projects'),
    ('builder_inventory_units'),
    ('builder_inventory_pricing'),
    ('builder_project_catalogs'),
    ('builder_inventory_unit_media'),
    ('builder_inventory_unit_amenities'),
    ('property_listings'),
    ('property_listing_sources'),
    ('listing_media_assets'),
    ('trusted_capture_sessions'),
    ('listing_media_verifications'),
    ('listing_moderation_events'),
    ('profiles'),
    ('business_profiles')
)
select
  e.relation_name,
  coalesce(c.relkind::text, 'missing') as relation_kind,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(c.relforcerowsecurity, false) as rls_forced
from expected e
left join pg_namespace n
  on n.nspname = 'public'
left join pg_class c
  on c.relnamespace = n.oid
 and c.relname = e.relation_name
order by e.relation_name;

-- Exact live columns remove the need for browser-side missing-column fallback.
select
  cols.table_name,
  cols.ordinal_position,
  cols.column_name,
  cols.data_type,
  cols.udt_name,
  cols.is_nullable,
  cols.column_default
from information_schema.columns cols
where cols.table_schema = 'public'
  and cols.table_name in (
    'builder_profiles',
    'builder_projects',
    'builder_inventory_units',
    'builder_inventory_pricing',
    'builder_project_catalogs',
    'builder_inventory_unit_media',
    'builder_inventory_unit_amenities',
    'property_listings',
    'property_listing_sources',
    'listing_media_assets',
    'trusted_capture_sessions',
    'listing_media_verifications',
    'listing_moderation_events',
    'profiles',
    'business_profiles'
  )
order by cols.table_name, cols.ordinal_position;

-- Constraints and indexes determine which inventory invariants already exist.
select
  conrelid::regclass::text as relation_name,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid, true) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    to_regclass('public.builder_projects'),
    to_regclass('public.builder_inventory_units'),
    to_regclass('public.builder_inventory_pricing'),
    to_regclass('public.property_listing_sources')
  )
order by relation_name, constraint_name;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'builder_projects',
    'builder_inventory_units',
    'builder_inventory_pricing',
    'property_listing_sources'
  )
order by tablename, indexname;

-- RLS policies are reported verbatim; no role supplied by a browser is trusted.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'builder_projects',
    'builder_inventory_units',
    'builder_inventory_pricing',
    'builder_project_catalogs',
    'builder_inventory_unit_media',
    'builder_inventory_unit_amenities',
    'property_listings',
    'property_listing_sources',
    'listing_media_assets',
    'trusted_capture_sessions',
    'listing_media_verifications',
    'listing_moderation_events',
    'objects'
  )
order by schemaname, tablename, policyname;

-- Function authority, volatility and search_path are security-relevant.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  p.proconfig as configuration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%builder%'
    or p.proname ilike '%property%'
    or p.proname ilike '%listing%media%'
    or p.proname ilike '%capture%session%'
  )
order by p.proname, identity_arguments;

-- Supabase Storage configuration, including the existing TLM and unit buckets.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
where id in (
  'listing-evidence-private',
  'builder-unit-media',
  'property-media',
  'property-documents-private'
)
order by id;

-- Counts reveal legacy compatibility scope without exposing document contents.
select 'builder_projects' as metric, count(*)::bigint as row_count
from public.builder_projects
union all
select 'builder_inventory_units', count(*)::bigint
from public.builder_inventory_units
union all
select 'property_listing_sources', count(*)::bigint
from public.property_listing_sources
union all
select 'listing_media_assets', count(*)::bigint
from public.listing_media_assets
order by metric;

select
  coalesce(nullif(lower(btrim(status::text)), ''), '<empty>') as unit_status,
  count(*)::bigint as row_count
from public.builder_inventory_units
group by 1
order by 1;

select
  coalesce(nullif(lower(trim(trust_status)), ''), '<empty>') as trust_status,
  count(*)::bigint as row_count
from public.builder_inventory_units
group by 1
order by 1;

rollback;
