import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const schema = read(
  "supabase/migrations/20260924110000_mob_37_property_agreement_advisory_drafts.sql",
);
const preparation = read(
  "supabase/migrations/20260924113000_mob_37_property_agreement_draft_preparation.sql",
);
const claim = read(
  "supabase/migrations/20260924120000_mob_37_property_agreement_generation_claim.sql",
);
const sourceAccess = read(
  "supabase/migrations/20260924123000_mob_37_property_agreement_generation_source_access.sql",
);
const completion = read(
  "supabase/migrations/20260924130000_mob_37_property_agreement_generation_completion.sql",
);
const failure = read(
  "supabase/migrations/20260924133000_mob_37_property_agreement_generation_failure.sql",
);
const contentHash = read(
  "supabase/migrations/20260924134500_mob_37_property_agreement_content_hash.sql",
);
const contract = read("lib/mobile/contracts/v1.ts");
const worker = read(
  "lib/mobile/server/property-booking-agreement-draft.ts",
);
const readAuthority = read(
  "lib/mobile/server/property-booking-agreement-draft-read.ts",
);
const generateRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/draft/generate/route.ts",
);
const readRoute = read(
  "app/api/v1/mobile/property-booking-agreement-readiness/[readinessId]/draft/route.ts",
);
const requestHelper = read(
  "apps/mobile/src/lib/api/request.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-agreement-draft-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyBookingAgreementAdvisoryDraftScreen.tsx",
);
const readinessScreen = read(
  "apps/mobile/src/features/property/PropertyBookingAgreementReadinessScreen.tsx",
);
const workflow = read(".github/workflows/mobile-foundation.yml");

for (const value of [
  "property_unit_booking_agreement_drafts",
  "property_unit_booking_agreement_draft_sources",
  "property_unit_booking_agreement_draft_events",
  "generation_pending",
  "generation_failed",
  "lawyer_review_required",
  "advisory_only",
  "source_snapshot_sha256",
  "draft_content_json",
  "printable_text",
  "draft_content_sha256",
  "confidential_legal_document",
]) {
  assert.match(schema, new RegExp(value));
}

for (const value of [
  "check (not legal_effect_created)",
  "check (not signing_allowed)",
  "check (not registration_allowed)",
  "check (not execution_allowed)",
  "check (not creates_payment)",
  "check (not marks_inventory_sold)",
  "check (not transfers_title)",
  "check (not transfers_ownership)",
]) {
  assert.ok(schema.includes(value));
}

assert.match(schema, /enable row level security/);
assert.match(
  schema,
  /revoke all[\s\S]*?from public, anon, authenticated/,
);
assert.match(schema, /to service_role/);

const authorities = [
  [
    preparation,
    "prepare_property_unit_booking_agreement_advisory_draft",
  ],
  [
    claim,
    "claim_property_unit_booking_agreement_advisory_generation",
  ],
  [
    sourceAccess,
    "open_property_unit_booking_agreement_generation_source",
  ],
  [
    completion,
    "complete_property_unit_booking_agreement_advisory_generation",
  ],
  [
    failure,
    "fail_property_unit_booking_agreement_advisory_generation",
  ],
  [
    contentHash,
    "hash_property_unit_booking_agreement_advisory_content",
  ],
];

for (const [authority, functionName] of authorities) {
  assert.match(authority, new RegExp(functionName));
  assert.match(authority, /security definer/);
  assert.match(
    authority,
    /from public, anon, authenticated/,
  );
  assert.match(authority, /to service_role/);
}

for (const authority of [
  preparation,
  claim,
  sourceAccess,
  completion,
  failure,
]) {
  assert.match(
    authority,
    /from public\.builder_inventory_units[\s\S]*?for update;/,
  );
}

for (const value of [
  "ready_for_draft",
  "source_snapshot_sha256_value",
  "scheduleSha256",
  "buyerParticularsSha256",
  "ownerParticularsSha256",
  "legalDocuments",
  "generation_requested",
  "source_bound",
]) {
  assert.match(preparation, new RegExp(value));
}

assert.doesNotMatch(
  preparation,
  /createSignedUrl|storage_path|storage_bucket|api\.openai\.com/i,
);

