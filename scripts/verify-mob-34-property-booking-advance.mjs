import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const schema = read(
  "supabase/migrations/20260922120000_mob_34_property_booking_advance_readiness.sql",
);
const proposal = read(
  "supabase/migrations/20260922123000_mob_34_property_booking_advance_proposal.sql",
);
const confirmation = read(
  "supabase/migrations/20260922124500_mob_34_property_booking_advance_confirmation.sql",
);
const cancellation = read(
  "supabase/migrations/20260922130000_mob_34_property_booking_advance_cancellation.sql",
);
const alignment = read(
  "supabase/migrations/20260922131500_mob_34_property_booking_advance_lifecycle_alignment.sql",
);
const expiry = read(
  "supabase/migrations/20260922133000_mob_34_property_booking_advance_expiry.sql",
);

const contract = read("lib/mobile/contracts/v1.ts");
const contractStart = contract.indexOf(
  "export type MobilePropertyBookingAdvanceStatus",
);
const contractEnd = contract.indexOf(
  "export type MobileTrustedMediaEntityType",
  contractStart,
);

assert.notEqual(contractStart, -1);
assert.notEqual(contractEnd, -1);

const advanceContract = contract.slice(
  contractStart,
  contractEnd,
);

const authority = read(
  "lib/mobile/server/property-booking-advance.ts",
);
const route = read(
  "app/api/v1/mobile/property-booking-advance/route.ts",
);
const confirmRoute = read(
  "app/api/v1/mobile/property-booking-advance/[advanceRequestId]/confirm/route.ts",
);
const cancelRoute = read(
  "app/api/v1/mobile/property-booking-advance/[advanceRequestId]/cancel/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-advance-api.ts",
);
const advanceScreen = read(
  "apps/mobile/src/features/property/PropertyBookingAdvanceScreen.tsx",
);
const applicationScreen = read(
  "apps/mobile/src/features/property/PropertyBookingApplicationScreen.tsx",
);
const workflow = read(
  ".github/workflows/mobile-foundation.yml",
);

for (const value of [
  "property_unit_booking_advance_requests",
  "property_unit_booking_advance_events",
  "quoted_property_price_paise",
  "advance_amount_paise",
  "pricing_source",
  "builder_inventory_pricing",
  "buyer_consent_version",
  "gateway_configuration_pending",
  "gateway_transaction_id",
  "review_required",
]) {
  assert.match(schema, new RegExp(value));
}

assert.match(schema, /enable row level security/);
assert.match(
  schema,
  /revoke all[\s\S]*?from public, anon, authenticated/,
);
assert.match(schema, /to service_role/);
assert.match(
  schema,
  /advance_amount_paise <= quoted_property_price_paise/,
);
assert.match(
  schema,
  /pricing_source = 'builder_inventory_pricing'/,
);

for (const source of [
  schema,
  proposal,
  confirmation,
  cancellation,
  alignment,
  expiry,
]) {
  assert.doesNotMatch(
    source,
    /createPayment|capturePayment|createGatewayOrder|paymentLink|agreement_document|ownership_transfer|status\s*=\s*'sold'/i,
  );
}

assert.match(
  proposal,
  /propose_property_unit_booking_advance/,
);
assert.match(
  proposal,
  /from public\.builder_inventory_units[\s\S]*?for update;/,
);
assert.match(
  proposal,
  /from public\.builder_inventory_pricing/,
);
assert.match(
  proposal,
  /round\(pricing_record\.price_total \* 100\)::bigint/,
);
assert.match(
  proposal,
  /ADVANCE_EXCEEDS_PROPERTY_PRICE/,
);
assert.match(proposal, /to service_role/);

assert.match(
  confirmation,
  /confirm_property_unit_booking_advance/,
);
assert.match(
  confirmation,
  /property-booking-advance-v1/,
);
assert.match(
  confirmation,
  /PROPERTY_PRICE_CHANGED/,
);
assert.match(
  confirmation,
  /status = 'buyer_confirmed'/,
);
assert.match(
  confirmation,
  /buyer_consent_version = required_consent_version/,
);
assert.match(
  confirmation,
  /request_record\.status = 'buyer_confirmed'/,
);
assert.match(confirmation, /to service_role/);

