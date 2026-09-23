/*
 * MOB-34 lifecycle alignment.
 *
 * An owner proposal may expire or be cancelled before the buyer gives
 * consent. States that continue toward gateway readiness still require
 * the paired buyer consent version and timestamp.
 */

alter table public.property_unit_booking_advance_requests
  drop constraint if exists
    property_advance_confirmed_requires_consent;

alter table public.property_unit_booking_advance_requests
  add constraint property_advance_confirmed_requires_consent
  check (
    status in (
      'owner_proposed',
      'expired',
      'cancelled'
    )
    or (
      nullif(btrim(buyer_consent_version), '') is not null
      and buyer_consented_at is not null
    )
  );

comment on constraint
  property_advance_confirmed_requires_consent
on public.property_unit_booking_advance_requests is
  'Owner proposals may expire or be cancelled without buyer consent. Buyer-confirmed and all later gateway-related states require a non-empty consent version and consent timestamp.';
