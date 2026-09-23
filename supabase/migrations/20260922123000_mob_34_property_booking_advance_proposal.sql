begin;

/*
 * MOB-34 — Owner proposal for a private property-booking advance.
 *
 * The authority:
 * - locks the exact unit before the application;
 * - requires an unexpired owner-accepted application;
 * - snapshots builder_inventory_pricing.price_total on the server;
 * - permits only the canonical owner to propose the advance amount;
 * - creates no gateway order and collects no money;
 * - does not create an agreement or alter inventory status.
 */

create or replace function
  public.propose_property_unit_booking_advance (
    target_owner_user_id uuid,
    target_application_id uuid,
    target_advance_amount_paise bigint,
    target_terms_note text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time timestamptz := clock_timestamp();
  target_unit_id uuid;
  normalized_terms_note text;

  unit_record record;
  application_record
    public.property_unit_booking_applications%rowtype;
  pricing_record record;
  existing_request
    public.property_unit_booking_advance_requests%rowtype;
  created_request
    public.property_unit_booking_advance_requests%rowtype;

  quoted_price_paise bigint;
begin
  if target_owner_user_id is null then
    raise exception 'OWNER_REQUIRED'
      using errcode = '22023';
  end if;

  if target_application_id is null then
    raise exception 'APPLICATION_ID_INVALID'
      using errcode = '22023';
  end if;

  if target_advance_amount_paise is null
     or target_advance_amount_paise < 1 then
    raise exception 'ADVANCE_AMOUNT_INVALID'
      using errcode = '22023';
  end if;

  normalized_terms_note :=
    nullif(btrim(target_terms_note), '');

  if normalized_terms_note is not null
     and char_length(normalized_terms_note) > 1000 then
    raise exception 'ADVANCE_TERMS_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve the target without locking it, then take the canonical
   * unit-first lock used throughout the property-booking lifecycle.
   */
  select application.unit_id
  into target_unit_id
  from public.property_unit_booking_applications application
  where application.id = target_application_id;

  if target_unit_id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status,
    unit.updated_at
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = target_unit_id
  for update;

  if unit_record.id is null then
    raise exception 'UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if application_record.owner_user_id <> target_owner_user_id then
    raise exception 'APPLICATION_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if application_record.buyer_user_id = target_owner_user_id then
    raise exception 'SELF_PAYMENT_FORBIDDEN'
      using errcode = '42501';
  end if;

  if application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id then
    raise exception 'APPLICATION_TARGET_MISMATCH'
      using errcode = '42501';
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '55000';
  end if;

  if application_record.accepted_until is null
     or application_record.accepted_until <= current_time then
    raise exception 'APPLICATION_ACCEPTANCE_EXPIRED'
      using errcode = '55000';
  end if;

  if unit_record.status <> 'reserved'::public.inventory_status then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '55000';
  end if;

  select
    pricing.price_total,
    pricing.updated_at
  into pricing_record
  from public.builder_inventory_pricing pricing
  where pricing.unit_id = unit_record.id
  for update;

  if pricing_record.price_total is null
     or pricing_record.price_total <= 0 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '55000';
  end if;

  quoted_price_paise :=
    round(pricing_record.price_total * 100)::bigint;

  if quoted_price_paise < 1 then
    raise exception 'PROPERTY_PRICE_INVALID'
      using errcode = '55000';
  end if;

  if target_advance_amount_paise > quoted_price_paise then
    raise exception 'ADVANCE_EXCEEDS_PROPERTY_PRICE'
      using errcode = '22023';
  end if;

  select request.*
  into existing_request
  from public.property_unit_booking_advance_requests request
  where request.application_id = application_record.id
  for update;

  if existing_request.id is not null then
    if existing_request.owner_user_id <> target_owner_user_id
       or existing_request.buyer_user_id
          <> application_record.buyer_user_id
       or existing_request.unit_id <> unit_record.id
       or existing_request.project_id <> unit_record.project_id then
      raise exception 'ADVANCE_REQUEST_TARGET_MISMATCH'
        using errcode = '42501';
    end if;

    /*
     * Exact replay is idempotent only while the buyer has not consented.
     * A price change also prevents replay of a stale quote.
     */
    if existing_request.status = 'owner_proposed'
       and existing_request.buyer_consented_at is null
       and existing_request.quoted_property_price_paise
          = quoted_price_paise
       and existing_request.advance_amount_paise
          = target_advance_amount_paise
       and coalesce(existing_request.owner_terms_note, '')
          = coalesce(normalized_terms_note, '') then
      return jsonb_build_object(
        'id', existing_request.id,
        'applicationId', existing_request.application_id,
        'holdId', existing_request.hold_id,
        'unitId', existing_request.unit_id,
        'projectId', existing_request.project_id,
        'quotedPropertyPricePaise',
          existing_request.quoted_property_price_paise,
        'advanceAmountPaise',
          existing_request.advance_amount_paise,
        'currency', existing_request.currency,
        'status', existing_request.status,
        'ownerTermsNote', existing_request.owner_terms_note,
        'ownerProposedAt', existing_request.owner_proposed_at,
        'buyerConsentedAt', existing_request.buyer_consented_at,
        'expiresAt', existing_request.expires_at
      );
    end if;

    raise exception 'ADVANCE_REQUEST_ALREADY_EXISTS'
      using errcode = '23505';
  end if;

  insert into public.property_unit_booking_advance_requests (
    application_id,
    hold_id,
    unit_id,
    project_id,
    buyer_user_id,
    owner_user_id,
    provider,
    currency,
    quoted_property_price_paise,
    advance_amount_paise,
    pricing_source,
    pricing_snapshot_at,
    owner_terms_note,
    owner_proposed_at,
    status,
    expires_at,
    metadata
  ) values (
    application_record.id,
    application_record.hold_id,
    application_record.unit_id,
    application_record.project_id,
    application_record.buyer_user_id,
    application_record.owner_user_id,
    'sbi_payment_gateway',
    'INR',
    quoted_price_paise,
    target_advance_amount_paise,
    'builder_inventory_pricing',
    coalesce(pricing_record.updated_at, current_time),
    normalized_terms_note,
    current_time,
    'owner_proposed',
    application_record.accepted_until,
    jsonb_build_object(
      'pricingSource', 'builder_inventory_pricing',
      'gatewayOrderCreated', false,
      'paymentCollected', false
    )
  )
  returning * into created_request;

  insert into public.property_unit_booking_advance_events (
    advance_request_id,
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    created_request.id,
    created_request.application_id,
    created_request.unit_id,
    created_request.project_id,
    target_owner_user_id,
    'owner_proposed',
    jsonb_build_object(
      'quotedPropertyPricePaise',
        created_request.quoted_property_price_paise,
      'advanceAmountPaise',
        created_request.advance_amount_paise,
      'currency',
        created_request.currency
    )
  );

  return jsonb_build_object(
    'id', created_request.id,
    'applicationId', created_request.application_id,
    'holdId', created_request.hold_id,
    'unitId', created_request.unit_id,
    'projectId', created_request.project_id,
    'quotedPropertyPricePaise',
      created_request.quoted_property_price_paise,
    'advanceAmountPaise',
      created_request.advance_amount_paise,
    'currency', created_request.currency,
    'status', created_request.status,
    'ownerTermsNote', created_request.owner_terms_note,
    'ownerProposedAt', created_request.owner_proposed_at,
    'buyerConsentedAt', created_request.buyer_consented_at,
    'expiresAt', created_request.expires_at
  );
end;
$$;

revoke all on function
  public.propose_property_unit_booking_advance(
    uuid, uuid, bigint, text
  )
from public, anon, authenticated;

grant execute on function
  public.propose_property_unit_booking_advance(
    uuid, uuid, bigint, text
  )
to service_role;

comment on function
  public.propose_property_unit_booking_advance(
    uuid, uuid, bigint, text
  ) is
  'Allows only the canonical property owner to propose a server-priced advance for an unexpired accepted booking application. Creates no gateway order, payment proof, agreement, sale, title or ownership transfer.';

commit;