for (const value of [
  "target_ai_provider",
  "target_ai_model",
  "target_ai_request_reference",
  "generation_started_at",
  "sourcePackage",
  "canonicalPropertySchedule",
  "buyerConfirmedParticulars",
  "ownerConfirmedParticulars",
  "confidentialLegalDocuments",
]) {
  assert.match(claim, new RegExp(value));
}

for (const value of [
  "target_document_id",
  "property-documents-private",
  "storageBucket",
  "storagePath",
  "source_opened_for_generation",
  "privateBucketVerified",
  "included_in_generation",
]) {
  assert.match(sourceAccess, new RegExp(value));
}

assert.doesNotMatch(
  sourceAccess,
  /createSignedUrl|api\.openai\.com/i,
);

for (const value of [
  "target_draft_content",
  "target_printable_text",
  "target_draft_content_sha256",
  "AGREEMENT_DRAFT_HASH_MISMATCH",
  "AGREEMENT_GENERATION_SOURCES_INCOMPLETE",
  "AGREEMENT_CANONICAL_SOURCES_INCOMPLETE",
  "draft_generated",
  "advisoryOnly",
  "lawyerReviewRequired",
]) {
  assert.match(completion, new RegExp(value));
}

assert.match(
  completion,
  /target_draft_content::text[\s\S]*?E'\\n'[\s\S]*?normalized_printable_text/,
);
assert.match(
  contentHash,
  /target_draft_content::text[\s\S]*?E'\\n'[\s\S]*?normalized_printable_text/,
);

for (const value of [
  "target_failure_code",
  "generation_failed",
  "generation_failure_code",
  "AGREEMENT_GENERATION_FAILURE_REPLAY_CONFLICT",
]) {
  assert.match(failure, new RegExp(value));
}

assert.doesNotMatch(
  failure,
  /response_payload|exception_message|storage_path|api_key/i,
);
assert.doesNotMatch(
  contentHash,
  /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i,
);

for (const value of [
  "MobilePropertyBookingAgreementAdvisoryDraftStatus",
  "MobilePropertyBookingAgreementAdvisoryDraftContent",
  "MobilePropertyBookingAgreementAdvisoryDraft",
  "MobilePropertyBookingAgreementAdvisoryDraftWorkspace",
  "privateBoundPartyAccessOnly: true",
  "confidentialSourceLocatorsExposed: false",
  "aiCredentialsExposed: false",
  "sourceSnapshotHashExposed: false",
  "advisoryOnly: true",
  "lawyerReviewRequired: true",
  "legalEffectCreated: false",
  "signingAllowed: false",
  "registrationAllowed: false",
  "executionAllowed: false",
  "createsPayment: false",
  "marksInventorySold: false",
  "transfersTitle: false",
  "transfersOwnership: false",
]) {
  assert.match(contract, new RegExp(value));
}

assert.match(worker, /api\.openai\.com/);

const lifecycle = [
  "prepare_property_unit_booking_agreement_advisory_draft",
  "claim_property_unit_booking_agreement_advisory_generation",
  "open_property_unit_booking_agreement_generation_source",
  "hash_property_unit_booking_agreement_advisory_content",
  "complete_property_unit_booking_agreement_advisory_generation",
];

let previousIndex = -1;

for (const value of lifecycle) {
  const index = worker.indexOf(value);

  assert.ok(
    index > previousIndex,
    "Invalid worker lifecycle order: " + value,
  );

  previousIndex = index;
}

for (const value of [
  "fail_property_unit_booking_agreement_advisory_generation",
  "createSignedUrl",
  "OPENAI_API_KEY",
  "Authorization",
  "Bearer",
  "store: false",
  "advisoryOnly",
  "lawyerReviewRequired",
]) {
  assert.match(worker, new RegExp(value));
}

