/*
 * MOB-34: buyer confirmation of a private property-booking advance.
 *
 * This authority:
 * - records authenticated buyer consent against the owner proposal;
 * - revalidates the accepted application and reserved unit;
 * - revalidates the server-owned property-price snapshot;
 * - does not contact a payment gateway;
 * - does not create a payment order or collect money;
 * - does not alter inventory, agreements, sale, title or ownership.
 */

create or replace function
  public.confirm_property_unit_booking_advance (
    target_buyer_user_id uuid,
    target_advance_request_id uuid,
    target_buyer_consent_version text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  required_consent_version constant text :=
    'property-booking-advance-v1';

  normalized_consent_version text :=
    nullif(btrim(target_buyer_consent_version), '');

  action_time timestamptz := now();

  request_unit_id uuid;
  unit_record record;
  application_record record;
  request_record record;
  pricing_record record;

  current_price_paise bigint;
  confirmed_request record;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_ID_INVALID'
      using errcode = '22023';
  end if;

  if target_advance_request_id is null then
    raise exception 'ADVANCE_REQUEST_ID_INVALID'
      using errcode = '22023';
  end if;

  if normalized_consent_version is null
     or normalized_consent_version <> required_consent_version then
    raise exception 'BUYER_CONSENT_VERSION_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve the unit without retaining a row lock, then preserve the
   * canonical unit-first lock order used by the booking authorities.
   */
  select advance_request.unit_id
  into request_unit_id
  from public.property_unit_booking_advance_requests advance_request
  where advance_request.id = target_advance_request_id;

  if request_unit_id is null then
    raise exception 'ADVANCE_REQUEST_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = request_unit_id
  for update;

  if not found then
    raise exception 'UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  /*
   * Lock the application before the advance request. The request is then
   * checked again under lock so the preliminary unit resolution cannot
   * authorize stale or replaced state.
   */
  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = (
    select advance_request.application_id
    from public.property_unit_booking_advance_requests advance_request
    where advance_request.id = target_advance_request_id
  )
  for update;

  if not found then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select advance_request.*
  into request_record
  from public.property_unit_booking_advance_requests advance_request
  where advance_request.id = target_advance_request_id
  for update;

  if not found then
    raise exception 'ADVANCE_REQUEST_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if request_record.unit_id <> unit_record.id
     or request_record.application_id <> application_record.id
     or request_record.hold_id <> application_record.hold_id
     or request_record.unit_id <> application_record.unit_id
     or request_record.project_id <> application_record.project_id then
    raise exception 'ADVANCE_REQUEST_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if application_record.buyer_user_id <> target_buyer_user_id
     or request_record.buyer_user_id <> target_buyer_user_id then
    raise exception 'ADVANCE_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if request_record.owner_user_id <> application_record.owner_user_id then
    raise exception 'ADVANCE_REQUEST_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if request_record.buyer_user_id = request_record.owner_user_id then
    raise exception 'SELF_PAYMENT_FORBIDDEN'
      using errcode = '42501';
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '23514';
  end if;

  if application_record.accepted_until is null
     or application_record.accepted_until <= action_time then
    raise exception 'APPLICATION_ACCEPTANCE_EXPIRED'
      using errcode = '23514';
  end if;

  if request_record.expires_at <= action_time then
    raise exception 'ADVANCE_REQUEST_EXPIRED'
      using errcode = '23514';
  end if;

  if request_record.expires_at <> application_record.accepted_until then
    raise exception 'ADVANCE_REQUEST_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if unit_record.project_id <> request_record.project_id then
    raise exception 'ADVANCE_REQUEST_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if unit_record.status <> 'reserved'::public.inventory_status then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '23514';
  end if;

  /*
   * Re-lock and re-read canonical server pricing. Buyer input can never
   * provide or replace the property-price snapshot.
   */
  select
    pricing.price_total,
    pricing.updated_at
  into pricing_record
  from public.builder_inventory_pricing pricing
  where pricing.unit_id = unit_record.id
  for update;

  if not found
     or pricing_record.price_total is null
     or pricing_record.price_total <= 0 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '23514';
  end if;

  current_price_paise :=
    round(pricing_record.price_total * 100)::bigint;

  if current_price_paise < 1 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '23514';
  end if;

  if request_record.pricing_source <> 'builder_inventory_pricing'
     or request_record.quoted_property_price_paise
       <> current_price_paise then
    raise exception 'PROPERTY_PRICE_CHANGED'
      using errcode = '40001';
  end if;

  if request_record.advance_amount_paise < 1
     or request_record.advance_amount_paise
       > request_record.quoted_property_price_paise then
    raise exception 'ADVANCE_AMOUNT_INVALID'
      using errcode = '23514';
  end if;

  /*
   * Exact replay is idempotent. Later lifecycle states are deliberately
   * outside this confirmation authority.
   */
  if request_record.status = 'buyer_confirmed'
     and request_record.buyer_consent_version
       = required_consent_version
     and request_record.buyer_consented_at is not null then
    return jsonb_build_object(
      'id', request_record.id,
      'applicationId', request_record.application_id,
      'holdId', request_record.hold_id,
      'unitId', request_record.unit_id,
      'projectId', request_record.project_id,
      'quotedPropertyPricePaise',
        request_record.quoted_property_price_paise,
      'advanceAmountPaise',
        request_record.advance_amount_paise,
      'currency', request_record.currency,
      'provider', request_record.provider,
      'pricingSource', request_record.pricing_source,
      'pricingSnapshotAt', request_record.pricing_snapshot_at,
      'ownerTermsNote', request_record.owner_terms_note,
      'ownerProposedAt', request_record.owner_proposed_at,
      'buyerConsentVersion',
        request_record.buyer_consent_version,
      'buyerConsentedAt', request_record.buyer_consented_at,
      'status', request_record.status,
      'expiresAt', request_record.expires_at
    );
  end if;

  if request_record.status <> 'owner_proposed' then
    raise exception 'ADVANCE_CONFIRMATION_CONFLICT'
      using errcode = '23505';
  end if;

  if request_record.buyer_consent_version is not null
     or request_record.buyer_consented_at is not null then
    raise exception 'ADVANCE_CONFIRMATION_CONFLICT'
      using errcode = '23505';
  end if;

  update public.property_unit_booking_advance_requests
  set
    buyer_consent_version = required_consent_version,
    buyer_consented_at = action_time,
    status = 'buyer_confirmed',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'buyerConfirmed', true,
        'gatewayOrderCreated', false,
        'paymentCollected', false
      ),
    updated_at = action_time
  where id = request_record.id
    and status = 'owner_proposed'
    and buyer_user_id = target_buyer_user_id
  returning * into confirmed_request;

  if not found then
    raise exception 'ADVANCE_CONFIRMATION_CONFLICT'
      using errcode = '40001';
  end if;

  insert into public.property_unit_booking_advance_events (
    advance_request_id,
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    event_kind,
    metadata
  ) values (
    confirmed_request.id,
    confirmed_request.application_id,
    confirmed_request.unit_id,
    confirmed_request.project_id,
    target_buyer_user_id,
    'buyer_confirmed',
    jsonb_build_object(
      'consentVersion', required_consent_version,
      'quotedPropertyPricePaise',
        confirmed_request.quoted_property_price_paise,
      'advanceAmountPaise',
        confirmed_request.advance_amount_paise,
      'currency', confirmed_request.currency,
      'gatewayOrderCreated', false,
      'paymentCollected', false
    )
  );

  return jsonb_build_object(
    'id', confirmed_request.id,
    'applicationId', confirmed_request.application_id,
    'holdId', confirmed_request.hold_id,
    'unitId', confirmed_request.unit_id,
    'projectId', confirmed_request.project_id,
    'quotedPropertyPricePaise',
      confirmed_request.quoted_property_price_paise,
    'advanceAmountPaise',
      confirmed_request.advance_amount_paise,
    'currency', confirmed_request.currency,
    'provider', confirmed_request.provider,
    'pricingSource', confirmed_request.pricing_source,
    'pricingSnapshotAt', confirmed_request.pricing_snapshot_at,
    'ownerTermsNote', confirmed_request.owner_terms_note,
    'ownerProposedAt', confirmed_request.owner_proposed_at,
    'buyerConsentVersion',
      confirmed_request.buyer_consent_version,
    'buyerConsentedAt', confirmed_request.buyer_consented_at,
    'status', confirmed_request.status,
    'expiresAt', confirmed_request.expires_at
  );
end;
$$;

revoke all on function
  public.confirm_property_unit_booking_advance(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.confirm_property_unit_booking_advance(
    uuid,
    uuid,
    text
  )
to service_role;

comment on function
  public.confirm_property_unit_booking_advance(
    uuid,
    uuid,
    text
  ) is
  'Records authenticated buyer consent for the server-priced property advance proposal. It performs no gateway request, payment collection, inventory transition, agreement creation, sale, title change or ownership transfer.';
