import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const schema = read(
  "supabase/migrations/20260921120000_mob_32_property_unit_holds.sql",
);
const acquisition = read(
  "supabase/migrations/20260921123000_mob_32_property_unit_hold_acquisition.sql",
);
const cancellation = read(
  "supabase/migrations/20260921124500_mob_32_property_unit_hold_cancellation.sql",
);
const expiry = read(
  "supabase/migrations/20260921130000_mob_32_property_unit_hold_expiry.sql",
);
const contract = read("lib/mobile/contracts/v1.ts");
const holdContractStart = contract.indexOf(
  "export type MobilePropertyUnitHoldStatus",
);
const holdContractEnd = contract.indexOf(
  "export type MobileTrustedMediaEntityType",
  holdContractStart,
);
assert.notEqual(holdContractStart, -1);
assert.notEqual(holdContractEnd, -1);
const holdContract = contract.slice(
  holdContractStart,
  holdContractEnd,
);
const authority = read(
  "lib/mobile/server/property-booking-hold.ts",
);
const route = read(
  "app/api/v1/mobile/property-booking-hold/route.ts",
);
const cancelRoute = read(
  "app/api/v1/mobile/property-booking-hold/[holdId]/cancel/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-hold-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyBookingHoldScreen.tsx",
);
const legalScreen = read(
  "apps/mobile/src/features/property/PropertyLegalReviewScreen.tsx",
);
const workflow = read(".github/workflows/mobile-foundation.yml");