assert.doesNotMatch(
  worker,
  /createPayment\s*\(|capturePayment\s*\(|createGatewayOrder\s*\(|approveAgreement\s*\(|signAgreement\s*\(|registerAgreement\s*\(|executeAgreement\s*\(/,
);

for (const value of [
  "buildMobilePropertyBookingAgreementAdvisoryDraftWorkspace",
  "buyer_user_id.eq.",
  "owner_user_id.eq.",
  "draft_content_json",
  "printable_text",
  "privateBoundPartyAccessOnly",
]) {
  assert.match(readAuthority, new RegExp(value));
}

assert.doesNotMatch(
  readAuthority,
  /storage_bucket|storage_path|document_id|ai_request_reference|source_snapshot_sha256/,
);

for (const route of [generateRoute, readRoute]) {
  assert.match(route, /authenticateMobileRequest\(request\)/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /Cookie, Authorization/);
  assert.doesNotMatch(
    route,
    /getSupabaseAdmin|createSignedUrl|OPENAI_API_KEY|api\.openai\.com|\.from\(|\.rpc\(/,
  );
}

assert.match(
  generateRoute,
  /generatePropertyBookingAgreementAdvisoryDraft/,
);
assert.match(
  generateRoute,
  /actorUserId: auth\.user\.id/,
);
assert.match(
  readRoute,
  /buildMobilePropertyBookingAgreementAdvisoryDraftWorkspace/,
);

assert.match(
  requestHelper,
  /timeoutMs = REQUEST_TIMEOUT_MS/,
);
assert.match(
  requestHelper,
  /setTimeout\(\(\) => controller\.abort\(\), timeoutMs\)/,
);

for (const value of [
  "loadPropertyBookingAgreementAdvisoryDraft",
  "generatePropertyBookingAgreementAdvisoryDraft",
  "AGREEMENT_DRAFT_GENERATION_TIMEOUT_MS = 180_000",
  "readinessId: normalizedReadinessId",
]) {
  assert.match(client, new RegExp(value));
}

assert.doesNotMatch(
  client,
  /OPENAI_API_KEY|api\.openai\.com|createSignedUrl|getSupabaseAdmin|storageBucket|storagePath|signedUrl|documentId|buyerUserId|ownerUserId/,
);

for (const value of [
  "PropertyBookingAgreementAdvisoryDraftScreen",
  "Generate advisory agreement draft",
  "Retry advisory draft generation",
  "Advisory-only boundary",
  "Canonical property schedule",
  "Printable advisory text",
  "Private-source protection",
  "qualified lawyer",
]) {
  assert.match(screen, new RegExp(value, "i"));
}

assert.match(screen, /accessibilityRole="progressbar"/);
assert.match(screen, /accessibilityLiveRegion="polite"/);
assert.match(screen, /accessibilityState=/);

assert.doesNotMatch(
  screen,
  /Pay now|Make payment|Sign agreement|Approve agreement|Register agreement|Execute agreement|WebBrowser|Linking\.openURL/i,
);

for (const value of [
  "PropertyBookingAgreementAdvisoryDraftScreen",
  "showAdvisoryDraft",
  "draft_generated",
  "Open advisory drafting workspace",
  "Review private advisory draft",
]) {
  assert.match(readinessScreen, new RegExp(value));
}

for (const path of [
  "lib/mobile/server/property-booking-agreement-draft.ts",
  "lib/mobile/server/property-booking-agreement-draft-read.ts",
  "supabase/migrations/20260924110000_mob_37_property_agreement_advisory_drafts.sql",
  "supabase/migrations/20260924113000_mob_37_property_agreement_draft_preparation.sql",
  "supabase/migrations/20260924120000_mob_37_property_agreement_generation_claim.sql",
  "supabase/migrations/20260924123000_mob_37_property_agreement_generation_source_access.sql",
  "supabase/migrations/20260924130000_mob_37_property_agreement_generation_completion.sql",
  "supabase/migrations/20260924133000_mob_37_property_agreement_generation_failure.sql",
  "supabase/migrations/20260924134500_mob_37_property_agreement_content_hash.sql",
  "scripts/verify-mob-37-property-agreement-advisory-draft.mjs",
]) {
  const escaped = path.replace(
    /[|\\{}()[\]^$+*?.-]/g,
    "\\$&",
  );
  const count = (
    workflow.match(new RegExp(escaped, "g")) || []
  ).length;

  assert.equal(
    count,
    2,
    "Expected CI path twice: " + path,
  );
}

console.log(
  "MOB-37 private advisory agreement-draft, audited-source and lawyer-review assertions passed.",
);
