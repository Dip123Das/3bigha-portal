begin;

create table if not exists public.registration_review_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.registration_verification_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid null references auth.users(id) on delete set null,
  assigned_by uuid null references auth.users(id) on delete set null,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'released', 'completed')),
  claimed_at timestamptz null,
  released_at timestamptz null,
  completed_at timestamptz null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registration_review_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.registration_verification_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(trim(note)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.registration_review_activity (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.registration_verification_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  previous_value jsonb not null default '{}'::jsonb,
  next_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registration_review_assignments_assignee_status_idx
on public.registration_review_assignments(assigned_to, status, priority, last_activity_at desc);

create index if not exists registration_review_assignments_status_priority_idx
on public.registration_review_assignments(status, priority, created_at);

create index if not exists registration_review_notes_case_created_idx
on public.registration_review_notes(case_id, created_at desc);

create index if not exists registration_review_activity_case_created_idx
on public.registration_review_activity(case_id, created_at desc);

alter table public.registration_review_assignments enable row level security;
alter table public.registration_review_notes enable row level security;
alter table public.registration_review_activity enable row level security;

drop policy if exists "Master admins can read review assignments" on public.registration_review_assignments;
create policy "Master admins can read review assignments"
on public.registration_review_assignments for select to authenticated
using (exists (select 1 from public.profiles reviewer where reviewer.id = auth.uid() and reviewer.role = 'master_admin'));

drop policy if exists "Master admins can read review notes" on public.registration_review_notes;
create policy "Master admins can read review notes"
on public.registration_review_notes for select to authenticated
using (exists (select 1 from public.profiles reviewer where reviewer.id = auth.uid() and reviewer.role = 'master_admin'));

drop policy if exists "Master admins can read review activity" on public.registration_review_activity;
create policy "Master admins can read review activity"
on public.registration_review_activity for select to authenticated
using (exists (select 1 from public.profiles reviewer where reviewer.id = auth.uid() and reviewer.role = 'master_admin'));

revoke all on public.registration_review_assignments from anon;
revoke all on public.registration_review_notes from anon;
revoke all on public.registration_review_activity from anon;

grant select on public.registration_review_assignments to authenticated;
grant select on public.registration_review_notes to authenticated;
grant select on public.registration_review_activity to authenticated;

grant all on public.registration_review_assignments to service_role;
grant all on public.registration_review_notes to service_role;
grant all on public.registration_review_activity to service_role;

commit;
