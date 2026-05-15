create table if not exists public.construction_project_snapshots (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.construction_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  snapshot_type text not null default 'ai_construction_plan',

  cost_estimate jsonb,
  material_estimate jsonb,
  boq_estimate jsonb,
  timeline_estimate jsonb,
  procurement_schedule jsonb,
  rfq_drafts jsonb,

  created_at timestamptz not null default now()
);

alter table public.construction_project_snapshots enable row level security;

create policy "Users can view own construction project snapshots"
on public.construction_project_snapshots
for select
using (auth.uid() = user_id);

create policy "Users can insert own construction project snapshots"
on public.construction_project_snapshots
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own construction project snapshots"
on public.construction_project_snapshots
for delete
using (auth.uid() = user_id);

create index if not exists construction_project_snapshots_project_id_idx
on public.construction_project_snapshots(project_id);

create index if not exists construction_project_snapshots_user_id_idx
on public.construction_project_snapshots(user_id);

create index if not exists construction_project_snapshots_created_at_idx
on public.construction_project_snapshots(created_at desc);
