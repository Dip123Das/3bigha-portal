begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents-private',
  'property-documents-private',
  false,
  8388608,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.property_unit_legal_profiles (
  unit_id uuid primary key references public.builder_inventory_units(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  plot_numbers text[] not null default '{}',
  deed_numbers text[] not null default '{}',
  mutation_numbers text[] not null default '{}',
  khatian_numbers text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_unit_legal_profiles_project_unit_fk
    foreign key(project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete cascade,
  constraint property_unit_legal_profiles_identifier_limit check (
    cardinality(plot_numbers) <= 100 and cardinality(deed_numbers) <= 100
    and cardinality(mutation_numbers) <= 100 and cardinality(khatian_numbers) <= 100
  )
);

create table if not exists public.property_project_legal_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'title_deed','mutation','land_revenue_tax','panchayat_tax','municipality_tax',
    'khatian_ror','conversion','sanctioned_plan','possession','other'
  )),
  title text not null check (length(btrim(title)) between 1 and 180),
  storage_bucket text not null default 'property-documents-private'
    check (storage_bucket = 'property-documents-private'),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 8388608),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  declared_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(declared_facts) = 'object'),
  extracted_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_facts) = 'object'),
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending','completed','failed','unavailable')),
  analysis_confidence integer check (analysis_confidence between 0 and 100),
  analysis_model text,
  ai_summary text,
  ai_warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(ai_warnings) = 'array'),
  superseded_at timestamptz,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_project_legal_documents_project_created_idx
  on public.property_project_legal_documents(project_id, created_at desc)
  where superseded_at is null;

create unique index if not exists property_project_legal_documents_project_id_id_uk
  on public.property_project_legal_documents(project_id, id);

create table if not exists public.property_unit_legal_document_links (
  unit_id uuid not null references public.builder_inventory_units(id) on delete cascade,
  document_id uuid not null references public.property_project_legal_documents(id) on delete cascade,
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  link_source text not null check (link_source in ('uploaded_for_unit','ai_reuse_confirmed','manual_confirmed')),
  link_reason text,
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  primary key(unit_id, document_id),
  constraint property_unit_legal_links_project_unit_fk
    foreign key(project_id, unit_id)
    references public.builder_inventory_units(project_id, id)
    on delete cascade,
  constraint property_unit_legal_links_project_document_fk
    foreign key(project_id, document_id)
    references public.property_project_legal_documents(project_id, id)
    on delete cascade
);

alter table public.property_unit_legal_profiles enable row level security;
alter table public.property_project_legal_documents enable row level security;
alter table public.property_unit_legal_document_links enable row level security;

revoke all on public.property_unit_legal_profiles from public, anon, authenticated;
revoke all on public.property_project_legal_documents from public, anon, authenticated;
revoke all on public.property_unit_legal_document_links from public, anon, authenticated;
grant select, insert, update, delete on public.property_unit_legal_profiles to service_role;
grant select, insert, update, delete on public.property_project_legal_documents to service_role;
grant select, insert, update, delete on public.property_unit_legal_document_links to service_role;

-- No client storage policies are created. Every private upload and signed read is
-- issued by the server only after builder/project/unit ownership is verified.

commit;
