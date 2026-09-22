import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const schema = read(
  "supabase/migrations/20260921140000_mob_33_property_booking_applications.sql",
);
const submission = read(
  "supabase/migrations/20260921143000_mob_33_property_booking_application_submission.sql",
);
const decision = read(
  "supabase/migrations/20260921144500_mob_33_property_booking_application_decision.sql",
);
const terminal = read(
  "supabase/migrations/20260921150000_mob_33_property_booking_application_terminal.sql",
);
const contract = read("lib/mobile/contracts/v1.ts");
const contractStart = contract.indexOf(
  "export type MobilePropertyBookingApplicationStatus",
);
const contractEnd = contract.indexOf(
  "export type MobileTrustedMediaEntityType",
  contractStart,
);
assert.notEqual(contractStart, -1);
assert.notEqual(contractEnd, -1);
const applicationContract = contract.slice(
  contractStart,
  contractEnd,
);

const authority = read(
  "lib/mobile/server/property-booking-application.ts",
);
const route = read(
  "app/api/v1/mobile/property-booking-application/route.ts",
);
const decisionRoute = read(
  "app/api/v1/mobile/property-booking-application/[applicationId]/decision/route.ts",
);
const cancelRoute = read(
  "app/api/v1/mobile/property-booking-application/[applicationId]/cancel/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-application-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyBookingApplicationScreen.tsx",
);
const holdScreen = read(
  "apps/mobile/src/features/property/PropertyBookingHoldScreen.tsx",
);
const legalScreen = read(
  "apps/mobile/src/features/property/PropertyLegalReviewScreen.tsx",
);
const workflow = read(".github/workflows/mobile-foundation.yml");

