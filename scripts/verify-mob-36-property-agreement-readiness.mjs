import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const schema = read(
  "supabase/migrations/20260923130000_mob_36_property_agreement_readiness.sql",
);
const creation = read(
  "supabase/migrations/20260923133000_mob_36_property_agreement_readiness_creation.sql",
);
const submission = read(
  "supabase/migrations/20260923140000_mob_36_property_agreement_party_submission.sql",
);
const partyConfirmation = read(
  "supabase/migrations/20260923143000_mob_36_property_agreement_party_confirmation.sql",
);
const scheduleConfirmation = read(
  "supabase/migrations/20260923150000_mob_36_property_agreement_schedule_confirmation.sql",
);
const cancellation = read(
  "supabase/migrations/20260923153000_mob_36_property_agreement_readiness_cancellation.sql",
);
const expiry = read(
  "supabase/migrations/20260923160000_mob_36_property_agreement_readiness_expiry.sql",
);

const contract = read("lib/mobile/contracts/v1.ts");
const contractStart = contract.indexOf(
  "export type MobilePropertyBookingAgreementReadinessStatus",
);
const contractEnd = contract.indexOf(
  "export type MobileTrustedMediaEntityType",
  contractStart,
);

assert.notEqual(contractStart, -1);
assert.notEqual(contractEnd, -1);

const agreementContract = contract.slice(
  contractStart,
  contractEnd,
);

const authority = read(
  "lib/mobile/server/property-booking-agreement-readiness.ts",
);
const route = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/route.ts",
);
const partyRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/party/route.ts",
);
const partyConfirmRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/party/confirm/route.ts",
);
const scheduleConfirmRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/schedule/confirm/route.ts",
);
const cancelRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/cancel/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-agreement-readiness-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyBookingAgreementReadinessScreen.tsx",
);
const applicationScreen = read(
  "apps/mobile/src/features/property/PropertyBookingApplicationScreen.tsx",
);
const workflow = read(
  ".github/workflows/mobile-foundation.yml",
);

for (const value of [
  "property_unit_booking_agreement_readiness",
  "property_unit_booking_agreement_party_inputs",
  "property_unit_booking_agreement_events",
  "collecting_details",
  "ready_for_draft",
  "property-agreement-readiness-v1",
  "quoted_property_price_paise",
  "unit_code_snapshot",
  "boundary_north",
  "boundary_south",
  "boundary_east",
  "boundary_west",
  "plot_numbers_snapshot",
  "deed_numbers_snapshot",
  "mutation_numbers_snapshot",
  "khatian_numbers_snapshot",
  "CUSTOM_STAMP_PAPER",
  "lawyer_review_required",
  "ai_draft_advisory_only",
  "agreement_execution_allowed",
]) {
  assert.match(schema, new RegExp(value));
}

assert.match(schema, /enable row level security/);
assert.match(
  schema,
  /revoke all[\s\S]*?from public, anon, authenticated/,
);
assert.match(schema, /to service_role/);
assert.match(schema, /check \(not agreement_execution_allowed\)/);
assert.match(schema, /check \(not creates_payment\)/);
assert.match(schema, /check \(not marks_inventory_sold\)/);
assert.match(schema, /check \(not transfers_title\)/);
assert.match(schema, /check \(not transfers_ownership\)/);
assert.doesNotMatch(
  schema,
  /storage_path|signed_url|raw_identity|identity_document_bytes/i,
);

