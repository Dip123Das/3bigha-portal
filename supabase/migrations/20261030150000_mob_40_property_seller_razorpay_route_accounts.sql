begin;

/*
 * MOB-40 — Private seller-side Razorpay Route account readiness.
 * Stores only the provider linked-account reference and capability state;
 * seller KYC documents and personal details stay with Razorpay.
 */

create table if not exists
  public.property_seller_razorpay_route_accounts (
    owner_user_id uuid primary key
      references auth.users(id) on delete restrict,

    razorpay_linked_account_id text not null unique,

    status text not null default 'onboarding_pending'
      check (status in (
        'onboarding_pending',
        'review_pending',
        'active',
        'disabled'
      )),

    details_submitted boolean not null default false,
    transfers_enabled boolean not null default false,
    settlements_enabled boolean not null default false,
    provider_status text,
    provider_live boolean,
    provider_activated_at timestamptz,
    last_verified_at timestamptz,
    disabled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint property_seller_route_account_reference_length check (
      char_length(btrim(razorpay_linked_account_id)) between 1 and 128
    ),

    constraint property_seller_route_account_active_capabilities check (
      status <> 'active'
      or (
        details_submitted
        and transfers_enabled
        and settlements_enabled
        and last_verified_at is not null
        and disabled_at is null
      )
    ),

    constraint property_seller_route_account_disabled_timestamp check (
      (status = 'disabled') = (disabled_at is not null)
    )
  );

create index if not exists
  property_seller_route_account_status_idx
on public.property_seller_razorpay_route_accounts(status, updated_at desc);

create table if not exists
  public.property_seller_razorpay_route_account_events (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null
      references auth.users(id) on delete restrict,
    actor_user_id uuid
      references auth.users(id) on delete restrict,
    event_kind text not null check (event_kind in (
      'linked_account_registered',
      'linked_account_replaced',
      'linked_account_disabled',
      'provider_status_refreshed'
    )),
    created_at timestamptz not null default now()
  );

create index if not exists
  property_seller_route_account_events_owner_created_idx
on public.property_seller_razorpay_route_account_events(
  owner_user_id,
  created_at desc
);

alter table public.property_seller_razorpay_route_accounts
  enable row level security;

alter table public.property_seller_razorpay_route_account_events
  enable row level security;

revoke all on table
  public.property_seller_razorpay_route_accounts
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.property_seller_razorpay_route_accounts
to service_role;

revoke all on table
  public.property_seller_razorpay_route_account_events
from public, anon, authenticated;

grant select, insert on table
  public.property_seller_razorpay_route_account_events
to service_role;

create or replace function
  public.register_property_seller_razorpay_route_account(
    target_owner_user_id uuid,
    target_actor_user_id uuid,
    target_linked_account_id text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_account_id text;
begin
  if target_owner_user_id is null
     or target_actor_user_id is null
     or target_linked_account_id !~ '^acc_[A-Za-z0-9]{4,120}$' then
    raise exception 'PROPERTY_ROUTE_ACCOUNT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.id = target_owner_user_id
  ) then
    raise exception 'PROPERTY_ROUTE_SELLER_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select account.razorpay_linked_account_id
  into old_account_id
  from public.property_seller_razorpay_route_accounts account
  where account.owner_user_id = target_owner_user_id
  for update;

  insert into public.property_seller_razorpay_route_accounts (
    owner_user_id,
    razorpay_linked_account_id,
    status,
    details_submitted,
    transfers_enabled,
    settlements_enabled,
    last_verified_at,
    disabled_at,
    updated_at
  ) values (
    target_owner_user_id,
    target_linked_account_id,
    'review_pending',
    false,
    false,
    false,
    null,
    null,
    now()
  )
  on conflict (owner_user_id) do update
  set
    razorpay_linked_account_id = excluded.razorpay_linked_account_id,
    status = 'review_pending',
    details_submitted = false,
    transfers_enabled = false,
    settlements_enabled = false,
    provider_status = null,
    provider_live = null,
    provider_activated_at = null,
    last_verified_at = null,
    disabled_at = null,
    updated_at = now();

  insert into public.property_seller_razorpay_route_account_events (
    owner_user_id,
    actor_user_id,
    event_kind
  ) values (
    target_owner_user_id,
    target_actor_user_id,
    case
      when old_account_id is not null
       and old_account_id <> target_linked_account_id
        then 'linked_account_replaced'
      else 'linked_account_registered'
    end
  );

  return jsonb_build_object('status', 'review_pending');
