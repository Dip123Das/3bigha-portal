import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const migration = read(
  "supabase/migrations/20260921100000_mob_31_property_legal_review_access.sql",
);
const contract = read("lib/mobile/contracts/v1.ts");
const authority = read("lib/mobile/server/property-legal-review.ts");
const buyerRoute = read(
  "app/api/v1/mobile/property-legal-review/route.ts",
);
const decisionRoute = read(
  "app/api/v1/mobile/property-legal-review/[requestId]/decision/route.ts",
);
const accessRoute = read(
  "app/api/v1/mobile/property-legal-review/[requestId]/documents/[documentId]/access/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/legal-review-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyLegalReviewScreen.tsx",
);
const discovery = read(
  "apps/mobile/src/features/property/PropertyDiscoveryScreen.tsx",
);
const workflow = read(".github/workflows/mobile-foundation.yml");

for (const value of [
  "property_unit_legal_review_requests",
  "property_legal_review_access_events",
  "buyer_consent_at",
  "decision_note",
  "expires_at",
  "revoked_at",
  "document_viewed",
]) {
  assert.match(migration, new RegExp(value));
}

assert.match(
  migration,
  /where status in \('requested', 'granted'\)/,
);
assert.match(migration, /enable row level security/);
assert.match(
  migration,
  /revoke all[\s\S]*?from public, anon, authenticated/,
);
assert.match(migration, /to service_role/);
assert.doesNotMatch(
  migration,
  /signed_url|access_url|storage_path/i,
);

for (const value of [
  "PROPERTY_LEGAL_REVIEW_FAILED",
  "MobilePropertyLegalReviewStatus",
  "MobilePropertyLegalReviewRequest",
  "MobilePropertyLegalReviewDocument",
  "MobilePropertyLegalReviewWorkspace",
  "MobilePropertyLegalReviewDecision",
  "MobilePropertyLegalDocumentAccess",
]) {
  assert.match(contract, new RegExp(value));
}

assert.match(contract, /accessUrl: string/);
assert.match(contract, /expiresAt: string/);
assert.doesNotMatch(
  contract,
  /storagePath|storageBucket|privateBucket|privatePath/,
);

for (const value of [
  "MOBILE_PROPERTY_LEGAL_CONSENT_VERSION",
  "buildMobilePropertyLegalReviewWorkspace",
  "requestMobilePropertyLegalReview",
  "decideMobilePropertyLegalReview",
  "createMobilePropertyLegalDocumentAccess",
  "SELF_REVIEW_FORBIDDEN",
  "REQUEST_ALREADY_ACTIVE",
  "OWNER_REQUIRED",
  "DECISION_CONFLICT",
  "ACCESS_FORBIDDEN",
  "SIGNED_ACCESS_FAILED",
]) {
  assert.match(authority, new RegExp(value));
}

assert.match(authority, /property-legal-review-v1/);
assert.match(authority, /\.eq\("trust_status", "verified"\)/);
assert.match(authority, /\.eq\("status", "active"\)/);
assert.match(authority, /\.eq\("is_active", true\)/);
assert.match(authority, /48 \* 60 \* 60 \* 1000/);
assert.match(
  authority,
  /createSignedUrl\([\s\S]{0,240}, 60\)/,
);
assert.match(authority, /eventKind: "document_viewed"/);
assert.match(authority, /signedUrlTtlSeconds: 60/);
assert.match(authority, /property_unit_legal_document_links/);
assert.match(authority, /property_project_legal_documents/);

for (const route of [buyerRoute, decisionRoute, accessRoute]) {
  assert.match(route, /authenticateMobileRequest\(request\)/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /Cookie, Authorization/);
  assert.doesNotMatch(
    route,
    /getSupabaseAdmin|\.from\(|createSignedUrl/,
  );
}

assert.match(
  buyerRoute,
  /buildMobilePropertyLegalReviewWorkspace/,
);
assert.match(
  buyerRoute,
  /requestMobilePropertyLegalReview/,
);
assert.match(
  decisionRoute,
  /decideMobilePropertyLegalReview/,
);
assert.match(
  accessRoute,
  /createMobilePropertyLegalDocumentAccess/,
);

for (const value of [
  "loadPropertyLegalReview",
  "requestPropertyLegalReview",
  "decidePropertyLegalReview",
  "createPropertyLegalDocumentAccess",
  "PROPERTY_LEGAL_REVIEW_CONSENT_VERSION",
]) {
  assert.match(client, new RegExp(value));
}

assert.doesNotMatch(
  client,
  /property-documents-private|storage_path|createSignedUrl/,
);

assert.match(screen, /consentAccepted/);
assert.match(screen, /Send legal-review request/);
assert.match(screen, /Grant for 48 hours/);
assert.match(screen, /Decline request/);
assert.match(screen, /Revoke confidential access/);
assert.match(screen, /Open audited 60-second view/);
assert.match(
  screen,
  /WebBrowser\.openBrowserAsync\(access\.accessUrl\)/,
);
assert.match(screen, /accessibilityRole="checkbox"/);
assert.match(
  screen,
  /accessibilityState=\{\{ checked: consentAccepted \}\}/,
);
assert.doesNotMatch(
  screen,
  /property-documents-private|storage_path|createSignedUrl/,
);

assert.match(discovery, /PropertyLegalReviewScreen/);
assert.match(discovery, /reviewUnitId/);
assert.match(discovery, /Review confidential legal papers/);
assert.match(
  discovery,
  /Private legal papers are never loaded into public discovery/,
);
assert.doesNotMatch(
  discovery,
  /property-documents-private|storage_path|createSignedUrl|property_project_legal_documents|property_unit_legal_document_links/,
);

for (const path of [
  "app/api/v1/mobile/property-legal-review/**",
  "lib/mobile/server/property-legal-review.ts",
  "supabase/migrations/20260921100000_mob_31_property_legal_review_access.sql",
  "scripts/verify-mob-31-property-legal-review.mjs",
]) {
  const count = workflow.split(path).length - 1;
  assert.equal(
    count,
    2,
    "Workflow path must cover pull requests and main pushes: " + path,
  );
}

console.log(
  "MOB-31 confidential property legal-review and audited-access assertions passed.",
);
