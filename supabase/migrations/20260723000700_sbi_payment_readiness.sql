-- Provider-independent subscription payment records prepared exclusively for
-- SBI Payment Gateway. No row in these tables can activate access by itself.

create table if not exists public.registration_verification_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in (
    'verified_by_ai',
    'needs_manual_review',
    'needs_document',
    'format_valid_needs_manual_review',
    'format_valid_document_mismatch',
    'format_invalid'
  )),
  confidence numeric not null default 0 check (confidence between 0 and 100),
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registration_verification_cases_user_created_idx
  on public.registration_verification_cases(user_id, created_at desc);

create table if not exists public.subscription_payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'sbi_payment_gateway'
    check (provider = 'sbi_payment_gateway'),
  subscription_plan text not null check (subscription_plan in (
    'basic_vendor','silver_vendor','gold_vendor','platinum_vendor'
  )),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in (
    'created',
    'gateway_configuration_pending',
    'gateway_order_created',
    'payment_pending',
    'paid',
    'failed',
    'expired',
    'cancelled',
    'review_required'
  )),
  share_token text not null unique,
  gateway_transaction_id text unique,
  gateway_response_json jsonb,
  verification_status text not null default 'not_checked',
  paid_at timestamptz,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_requires_gateway_reference check (
    status <> 'paid' or (gateway_transaction_id is not null and paid_at is not null)
  )
);

create index if not exists subscription_payment_requests_user_created_idx
  on public.subscription_payment_requests(user_id, created_at desc);

alter table public.registration_verification_cases enable row level security;
alter table public.subscription_payment_requests enable row level security;

revoke all on public.registration_verification_cases,
  public.subscription_payment_requests from anon, authenticated;

comment on table public.subscription_payment_requests is
  'SBI-only subscription payment lifecycle. Paid state must be written only after authenticated SBI server confirmation.';

create or replace function public.finalize_verified_sbi_subscription(
  p_payment_request_id uuid,
  p_gateway_transaction_id text,
  p_gateway_response jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  payment_request public.subscription_payment_requests%rowtype;
  latest_verification_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only the trusted SBI callback service may finalize payment.'
      using errcode = '42501';
  end if;

  select * into payment_request
  from public.subscription_payment_requests
  where id = p_payment_request_id
  for update;

  if not found then
    raise exception 'Payment request not found.';
  end if;

  if payment_request.provider <> 'sbi_payment_gateway' then
    raise exception 'Unsupported payment provider.';
  end if;

  if payment_request.status = 'paid' then
    if payment_request.gateway_transaction_id = p_gateway_transaction_id then
      return;
    end if;
    raise exception 'Payment request was already finalized with another transaction.';
  end if;

  select status into latest_verification_status
  from public.registration_verification_cases
  where user_id = payment_request.user_id
  order by created_at desc
  limit 1;

  update public.subscription_payment_requests
  set gateway_transaction_id = p_gateway_transaction_id,
      gateway_response_json = p_gateway_response,
      paid_at = now(),
      updated_at = now(),
      status = case
        when latest_verification_status = 'verified_by_ai' then 'paid'
        else 'review_required'
      end,
      verification_status = coalesce(latest_verification_status, 'not_checked')
  where id = payment_request.id;

  if latest_verification_status = 'verified_by_ai' then
    update public.business_profiles
    set subscription_plan = payment_request.subscription_plan,
        subscription_status = 'active',
        subscription_expires_at = now() + interval '1 month',
        updated_at = now()
    where user_id = payment_request.user_id;

    update public.profiles
    set approval_status = 'approved',
        approved_at = now(),
        rejection_reason = null,
        updated_at = now()
    where id = payment_request.user_id
      and coalesce(account_status, 'active') = 'active'
      and role <> 'master_admin';
  end if;
end;
$$;

revoke all on function public.finalize_verified_sbi_subscription(
  uuid, text, jsonb
) from public, anon, authenticated;
