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
