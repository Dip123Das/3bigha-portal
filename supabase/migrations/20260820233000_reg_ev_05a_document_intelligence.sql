begin;

create table if not exists public.registration_document_intelligence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid null references public.registration_verification_cases(id) on delete set null,
  evidence_bucket text not null,
  evidence_path text not null,
  evidence_sha256 text not null,
  evidence_binding_sha256 text null,
  document_type text not null default 'unknown',
  classification_confidence integer not null default 0
    check (classification_confidence between 0 and 100),
  extraction_confidence integer not null default 0
    check (extraction_confidence between 0 and 100),
  extracted_fields jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  anomalies jsonb not null default '[]'::jsonb,
  raw_model_result jsonb not null default '{}'::jsonb,
  source text not null default 'openai_document_intelligence_v1',
  model text null,
  status text not null default 'completed'
    check (status in ('completed', 'needs_manual_review', 'failed')),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, evidence_sha256)
);

create index if not exists
  registration_document_intelligence_user_created_idx
on public.registration_document_intelligence(user_id, created_at desc);

create index if not exists
  registration_document_intelligence_case_idx
on public.registration_document_intelligence(case_id);

alter table public.registration_document_intelligence
  enable row level security;

drop policy if exists
  "Master admins can read document intelligence"
on public.registration_document_intelligence;

create policy
  "Master admins can read document intelligence"
on public.registration_document_intelligence
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles reviewer
    where reviewer.id = auth.uid()
      and reviewer.role = 'master_admin'
  )
);

revoke all on public.registration_document_intelligence
from anon;

grant select on public.registration_document_intelligence
to authenticated;

grant all on public.registration_document_intelligence
to service_role;

commit;