assert.match(
  cancellation,
  /cancel_property_unit_booking_advance/,
);
assert.match(
  cancellation,
  /'owner_proposed',[\s\S]*?'buyer_confirmed',[\s\S]*?'gateway_configuration_pending'/,
);
assert.match(
  cancellation,
  /gateway_request_reference is not null/,
);
assert.match(
  cancellation,
  /ADVANCE_RECONCILIATION_REQUIRED/,
);
assert.match(
  cancellation,
  /status = 'cancelled'/,
);
assert.match(cancellation, /to service_role/);

assert.match(
  alignment,
  /property_advance_confirmed_requires_consent/,
);
assert.match(
  alignment,
  /'owner_proposed',[\s\S]*?'expired',[\s\S]*?'cancelled'/,
);
assert.match(
  alignment,
  /buyer_consent_version/,
);
assert.match(
  alignment,
  /buyer_consented_at/,
);

assert.match(
  expiry,
  /expire_property_unit_booking_advances/,
);
assert.match(
  expiry,
  /target_limit integer default 100/,
);
assert.match(
  expiry,
  /automatic_expiry/,
);
assert.match(
  expiry,
  /from public\.builder_inventory_units[\s\S]*?for update;/,
);
assert.match(
  expiry,
  /gateway_request_reference is null/,
);
assert.match(
  expiry,
  /gateway_transaction_id is null/,
);
assert.match(expiry, /status = 'expired'/);
assert.match(expiry, /to service_role/);

for (const value of [
  "PROPERTY_BOOKING_ADVANCE_FAILED",
  "MobilePropertyBookingAdvanceStatus",
  "MobilePropertyBookingAdvanceGatewayReadiness",
  "MobilePropertyBookingAdvance",
  "MobilePropertyBookingAdvancePermissions",
  "MobilePropertyBookingAdvanceWorkspace",
  "MobilePropertyBookingAdvanceProposal",
  "MobilePropertyBookingAdvanceConfirmation",
  "MobilePropertyBookingAdvanceCancellation",
]) {
  assert.match(contract, new RegExp(value));
}

for (const value of [
  "usesServerOwnedPropertyPrice: true",
  "createsGatewayOrder: false",
  "collectsMoney: false",
  "createsAgreement: false",
  "marksInventorySold: false",
  "transfersTitle: false",
  "transfersOwnership: false",
  "consentVersion: \"property-booking-advance-v1\"",
]) {
  assert.match(advanceContract, new RegExp(value));
}

assert.doesNotMatch(
  advanceContract,
  /buyerUserId|ownerUserId|storagePath|privatePath|signedUrl|gatewayRequestReference|gatewayTransactionId/,
);

for (const value of [
  "MOBILE_PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION",
  "buildMobilePropertyBookingAdvanceWorkspace",
  "proposeMobilePropertyBookingAdvance",
  "confirmMobilePropertyBookingAdvance",
  "cancelMobilePropertyBookingAdvance",
  "expire_property_unit_booking_advances",
  "propose_property_unit_booking_advance",
  "confirm_property_unit_booking_advance",
  "cancel_property_unit_booking_advance",
  "SBI_GATEWAY_PROVIDER",
  "SBI_INTEGRATION_READY",
]) {
  assert.match(authority, new RegExp(value));
}

for (const value of [
  "createsGatewayOrder: false",
  "collectsMoney: false",
  "createsAgreement: false",
  "marksInventorySold: false",
  "transfersTitle: false",
  "transfersOwnership: false",
]) {
  assert.match(authority, new RegExp(value));
}

