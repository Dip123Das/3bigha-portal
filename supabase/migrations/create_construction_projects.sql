create table if not exists public.construction_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  title text not null,
  city text,
  locality text,
  pincode text,

  built_up_area_sqft integer not null,
  floor_count integer not null default 1,
  grade text not null default 'standard',
  room_count integer not null default 3,
  bathroom_count integer not null default 2,
  kitchen_count integer not null default 1,
  has_interior_work boolean not null default false,

  project_start_date date,

  status text not null default 'planning',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.construction_projects enable row level security;

create policy "Users can view own construction projects"
on public.construction_projects
for select
using (auth.uid() = user_id);

create policy "Users can insert own construction projects"
on public.construction_projects
for insert
with check (auth.uid() = user_id);

create policy "Users can update own construction projects"
on public.construction_projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own construction projects"
on public.construction_projects
for delete
using (auth.uid() = user_id);

create index if not exists construction_projects_user_id_idx
on public.construction_projects(user_id);

create index if not exists construction_projects_created_at_idx
on public.construction_projects(created_at desc);
