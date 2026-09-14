begin;

create table if not exists public.builder_project_catalog_unit_templates (
  catalog_id uuid primary key,
  project_id uuid not null,
  template_data jsonb not null default '{}'::jsonb,
  amenity_ids uuid[] not null default '{}'::uuid[],
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  constraint builder_catalog_template_catalog_fk
    foreign key (project_id, catalog_id)
    references public.builder_project_catalogs(project_id, id)
    on delete cascade,
  constraint builder_catalog_template_json_object
    check (jsonb_typeof(template_data) = 'object'),
  constraint builder_catalog_template_amenity_limit
    check (cardinality(amenity_ids) <= 250)
);

create index if not exists builder_catalog_templates_project_idx
  on public.builder_project_catalog_unit_templates(project_id);

alter table public.builder_project_catalog_unit_templates enable row level security;

comment on table public.builder_project_catalog_unit_templates is
  'Versioned builder-owned defaults for repeatedly creating the same type of unit. Exact boundaries, Trusted Media and legal coverage are intentionally excluded.';
comment on column public.builder_project_catalog_unit_templates.template_data is
  'Non-authoritative creation defaults only; exact unit facts remain on builder_inventory_units.';
comment on column public.builder_project_catalog_unit_templates.amenity_ids is
  'Default amenity selection copied as an editable snapshot when a unit is created.';

revoke all on public.builder_project_catalog_unit_templates from public, anon, authenticated;
grant select, insert, update, delete on public.builder_project_catalog_unit_templates to service_role;

commit;