for (const value of [
  "property_unit_booking_applications",
  "property_unit_booking_application_events",
  "submitted",
  "accepted",
  "declined",
  "cancelled",
  "expired",
  "decision_due_at",
  "accepted_until",
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
  /status in \('submitted', 'accepted'\)/,
);
assert.match(schema, /interval '48 hours'/);

assert.match(
  submission,
  /submit_property_unit_booking_application/,
);
assert.match(
  submission,
  /from public\.builder_inventory_units unit[\s\S]*?for update;/,
);
assert.match(
  submission,
  /from public\.property_unit_booking_holds/,
);
assert.match(submission, /status = 'converted'/);
assert.match(submission, /hold_converted/);
assert.match(submission, /status = 'reserved'/);
assert.match(
  submission,
  /conversion_reference_type = 'property_unit_booking_application'/,
);
assert.match(submission, /to service_role/);

assert.match(
  decision,
  /decide_property_unit_booking_application/,
);
assert.match(
  decision,
  /from public\.builder_inventory_units unit[\s\S]*?for update;/,
);
assert.match(
  decision,
  /normalized_decision not in \('accepted', 'declined'\)/,
);
assert.match(decision, /accepted_until/);
assert.match(decision, /interval '48 hours'/);
assert.match(decision, /status = 'available'/);
assert.match(
  decision,
  /status = 'reserved'::public\.inventory_status/,
);
assert.match(decision, /to service_role/);

assert.match(
  terminal,
  /cancel_property_unit_booking_application/,
);
assert.match(
  terminal,
  /expire_property_unit_booking_applications/,
);
assert.match(terminal, /target_limit integer default 100/);
assert.match(terminal, /automatic_expiry/);
assert.match(
  terminal,
  /from public\.builder_inventory_units unit[\s\S]*?for update;/,
);
assert.match(terminal, /status = 'available'/);
assert.match(
  terminal,
  /status = 'reserved'::public\.inventory_status/,
);
assert.match(terminal, /to service_role/);

for (const migration of [
  schema,
  submission,
  decision,
  terminal,
]) {
  assert.doesNotMatch(
    migration,
    /razorpay|payment_intent|payment_order|agreement_document|ownership_transfer|status\s*=\s*'sold'/i,
  );
}

for (const value of [
  "PROPERTY_BOOKING_APPLICATION_FAILED",
  "MobilePropertyBookingApplicationStatus",
  "MobilePropertyBookingApplication",
  "MobilePropertyBookingApplicationPermissions",
  "MobilePropertyBookingApplicationWorkspace",
  "MobilePropertyBookingApplicationSubmit",
  "MobilePropertyBookingApplicationDecision",
  "MobilePropertyBookingApplicationCancellation",
]) {
  assert.match(contract, new RegExp(value));
}

for (const value of [
  "ownerDecisionWindowSeconds: 172800",
  "acceptedNextStepWindowSeconds: 172800",
  "requiresActiveBuyerHold: true",
  "keepsInventoryReserved: true",
  "createsPayment: false",
  "createsAgreement: false",
  "marksInventorySold: false",
  "transfersOwnership: false",
]) {
  assert.match(applicationContract, new RegExp(value));
}

assert.doesNotMatch(
  applicationContract,
  /buyerUserId|ownerUserId|storagePath|privatePath|signedUrl|paymentId|agreementId/,
);

for (const value of [
  "MOBILE_PROPERTY_BOOKING_APPLICATION_INTENT_VERSION",
  "buildMobilePropertyBookingApplicationWorkspace",
  "submitMobilePropertyBookingApplication",
  "decideMobilePropertyBookingApplication",
  "cancelMobilePropertyBookingApplication",
  "expire_property_unit_booking_applications",
  "submit_property_unit_booking_application",
  "decide_property_unit_booking_application",
  "cancel_property_unit_booking_application",
]) {
  assert.match(authority, new RegExp(value));
}

assert.match(
  authority,
  /\.or\(\`buyer_user_id\.eq\.\$\{userId\},owner_user_id\.eq\.\$\{userId\}\`\)/,
);
assert.match(
  authority,
  /target_buyer_user_id: buyerUserId/,
);
assert.match(
  authority,
  /target_owner_user_id: ownerUserId/,
);
assert.doesNotMatch(
  authority,
  /razorpay|createPayment|capturePayment|agreementUrl|transferOwnership|createSignedUrl/,
);

for (const source of [
  route,
  decisionRoute,
  cancelRoute,
]) {
  assert.match(source, /authenticateMobileRequest\(request\)/);
  assert.match(source, /private, no-store, max-age=0/);
  assert.match(source, /Cookie, Authorization/);
  assert.doesNotMatch(
    source,
    /getSupabaseAdmin|\.from\(|\.rpc\(/,
  );
}

assert.match(
  route,
  /buildMobilePropertyBookingApplicationWorkspace/,
);
assert.match(
  route,
  /submitMobilePropertyBookingApplication/,
);
assert.match(route, /buyerUserId: auth\.user\.id/);
assert.match(
  decisionRoute,
  /decideMobilePropertyBookingApplication/,
);
assert.match(
  decisionRoute,
  /ownerUserId: auth\.user\.id/,
);
assert.match(
  cancelRoute,
  /cancelMobilePropertyBookingApplication/,
);
assert.match(
  cancelRoute,
  /buyerUserId: auth\.user\.id/,
);

for (const value of [
  "PROPERTY_BOOKING_APPLICATION_INTENT_VERSION",
  "loadPropertyBookingApplication",
  "submitPropertyBookingApplication",
  "decidePropertyBookingApplication",
  "cancelPropertyBookingApplication",
  "acknowledgedAt",
  "buyerMessage",
]) {
  assert.match(client, new RegExp(value));
}

assert.match(client, /new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(
  client,
  /buyerUserId|ownerUserId|storage_path|storagePath|signedUrl|razorpay|createPayment|agreementUrl/,
);

for (const value of [
  "loadPropertyBookingApplication",
  "submitPropertyBookingApplication",
  "decidePropertyBookingApplication",
  "cancelPropertyBookingApplication",
  "Submit private booking application",
  "Accept for 48 hours",
  "Decline booking application",
  "Cancel my booking application",
  "does not collect money",
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

assert.match(
  holdScreen,
  /PropertyBookingApplicationScreen/,
);
assert.match(holdScreen, /showBookingApplication/);
assert.match(
  holdScreen,
  /permissions\.actor === "buyer"/,
);
assert.match(
  holdScreen,
  /workspace\.hold\.status === "converted"/,
);
assert.match(
  holdScreen,
  /Continue to private booking application/,
);

assert.match(
  legalScreen,
  /PropertyBookingApplicationScreen/,
);
assert.match(
  legalScreen,
  /canOpenOwnerBookingApplication/,
);
assert.match(
  legalScreen,
  /permissions\.actor === "owner"/,
);
assert.match(
  legalScreen,
  /Review private booking application/,
);

for (const path of [
  "app/api/v1/mobile/property-booking-application/**",
  "lib/mobile/server/property-booking-application.ts",
  "supabase/migrations/20260921140000_mob_33_property_booking_applications.sql",
  "supabase/migrations/20260921143000_mob_33_property_booking_application_submission.sql",
  "supabase/migrations/20260921144500_mob_33_property_booking_application_decision.sql",
  "supabase/migrations/20260921150000_mob_33_property_booking_application_terminal.sql",
  "scripts/verify-mob-33-property-booking-application.mjs",
]) {
  const count = workflow.split(path).length - 1;
  assert.equal(
    count,
    2,
    "Workflow path must cover pull requests and main pushes: " + path,
  );
}

console.log(
  "MOB-33 native property booking-application and owner-decision assertions passed.",
);
