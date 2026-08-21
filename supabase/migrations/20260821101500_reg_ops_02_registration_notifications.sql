begin;

create table if not exists public.registration_operations_notifications (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  href text not null default '/admin/verification-reviews',
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  acknowledged_at timestamptz null,
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_operations_notifications_status_idx
on public.registration_operations_notifications(status, severity, last_detected_at desc);

alter table public.registration_operations_notifications enable row level security;

create policy "Master admins can read registration operations notifications"
on public.registration_operations_notifications
for select to authenticated
using (
  exists (
    select 1 from public.profiles reviewer
    where reviewer.id = auth.uid()
      and reviewer.role = 'master_admin'
  )
);

revoke all on public.registration_operations_notifications from anon;
grant select on public.registration_operations_notifications to authenticated;
grant all on public.registration_operations_notifications to service_role;

commit;
