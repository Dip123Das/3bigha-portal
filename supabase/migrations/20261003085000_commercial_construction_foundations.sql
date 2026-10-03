-- Required construction foundations, confirmed missing from the exported schema.
begin;
do $construction_foundations$
begin
if to_regclass('public.construction_projects') is null then
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

end if;
if to_regclass('public.construction_project_milestones') is null then
create table if not exists public.construction_project_milestones (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  milestone_key text not null,
  title text not null,
  description text,
  sequence integer not null default 1,

  status text not null default 'pending',
  priority text not null default 'medium',

  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,

  estimated_days integer not null default 1,
  progress_percent integer not null default 0,

  vendor_category text,
  dependency text,
  ai_risk_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint construction_project_milestones_unique_phase
    unique (project_id, milestone_key),

  constraint construction_project_milestones_progress_check
    check (progress_percent >= 0 and progress_percent <= 100)
);

alter table public.construction_project_milestones enable row level security;

create policy "Users can view own construction project milestones"
on public.construction_project_milestones
for select
using (auth.uid() = user_id);

create policy "Users can insert own construction project milestones"
on public.construction_project_milestones
for insert
with check (auth.uid() = user_id);

create policy "Users can update own construction project milestones"
on public.construction_project_milestones
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own construction project milestones"
on public.construction_project_milestones
for delete
using (auth.uid() = user_id);

create index if not exists construction_project_milestones_project_id_idx
on public.construction_project_milestones(project_id);

create index if not exists construction_project_milestones_user_id_idx
on public.construction_project_milestones(user_id);

create index if not exists construction_project_milestones_status_idx
on public.construction_project_milestones(status);

create index if not exists construction_project_milestones_sequence_idx
on public.construction_project_milestones(project_id, sequence);

end if;
end
$construction_foundations$;
commit;
