begin;

create table if not exists public.admin_account_deletion_audit (
  id uuid primary key default gen_random_uuid(),

  deleted_user_id uuid not null,
  deleted_email text,
  deleted_phone text,
  deleted_name text,

  deletion_reason text not null,
  confirmation_value text not null,

  deleted_by uuid not null
    references auth.users(id),

  profile_snapshot jsonb not null default '{}'::jsonb,
  business_snapshot jsonb not null default '{}'::jsonb,
  auth_snapshot jsonb not null default '{}'::jsonb,

  deletion_status text not null default 'completed'
    check (
      deletion_status in (
        'started',
        'completed',
        'failed'
      )
    ),

  failure_reason text,
  deleted_at timestamptz not null default now()
);

comment on table public.admin_account_deletion_audit is
  'Immutable founder audit history for permanently deleted member accounts. The deleted user ID is intentionally not a foreign key because the authentication account no longer exists.';

alter table public.admin_account_deletion_audit
  enable row level security;

revoke all
on public.admin_account_deletion_audit
from anon, authenticated;

create index if not exists
  admin_account_deletion_audit_deleted_user_idx
on public.admin_account_deletion_audit(deleted_user_id);

create index if not exists
  admin_account_deletion_audit_deleted_by_idx
on public.admin_account_deletion_audit(deleted_by, deleted_at desc);

commit;
