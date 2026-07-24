begin;

create table if not exists public.registration_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  business_id uuid not null,
  version text not null,
  source text not null default 'registration_completion',
  trust_score integer not null check (trust_score between 0 and 100),
  trust_confidence integer not null check (trust_confidence between 0 and 100),
  requires_human_review boolean not null default true,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.registration_intelligence_snapshots is
  'Immutable server-generated registration intelligence snapshots.';

comment on column public.registration_intelligence_snapshots.snapshot is
  'Complete explainable BIE/BTCE registration intelligence result.';

create index if not exists
  registration_intelligence_snapshots_user_created_idx
on public.registration_intelligence_snapshots (user_id, created_at desc);

create index if not exists
  registration_intelligence_snapshots_business_created_idx
on public.registration_intelligence_snapshots (business_id, created_at desc);

alter table public.registration_intelligence_snapshots
  enable row level security;

alter table public.registration_intelligence_snapshots
  force row level security;

drop policy if exists
  registration_intelligence_snapshots_select_own
on public.registration_intelligence_snapshots;

create policy
  registration_intelligence_snapshots_select_own
on public.registration_intelligence_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists
  registration_intelligence_snapshots_insert_own
on public.registration_intelligence_snapshots;

create policy
  registration_intelligence_snapshots_insert_own
on public.registration_intelligence_snapshots
for insert
to authenticated
with check (
  auth.uid() = user_id
  and auth.uid() = business_id
);

revoke all
on table public.registration_intelligence_snapshots
from public, anon;

grant select, insert
on table public.registration_intelligence_snapshots
to authenticated;

commit;