assert.match(
  authority,
  /target_owner_user_id: ownerUserId/,
);
assert.match(
  authority,
  /target_buyer_user_id: buyerUserId/,
);
assert.match(
  authority,
  /target_advance_amount_paise: advanceAmountPaise/,
);
assert.doesNotMatch(
  authority,
  /createPayment\s*\(|capturePayment\s*\(|executePayment\s*\(|createGatewayOrder\s*\(|createSignedUrl\s*\(|gatewaySecret|merchantSecret/i,
);

for (const source of [
  route,
  confirmRoute,
  cancelRoute,
]) {
  assert.match(
    source,
    /authenticateMobileRequest\(request\)/,
  );
  assert.match(
    source,
    /private, no-store, max-age=0/,
  );
  assert.match(
    source,
    /Cookie, Authorization/,
  );
  assert.doesNotMatch(
    source,
    /getSupabaseAdmin|\.from\(|\.rpc\(/,
  );
  assert.doesNotMatch(
    source,
    /createPayment|capturePayment|createGatewayOrder|gatewaySecret/i,
  );
}

assert.match(
  route,
  /buildMobilePropertyBookingAdvanceWorkspace/,
);
assert.match(
  route,
  /proposeMobilePropertyBookingAdvance/,
);
assert.match(
  route,
  /ownerUserId: auth\.user\.id/,
);
assert.match(
  confirmRoute,
  /confirmMobilePropertyBookingAdvance/,
);
assert.match(
  confirmRoute,
  /buyerUserId: auth\.user\.id/,
);
assert.match(
  confirmRoute,
  /consentAccepted: true/,
);
assert.match(
  cancelRoute,
  /cancelMobilePropertyBookingAdvance/,
);
assert.match(
  cancelRoute,
  /buyerUserId: auth\.user\.id/,
);

for (const value of [
  "PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION",
  "loadPropertyBookingAdvance",
  "proposePropertyBookingAdvance",
  "confirmPropertyBookingAdvance",
  "cancelPropertyBookingAdvance",
  "advanceAmountPaise",
  "consentAccepted: true",
]) {
  assert.match(client, new RegExp(value));
}

assert.doesNotMatch(
  client,
  /quotedPropertyPricePaise\s*:\s*input\.|buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|gatewayRequestReference|gatewayTransactionId|createPayment\s*\(|capturePayment\s*\(|createGatewayOrder\s*\(/,
);

for (const value of [
  "loadPropertyBookingAdvance",
  "proposePropertyBookingAdvance",
  "confirmPropertyBookingAdvance",
  "cancelPropertyBookingAdvance",
  "Server property price",
  "Proposed advance",
  "Confirm advance readiness",
  "Cancel advance request",
  "SBI payment gateway readiness",
  "No payment action is available",
  "creates no gateway order",
]) {
  assert.match(advanceScreen, new RegExp(value));
}

assert.match(
  advanceScreen,
  /accessibilityRole="progressbar"/,
);
assert.match(
  advanceScreen,
  /accessibilityRole="checkbox"/,
);
assert.match(
  advanceScreen,
  /accessibilityState=\{\{ checked: consentAccepted \}\}/,
);
assert.doesNotMatch(
  advanceScreen,
  /WebBrowser|Linking\.openURL|buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|gatewayRequestReference|gatewayTransactionId|createPayment|capturePayment|createGatewayOrder\(/,
);

for (const value of [
  "PropertyBookingAdvanceScreen",
  "showBookingAdvance",
  "application?.status === \"accepted\"",
  "seconds > 0",
  "Set private advance proposal",
  "Review private advance readiness",
  "canonical server-owned property price",
  "creates no gateway order",
]) {
  assert.ok(
    applicationScreen.includes(value),
    "Application-screen contract is missing: " + value,
  );
}

assert.match(
  applicationScreen,
  /workspace\.permissions\.actor === "owner"/,
);
assert.doesNotMatch(
  applicationScreen,
  /WebBrowser|Linking\.openURL|buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|createPayment|capturePayment|createGatewayOrder\(/,
);

for (const path of [
  "app/api/v1/mobile/property-booking-advance/**",
  "lib/mobile/server/property-booking-advance.ts",
  "supabase/migrations/20260922120000_mob_34_property_booking_advance_readiness.sql",
  "supabase/migrations/20260922123000_mob_34_property_booking_advance_proposal.sql",
  "supabase/migrations/20260922124500_mob_34_property_booking_advance_confirmation.sql",
  "supabase/migrations/20260922130000_mob_34_property_booking_advance_cancellation.sql",
  "supabase/migrations/20260922131500_mob_34_property_booking_advance_lifecycle_alignment.sql",
  "supabase/migrations/20260922133000_mob_34_property_booking_advance_expiry.sql",
  "scripts/verify-mob-34-property-booking-advance.mjs",
]) {
  const count = workflow.split(path).length - 1;

  assert.equal(
    count,
    2,
    "Workflow path must cover pull requests and main pushes: " +
      path,
  );
}

console.log(
  "MOB-34 private property-advance readiness and server-priced consent assertions passed.",
);
