create table if not exists vendor_taxonomy_extensions (
  id uuid primary key default gen_random_uuid(),
  vendor_user_id uuid not null,
  module text not null check (module in ('materials','rentals')),
  base_category text,
  base_subcategory text,
  product_variation text not null,
  specification_name text,
  specification_value text,
  unit_or_packaging text,
  buyer_search_words text,
  notes text,
  status text not null default 'vendor_private',
  created_at timestamptz not null default now()
);

create index if not exists vendor_taxonomy_extensions_vendor_idx
on vendor_taxonomy_extensions(vendor_user_id);

create index if not exists vendor_taxonomy_extensions_module_idx
on vendor_taxonomy_extensions(module);