for (const source of [
  schema,
  creation,
  submission,
  partyConfirmation,
  scheduleConfirmation,
  cancellation,
  expiry,
]) {
  assert.doesNotMatch(
    source,
    /generateAgreement\s*\(|approveAgreement\s*\(|executeAgreement\s*\(|signAgreement\s*\(|registerAgreement\s*\(|createPayment\s*\(|capturePayment\s*\(|createGatewayOrder\s*\(|status\s*=\s*'sold'/i,
  );
}

for (const source of [
  creation,
  submission,
  partyConfirmation,
  scheduleConfirmation,
  cancellation,
]) {
  assert.match(
    source,
    /from public\.builder_inventory_units[\s\S]*?for update;/,
  );
  assert.match(source, /security definer/);
  assert.match(source, /to service_role/);
}

for (const value of [
  "create_property_unit_booking_agreement_readiness",
  "property-agreement-readiness-v1",
  "builder_inventory_pricing",
  "boundary_north",
  "boundary_south",
  "boundary_east",
  "boundary_west",
  "plot_numbers_snapshot",
  "deed_numbers_snapshot",
  "mutation_numbers_snapshot",
  "khatian_numbers_snapshot",
  "readiness_created",
]) {
  assert.match(creation, new RegExp(value));
}

assert.match(
  creation,
  /round\(pricing_record\.price_total \* 100\)::bigint/,
);
assert.match(creation, /'replayed', true/);
assert.match(creation, /'replayed', false/);

for (const value of [
  "submit_property_unit_booking_agreement_party_input",
  "property-agreement-party-input-v1",
  "AGREEMENT_PARTY_INPUT_FIELD_INVALID",
  "AGREEMENT_PARTY_CONSENT_REQUIRED",
  "AGREEMENT_IDENTITY_REFERENCE_NOT_MASKED",
  "identity_masked_reference",
  "maskedIdentityReferenceOnly",
  "rawIdentityStored",
]) {
  assert.match(submission, new RegExp(value));
}

assert.match(submission, /jsonb_object_keys/);
assert.match(submission, /party_record\.party_user_id <> target_actor_user_id/);

for (const value of [
  "confirm_property_unit_booking_agreement_party_input",
  "AGREEMENT_PARTY_NOT_SUBMITTED",
  "AGREEMENT_PARTY_DETAILS_INCOMPLETE",
  "selfConfirmation",
  "otherPartyDetailsExposed",
]) {
  assert.match(partyConfirmation, new RegExp(value));
}

assert.match(
  partyConfirmation,
  /party_record\.party_user_id <> target_actor_user_id/,
);
assert.doesNotMatch(
  partyConfirmation,
  /property_schedule_confirmed_at\s*=\s*action_time|ready_for_draft_at\s*=\s*action_time/,
);

for (const value of [
  "confirm_property_unit_booking_agreement_schedule",
  "AGREEMENT_OWNER_ACCESS_FORBIDDEN",
  "AGREEMENT_PARTIES_NOT_CONFIRMED",
  "PROPERTY_SCHEDULE_CHANGED",
  "property_schedule_confirmed_at = action_time",
  "ready_for_draft_at = action_time",
  "status = 'ready_for_draft'",
]) {
  assert.match(scheduleConfirmation, new RegExp(value));
}

assert.match(
  scheduleConfirmation,
  /target_owner_user_id <> readiness_record\.owner_user_id/,
);
assert.match(
  scheduleConfirmation,
  /buyer_details_confirmed_at is not null/,
);
assert.match(
  scheduleConfirmation,
  /owner_details_confirmed_at is not null/,
);

assert.match(
  cancellation,
  /cancel_property_unit_booking_agreement_readiness/,
);
assert.match(cancellation, /status = 'cancelled'/);
assert.match(cancellation, /readiness_cancelled/);

assert.match(
  expiry,
  /expire_property_unit_booking_agreement_readiness/,
);
assert.match(expiry, /target_limit integer default 100/);
assert.match(expiry, /automatic_expiry/);
assert.match(expiry, /status = 'expired'/);
assert.match(expiry, /to service_role/);

for (const value of [
  "PROPERTY_AGREEMENT_READINESS_FAILED",
  "MobilePropertyBookingAgreementReadinessStatus",
  "MobilePropertyBookingAgreementSchedule",
  "MobilePropertyBookingAgreementPartyInput",
  "MobilePropertyBookingAgreementReadiness",
  "MobilePropertyBookingAgreementProgress",
  "MobilePropertyBookingAgreementPermissions",
  "MobilePropertyBookingAgreementWorkspace",
  "MobilePropertyBookingAgreementReadinessCreate",
  "MobilePropertyBookingAgreementPartySubmission",
  "MobilePropertyBookingAgreementPartyConfirmation",
  "MobilePropertyBookingAgreementScheduleConfirmation",
  "MobilePropertyBookingAgreementCancellation",
]) {
  assert.match(contract, new RegExp(value));
}

for (const value of [
  "confidentialDocumentsOpened: false",
  "aiDraftAdvisoryOnly: true",
  "lawyerReviewRequired: true",
  "paymentRequiredBeforeExecution: true",
  "generatesAgreement: false",
  "approvesAgreement: false",
  "executesAgreement: false",
  "createsPayment: false",
  "marksInventorySold: false",
  "transfersTitle: false",
  "transfersOwnership: false",
]) {
  assert.match(agreementContract, new RegExp(value));
}

assert.doesNotMatch(
  agreementContract,
  /buyerUserId|ownerUserId|partyUserId|storagePath|privatePath|signedUrl|rawIdentity/,
);

for (const value of [
  "MOBILE_PROPERTY_AGREEMENT_READINESS_VERSION",
  "MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION",
  "buildMobilePropertyBookingAgreementWorkspace",
  "createMobilePropertyBookingAgreementReadiness",
  "submitMobilePropertyBookingAgreementPartyInput",
  "confirmMobilePropertyBookingAgreementPartyInput",
  "confirmMobilePropertyBookingAgreementSchedule",
  "cancelMobilePropertyBookingAgreementReadiness",
  "expire_property_unit_booking_agreement_readiness",
]) {
  assert.match(authority, new RegExp(value));
}

assert.match(
  authority,
  /\.eq\("party_user_id", userId\)/,
);
assert.match(
  authority,
  /target_actor_user_id: actorUserId/,
);
assert.match(
  authority,
  /target_owner_user_id: ownerUserId/,
);
assert.doesNotMatch(
  authority,
  /generateAgreement\s*\(|approveAgreement\s*\(|executeAgreement\s*\(|createPayment\s*\(|createSignedUrl\s*\(/,
);

for (const source of [
  route,
  partyRoute,
  partyConfirmRoute,
  scheduleConfirmRoute,
  cancelRoute,
]) {
  assert.match(
    source,
    /authenticateMobileRequest\(request\)/,
  );
  assert.match(source, /private, no-store, max-age=0/);
  assert.match(source, /Cookie, Authorization/);
  assert.doesNotMatch(
    source,
    /getSupabaseAdmin|\.from\(|\.rpc\(|storage_path|signedUrl|createPayment\s*\(/,
  );
}

assert.match(
  route,
  /buildMobilePropertyBookingAgreementWorkspace/,
);
assert.match(
  route,
  /createMobilePropertyBookingAgreementReadiness/,
);
assert.match(route, /actorUserId: auth\.user\.id/);

assert.match(
  partyRoute,
  /submitMobilePropertyBookingAgreementPartyInput/,
);
assert.match(
  partyRoute,
  /actorUserId: auth\.user\.id/,
);

assert.match(
  partyConfirmRoute,
  /confirmMobilePropertyBookingAgreementPartyInput/,
);
assert.match(
  partyConfirmRoute,
  /actorUserId: auth\.user\.id/,
);

assert.match(
  scheduleConfirmRoute,
  /confirmMobilePropertyBookingAgreementSchedule/,
);
assert.match(
  scheduleConfirmRoute,
  /ownerUserId: auth\.user\.id/,
);

assert.match(
  cancelRoute,
  /cancelMobilePropertyBookingAgreementReadiness/,
);
assert.match(
  cancelRoute,
  /actorUserId: auth\.user\.id/,
);

for (const value of [
  "PROPERTY_AGREEMENT_READINESS_VERSION",
  "PROPERTY_AGREEMENT_PARTY_INPUT_VERSION",
  "loadPropertyBookingAgreementReadiness",
  "createPropertyBookingAgreementReadiness",
  "submitPropertyBookingAgreementPartyInput",
  "confirmPropertyBookingAgreementPartyInput",
  "confirmPropertyBookingAgreementSchedule",
  "cancelPropertyBookingAgreementReadiness",
  "consentAccepted: true",
]) {
  assert.match(client, new RegExp(value));
}

assert.doesNotMatch(
  client,
  /quotedPropertyPricePaise\s*:\s*input\.|boundaryNorth\s*:\s*input\.|boundarySouth\s*:\s*input\.|buyerUserId|ownerUserId|partyUserId|storage_path|storagePath|signedUrl|generateAgreement\s*\(|createPayment\s*\(/,
);

for (const value of [
  "PropertyBookingAgreementReadinessScreen",
  "loadPropertyBookingAgreementReadiness",
  "createPropertyBookingAgreementReadiness",
  "submitPropertyBookingAgreementPartyInput",
  "confirmPropertyBookingAgreementPartyInput",
  "confirmPropertyBookingAgreementSchedule",
  "cancelPropertyBookingAgreementReadiness",
  "Canonical property schedule",
  "Server property price",
  "Masked identity reference",
  "Confirm my submitted particulars",
  "Confirm canonical property schedule",
  "Advisory drafting readiness reached",
]) {
  assert.match(screen, new RegExp(value));
}

assert.match(screen, /accessibilityRole="progressbar"/);
assert.match(screen, /accessibilityLiveRegion="polite"/);
assert.match(screen, /accessibilityRole="checkbox"/);
assert.doesNotMatch(
  screen,
  /WebBrowser|Linking\.openURL|buyerUserId|ownerUserId|partyUserId|storage_path|storagePath|signedUrl|generateAgreement\s*\(|createPayment\s*\(/,
);

assert.match(
  applicationScreen,
  /PropertyBookingAgreementReadinessScreen/,
);
assert.match(
  applicationScreen,
  /application\?\.status === "accepted"[\s\S]*?seconds > 0[\s\S]*?setShowAgreementReadiness\(true\)/,
);
assert.match(
  applicationScreen,
  /Private agreement readiness/,
);

for (const path of [
  "app/api/v1/mobile/property-booking-agreement-readiness/**",
  "lib/mobile/server/property-booking-agreement-readiness.ts",
  "supabase/migrations/20260923130000_mob_36_property_agreement_readiness.sql",
  "supabase/migrations/20260923133000_mob_36_property_agreement_readiness_creation.sql",
  "supabase/migrations/20260923140000_mob_36_property_agreement_party_submission.sql",
  "supabase/migrations/20260923143000_mob_36_property_agreement_party_confirmation.sql",
  "supabase/migrations/20260923150000_mob_36_property_agreement_schedule_confirmation.sql",
  "supabase/migrations/20260923153000_mob_36_property_agreement_readiness_cancellation.sql",
  "supabase/migrations/20260923160000_mob_36_property_agreement_readiness_expiry.sql",
  "scripts/verify-mob-35-payment-gateway-deferral.mjs",
  "scripts/verify-mob-36-property-agreement-readiness.mjs",
]) {
  const escaped = path.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const count = (
    workflow.match(new RegExp(escaped, "g")) || []
  ).length;

  assert.equal(
    count,
    2,
    `Expected ${path} in pull-request and push path filters`,
  );
}

console.log(
  "MOB-36 private agreement-readiness, self-confirmation and canonical-schedule assertions passed.",
);