end;
$$;

create or replace function
  public.refresh_property_seller_razorpay_route_account(
    target_owner_user_id uuid,
    target_actor_user_id uuid,
    target_provider_status text,
    target_provider_live boolean,
    target_provider_activated_at timestamptz
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_status text;
  saved_status text;
begin
  if target_owner_user_id is null
     or target_actor_user_id is null
     or target_provider_status is null
     or char_length(btrim(target_provider_status)) not between 1 and 80
     or target_provider_live is null then
    raise exception 'PROPERTY_ROUTE_ACCOUNT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  next_status := case
    when lower(btrim(target_provider_status)) in (
      'suspended', 'rejected', 'disabled'
    ) then 'disabled'
    else 'review_pending'
  end;

  update public.property_seller_razorpay_route_accounts
  set
    status = case
      when status = 'disabled' then 'disabled'
      else next_status
    end,
    details_submitted = false,
    transfers_enabled = false,
    settlements_enabled = false,
    provider_status = lower(btrim(target_provider_status)),
    provider_live = target_provider_live,
    provider_activated_at = target_provider_activated_at,
    last_verified_at = now(),
    disabled_at = case
      when status = 'disabled' or next_status = 'disabled'
        then coalesce(disabled_at, now())
      else null
    end,
    updated_at = now()
  where owner_user_id = target_owner_user_id
  returning status into saved_status;

  if not found then
    raise exception 'PROPERTY_ROUTE_ACCOUNT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  insert into public.property_seller_razorpay_route_account_events (
    owner_user_id,
    actor_user_id,
    event_kind
  ) values (
    target_owner_user_id,
    target_actor_user_id,
    'provider_status_refreshed'
  );

  return jsonb_build_object(
    'status', saved_status,
    'providerStatus', lower(btrim(target_provider_status)),
    'providerLive', target_provider_live
  );
end;
$$;

create or replace function
  public.disable_property_seller_razorpay_route_account(
    target_owner_user_id uuid,
    target_actor_user_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_owner_user_id is null or target_actor_user_id is null then
    raise exception 'PROPERTY_ROUTE_ACCOUNT_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_seller_razorpay_route_accounts
  set
    status = 'disabled',
    transfers_enabled = false,
    settlements_enabled = false,
    disabled_at = now(),
    updated_at = now()
  where owner_user_id = target_owner_user_id;

  if not found then
    raise exception 'PROPERTY_ROUTE_ACCOUNT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  insert into public.property_seller_razorpay_route_account_events (
    owner_user_id,
    actor_user_id,
    event_kind
  ) values (
    target_owner_user_id,
    target_actor_user_id,
    'linked_account_disabled'
  );

  return jsonb_build_object('status', 'disabled');
end;
$$;

revoke all on function
  public.register_property_seller_razorpay_route_account(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.register_property_seller_razorpay_route_account(uuid, uuid, text)
to service_role;

revoke all on function
  public.disable_property_seller_razorpay_route_account(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.disable_property_seller_razorpay_route_account(uuid, uuid)
to service_role;

revoke all on function
  public.refresh_property_seller_razorpay_route_account(
    uuid, uuid, text, boolean, timestamptz
  )
from public, anon, authenticated;

grant execute on function
  public.refresh_property_seller_razorpay_route_account(
    uuid, uuid, text, boolean, timestamptz
  )
to service_role;

comment on table public.property_seller_razorpay_route_accounts is
  'Private server-managed Razorpay Route account mapping for property sellers. Contains no KYC documents; never exposed to buyer or seller clients.';

commit;
