create table if not exists public.vendor_listing_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  module text not null,
  memory_type text not null,

  title text not null,
  payload jsonb not null default '{}'::jsonb,

  usage_count integer not null default 1,
  last_used_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_listing_memory_user_module_idx
on public.vendor_listing_memory (user_id, module, last_used_at desc);

create index if not exists vendor_listing_memory_user_type_idx
on public.vendor_listing_memory (user_id, memory_type, last_used_at desc);

alter table public.vendor_listing_memory enable row level security;

drop policy if exists "vendor_listing_memory_select_own"
on public.vendor_listing_memory;

create policy "vendor_listing_memory_select_own"
on public.vendor_listing_memory
for select
using (auth.uid() = user_id);

drop policy if exists "vendor_listing_memory_insert_own"
on public.vendor_listing_memory;

create policy "vendor_listing_memory_insert_own"
on public.vendor_listing_memory
for insert
with check (auth.uid() = user_id);

drop policy if exists "vendor_listing_memory_update_own"
on public.vendor_listing_memory;

create policy "vendor_listing_memory_update_own"
on public.vendor_listing_memory
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "vendor_listing_memory_delete_own"
on public.vendor_listing_memory;

create policy "vendor_listing_memory_delete_own"
on public.vendor_listing_memory
for delete
using (auth.uid() = user_id);