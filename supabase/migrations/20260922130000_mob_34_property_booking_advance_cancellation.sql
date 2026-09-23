/*
 * MOB-34: authenticated buyer cancellation of an unpaid
 * property-booking advance request.
 *
 * Cancellation is permitted only before gateway execution begins.
 * It does not cancel the accepted booking application, release reserved
 * inventory, create a payment or alter an agreement, sale, title or
 * ownership state.
 */

create or replace function
  public.cancel_property_unit_booking_advance (
    target_buyer_user_id uuid,
    target_advance_request_id uuid,
    target_reason text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_reason text :=
    nullif(btrim(target_reason), '');

  action_time timestamptz := now();

  request_unit_id uuid;
  unit_record record;
  application_record record;
  request_record record;
  cancelled_request record;
begin
  if target_buyer_user_id is null then
    raise exception 'BUYER_ID_INVALID'
      using errcode = '22023';
  end if;

  if target_advance_request_id is null then
    raise exception 'ADVANCE_REQUEST_ID_INVALID'
      using errcode = '22023';
  end if;

  if normalized_reason is not null
     and char_length(normalized_reason) > 500 then
    raise exception 'CANCELLATION_REASON_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve the unit first without retaining a lock, then preserve the
   * canonical unit-first locking order.
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
     or request_record.project_id <> application_record.project_id
     or unit_record.project_id <> request_record.project_id then
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

  /*
   * Exact cancellation replay is idempotent. No other terminal or
   * gateway-managed state may be rewritten by this authority.
   */
  if request_record.status = 'cancelled'
     and request_record.cancelled_at is not null then
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
      'expiresAt', request_record.expires_at,
      'cancelledAt', request_record.cancelled_at
    );
  end if;

  if request_record.status not in (
    'owner_proposed',
    'buyer_confirmed',
    'gateway_configuration_pending'
  ) then
    raise exception 'ADVANCE_CANCELLATION_CONFLICT'
      using errcode = '23505';
  end if;

  /*
   * Gateway references must remain absent in all buyer-cancellable
   * states. Any such reference requires manual reconciliation.
   */
  if request_record.gateway_request_reference is not null
     or request_record.gateway_transaction_id is not null
     or request_record.gateway_response_json is not null
     or request_record.paid_at is not null then
    raise exception 'ADVANCE_RECONCILIATION_REQUIRED'
      using errcode = '23514';
  end if;

  update public.property_unit_booking_advance_requests
  set
    status = 'cancelled',
    cancelled_at = action_time,
    failure_code = null,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'cancelledBy', 'buyer',
        'cancellationReason', normalized_reason,
        'gatewayOrderCreated', false,
        'paymentCollected', false
      ),
    updated_at = action_time
  where id = request_record.id
    and buyer_user_id = target_buyer_user_id
    and status in (
      'owner_proposed',
      'buyer_confirmed',
      'gateway_configuration_pending'
    )
    and gateway_request_reference is null
    and gateway_transaction_id is null
    and gateway_response_json is null
    and paid_at is null
  returning * into cancelled_request;

  if not found then
    raise exception 'ADVANCE_CANCELLATION_CONFLICT'
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
    cancelled_request.id,
    cancelled_request.application_id,
    cancelled_request.unit_id,
    cancelled_request.project_id,
    target_buyer_user_id,
    'cancelled',
    jsonb_build_object(
      'cancelledBy', 'buyer',
      'reason', normalized_reason,
      'previousStatus', request_record.status,
      'gatewayOrderCreated', false,
      'paymentCollected', false
    )
  );

  return jsonb_build_object(
    'id', cancelled_request.id,
    'applicationId', cancelled_request.application_id,
    'holdId', cancelled_request.hold_id,
    'unitId', cancelled_request.unit_id,
    'projectId', cancelled_request.project_id,
    'quotedPropertyPricePaise',
      cancelled_request.quoted_property_price_paise,
    'advanceAmountPaise',
      cancelled_request.advance_amount_paise,
    'currency', cancelled_request.currency,
    'provider', cancelled_request.provider,
    'pricingSource', cancelled_request.pricing_source,
    'pricingSnapshotAt', cancelled_request.pricing_snapshot_at,
    'ownerTermsNote', cancelled_request.owner_terms_note,
    'ownerProposedAt', cancelled_request.owner_proposed_at,
    'buyerConsentVersion',
      cancelled_request.buyer_consent_version,
    'buyerConsentedAt', cancelled_request.buyer_consented_at,
    'status', cancelled_request.status,
    'expiresAt', cancelled_request.expires_at,
    'cancelledAt', cancelled_request.cancelled_at
  );
end;
$$;

revoke all on function
  public.cancel_property_unit_booking_advance(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.cancel_property_unit_booking_advance(
    uuid,
    uuid,
    text
  )
to service_role;

comment on function
  public.cancel_property_unit_booking_advance(
    uuid,
    uuid,
    text
  ) is
  'Cancels an authenticated buyer-owned, unpaid property-advance request before gateway execution. It preserves the booking application and reserved inventory and creates no payment, agreement, sale, title or ownership change.';
