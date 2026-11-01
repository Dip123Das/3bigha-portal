begin;

/* MOB-45 — Deduplicated, retryable property-advance webhook event claims. */
create table if not exists
  public.property_unit_booking_advance_webhook_events (
    id uuid primary key default gen_random_uuid(),
    gateway_event_id text not null unique,
    event_type text not null,
    status text not null default 'processing'
      check (status in ('processing', 'processed', 'retryable')),
    attempt_count integer not null default 1 check (attempt_count > 0),
    lease_at timestamptz not null default now(),
    processed_at timestamptz,
    last_error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint property_advance_webhook_event_id_length check (
      char_length(btrim(gateway_event_id)) between 1 and 128
    ),
    constraint property_advance_webhook_event_type_length check (
      char_length(btrim(event_type)) between 1 and 120
    ),
    constraint property_advance_webhook_processed_timestamp check (
      (status = 'processed') = (processed_at is not null)
    )
  );

create index if not exists
  property_advance_webhook_event_status_lease_idx
on public.property_unit_booking_advance_webhook_events(status, lease_at);

alter table public.property_unit_booking_advance_webhook_events
  enable row level security;

revoke all on table
  public.property_unit_booking_advance_webhook_events
from public, anon, authenticated;

grant select, insert, update on table
  public.property_unit_booking_advance_webhook_events
to service_role;

create or replace function
  public.claim_property_advance_webhook_event(
    target_gateway_event_id text,
    target_event_type text
  )
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
  event_record
    public.property_unit_booking_advance_webhook_events%rowtype;
begin
  if target_gateway_event_id is null
     or char_length(btrim(target_gateway_event_id)) not between 1 and 128
     or target_event_type is null
     or char_length(btrim(target_event_type)) not between 1 and 120 then
    raise exception 'PROPERTY_ADVANCE_WEBHOOK_INPUT_INVALID'
      using errcode = '22023';
  end if;

  insert into public.property_unit_booking_advance_webhook_events (
    gateway_event_id,
    event_type
  ) values (
    btrim(target_gateway_event_id),
    btrim(target_event_type)
  )
  on conflict (gateway_event_id) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return 'process';
  end if;

  select event.*
  into event_record
  from public.property_unit_booking_advance_webhook_events event
  where event.gateway_event_id = btrim(target_gateway_event_id)
  for update;

  if not found then
    raise exception 'PROPERTY_ADVANCE_WEBHOOK_CLAIM_FAILED'
      using errcode = '55000';
  end if;

  if event_record.status = 'processed' then
    return 'duplicate';
  end if;

  if event_record.status = 'processing'
     and event_record.lease_at > now() - interval '5 minutes' then
    return 'in_progress';
  end if;

  update public.property_unit_booking_advance_webhook_events
  set
    event_type = btrim(target_event_type),
    status = 'processing',
    attempt_count = attempt_count + 1,
    lease_at = now(),
    processed_at = null,
    last_error_code = null,
    updated_at = now()
  where id = event_record.id;

  return 'process';
end;
$$;

create or replace function
  public.finish_property_advance_webhook_event(
    target_gateway_event_id text,
    target_processed boolean,
    target_error_code text default null
  )
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_id uuid;
begin
  if target_gateway_event_id is null
     or target_processed is null
     or (target_error_code is not null
       and char_length(target_error_code) > 120) then
    raise exception 'PROPERTY_ADVANCE_WEBHOOK_INPUT_INVALID'
      using errcode = '22023';
  end if;

  update public.property_unit_booking_advance_webhook_events
  set
    status = case when target_processed then 'processed' else 'retryable' end,
    processed_at = case when target_processed then now() else null end,
    lease_at = now(),
    last_error_code = case
      when target_processed then null
      else nullif(btrim(target_error_code), '')
    end,
    updated_at = now()
  where gateway_event_id = btrim(target_gateway_event_id)
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

revoke all on function
  public.claim_property_advance_webhook_event(text, text)
from public, anon, authenticated;
grant execute on function
  public.claim_property_advance_webhook_event(text, text)
to service_role;

revoke all on function
  public.finish_property_advance_webhook_event(text, boolean, text)
from public, anon, authenticated;
grant execute on function
  public.finish_property_advance_webhook_event(text, boolean, text)
to service_role;

commit;