for (const value of [
  "property_unit_booking_holds",
  "active",
  "cancelled",
  "expired",
  "converted",
  "legal_review_request_id",
  "held_at",
  "expires_at",
  "released_at",
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
  acquisition,
  /acquire_property_unit_booking_hold/,
);
assert.match(acquisition, /for update/);
assert.match(acquisition, /status = 'available'/);
assert.match(
  acquisition,
  /unit_record\.trust_status::text <> 'verified'/,
);
assert.match(
  acquisition,
  /legal_review\.status <> 'granted'/,
);
assert.match(acquisition, /interval '15 minutes'/);
assert.match(acquisition, /status = 'reserved'/);
assert.match(acquisition, /to service_role/);

assert.match(
  cancellation,
  /cancel_property_unit_booking_hold/,
);
assert.match(cancellation, /HOLD_ACCESS_FORBIDDEN/);
assert.match(
  cancellation,
  /CONVERTED_HOLD_CANNOT_BE_CANCELLED/,
);
assert.match(cancellation, /hold_cancelled/);
assert.match(cancellation, /hold_expired/);
assert.match(cancellation, /status = 'available'/);
assert.match(
  cancellation,
  /status = 'reserved'::public\.inventory_status/,
);
assert.match(cancellation, /to service_role/);

assert.match(
  expiry,
  /expire_property_unit_booking_holds/,
);
assert.match(expiry, /target_limit integer default 100/);
assert.match(expiry, /target_limit > 500/);
assert.match(expiry, /automatic_expiry/);
assert.match(expiry, /status = 'available'/);
assert.match(
  expiry,
  /status = 'reserved'::public\.inventory_status/,
);
assert.match(expiry, /to service_role/);

for (const migration of [
  schema,
  acquisition,
  cancellation,
  expiry,
]) {
  assert.doesNotMatch(
    migration,
    /razorpay|payment_intent|payment_order|agreement_document|ownership_transfer/i,
  );
}

for (const value of [
  "PROPERTY_BOOKING_HOLD_FAILED",
  "MobilePropertyUnitHoldStatus",
  "MobilePropertyUnitHoldEligibilityReason",
  "MobilePropertyUnitHold",
  "MobilePropertyUnitHoldWorkspace",
  "MobilePropertyUnitHoldAcquire",
  "MobilePropertyUnitHoldCancellation",
]) {
  assert.match(contract, new RegExp(value));
}

assert.match(contract, /holdDurationSeconds: 900/);
assert.match(contract, /requiresGrantedLegalReview: true/);
assert.match(contract, /createsPayment: false/);
assert.match(contract, /createsAgreement: false/);
assert.match(contract, /transfersOwnership: false/);
assert.doesNotMatch(
  holdContract,
  /buyerUserId|ownerUserId|storagePath|privatePath|signedUrl/,
);

for (const value of [
  "MOBILE_PROPERTY_BOOKING_INTENT_VERSION",
  "buildMobilePropertyUnitHoldWorkspace",
  "acquireMobilePropertyUnitHold",
  "cancelMobilePropertyUnitHold",
  "expire_property_unit_booking_holds",
  "acquire_property_unit_booking_hold",
  "cancel_property_unit_booking_hold",
  "HOLD_ACCESS_FORBIDDEN",
]) {
  assert.match(authority, new RegExp(value));
}

assert.match(
  authority,
  /ownsActiveHold[\s\S]*?buyer_user_id === userId/,
);
assert.match(
  authority,
  /activeHoldRow && \(ownsActiveHold \|\| ownerCanView\)/,
);
assert.doesNotMatch(
  authority,
  /razorpay|createPayment|capturePayment|agreementUrl|transferOwnership/,
);

for (const source of [route, cancelRoute]) {
  assert.match(source, /authenticateMobileRequest\(request\)/);
  assert.match(source, /private, no-store, max-age=0/);
  assert.match(source, /Cookie, Authorization/);
  assert.doesNotMatch(
    source,
    /getSupabaseAdmin|\.from\(|\.rpc\(/,
  );
}

assert.match(route, /buildMobilePropertyUnitHoldWorkspace/);
assert.match(route, /acquireMobilePropertyUnitHold/);
assert.match(route, /buyerUserId: auth\.user\.id/);
assert.match(cancelRoute, /cancelMobilePropertyUnitHold/);
assert.match(cancelRoute, /buyerUserId: auth\.user\.id/);

for (const value of [
  "PROPERTY_UNIT_BOOKING_INTENT_VERSION",
  "loadPropertyUnitHold",
  "acquirePropertyUnitHold",
  "cancelPropertyUnitHold",
  "legalReviewRequestId",
  "acknowledgedAt",
]) {
  assert.match(client, new RegExp(value));
}

assert.match(
  client,
  /new Date\(\)\.toISOString\(\)/,
);
assert.doesNotMatch(
  client,
  /buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|razorpay|createPayment|agreementUrl/,
);

for (const value of [
  "loadPropertyUnitHold",
  "acquirePropertyUnitHold",
  "cancelPropertyUnitHold",
  "setInterval",
  "clearInterval",
  "Hold this unit for 15 minutes",
  "Cancel my temporary hold",
  "Competing buyer details remain private",
  "creates no payment",
]) {
  assert.match(screen, new RegExp(value));
}

assert.match(screen, /accessibilityRole="progressbar"/);
assert.match(screen, /accessibilityRole="checkbox"/);
assert.match(
  screen,
  /accessibilityState=\{\{ checked: intentAccepted \}\}/,
);
assert.doesNotMatch(
  screen,
  /buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|razorpay|createPayment|agreementUrl/,
);

assert.match(legalScreen, /PropertyBookingHoldScreen/);
assert.match(legalScreen, /showBookingHold/);
assert.match(
  legalScreen,
  /permissions\.actor === "buyer"/,
);
assert.match(
  legalScreen,
  /request\?\.status === "granted"/,
);
assert.match(
  legalScreen,
  /Date\.parse\(workspace\.request\.expiresAt\) > Date\.now\(\)/,
);
assert.match(
  legalScreen,
  /Continue to temporary unit hold/,
);

for (const path of [
  "app/api/v1/mobile/property-booking-hold/**",
  "lib/mobile/server/property-booking-hold.ts",
  "supabase/migrations/20260921120000_mob_32_property_unit_holds.sql",
  "supabase/migrations/20260921123000_mob_32_property_unit_hold_acquisition.sql",
  "supabase/migrations/20260921124500_mob_32_property_unit_hold_cancellation.sql",
  "supabase/migrations/20260921130000_mob_32_property_unit_hold_expiry.sql",
  "scripts/verify-mob-32-property-booking-hold.mjs",
]) {
  const count = workflow.split(path).length - 1;
  assert.equal(
    count,
    2,
    "Workflow path must cover pull requests and main pushes: " + path,
  );
}

console.log(
  "MOB-32 native property-unit booking-hold and concurrency assertions passed.",
);
