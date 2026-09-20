import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("lib/mobile/contracts/v1.ts");
const authority = read("lib/mobile/server/trusted-media.ts");
const upload = read("app/api/trusted-media/upload/route.ts");
const targetsRoute = read(
  "app/api/v1/mobile/trusted-media/targets/route.ts",
);
const sessionRoute = read(
  "app/api/v1/mobile/trusted-media/capture-session/route.ts",
);
const locationRoute = read(
  "app/api/v1/mobile/trusted-media/capture-session/[sessionId]/location/route.ts",
);
const attachRoute = read(
  "app/api/v1/mobile/trusted-media/capture-session/[sessionId]/attach/route.ts",
);
const client = read(
  "apps/mobile/src/features/property/trusted-media-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/TrustedMediaCaptureScreen.tsx",
);
const dashboard = read(
  "apps/mobile/src/features/dashboard/DashboardGateway.tsx",
);

for (const value of [
  "MobileTrustedMediaTarget",
  "MobileTrustedMediaTargets",
  "MobileTrustedLocationObservation",
  "MobileTrustedCaptureSession",
  "MobileTrustedCaptureStart",
  "MobileTrustedMediaAsset",
  "MobileTrustedMediaUploadResult",
  "TRUSTED_MEDIA_FAILED",
]) assert.match(contract, new RegExp(value));

assert.match(contract, /galleryMaySatisfyMandatory: false/);
assert.match(contract, /requiredEvidenceRole: "unit_overview"/);
assert.match(contract, /maximumGpsAccuracyMetres/);
assert.match(contract, /reviewGpsAccuracyMetres/);

assert.match(authority, /builder_inventory_units/);
assert.match(authority, /builder_projects/);
assert.match(authority, /builder_profiles/);
assert.match(authority, /owner_user_id/);
assert.match(authority, /requireOwnedProjectUnitTarget/);
assert.match(authority, /attachTrustedMediaAssetToProjectUnit/);
assert.match(authority, /listing_media_assets/);
assert.match(authority, /owner_user_id", ownerUserId/);
assert.match(authority, /listing_entity_type", "project_unit"/);
assert.match(authority, /listing_entity_id", unitId/);
assert.match(authority, /capture_session_id", captureSessionId/);
assert.match(authority, /ASSET_REUSE_FORBIDDEN/);
assert.match(authority, /evaluateTrustedPublication/);
assert.match(authority, /trusted_media_json: nextAssets/);
assert.match(authority, /trusted_publication: trustedPublication/);
assert.match(authority, /trust_status: trustStatus/);
assert.match(
  authority,
  /\.eq\("updated_at", unitResult\.data\.updated_at\)/,
);

for (const route of [
  targetsRoute,
  sessionRoute,
  locationRoute,
  attachRoute,
]) {
  assert.match(route, /authenticateMobileRequest\(request\)/);
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /Cookie, Authorization/);
}

assert.match(
  targetsRoute,
  /buildMobileTrustedMediaTargets\(auth\.user\.id\)/,
);
assert.doesNotMatch(
  targetsRoute,
  /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/,
);
assert.match(sessionRoute, /requireOwnedProjectUnitTarget/);
assert.match(sessionRoute, /createTrustedCaptureSession/);
assert.match(sessionRoute, /entityType: "project_unit"/);
assert.match(
  sessionRoute,
  /getTrustedMediaEvidencePolicy\("project_unit"\)/,
);
assert.match(sessionRoute, /galleryMaySatisfyMandatory: false/);
assert.match(locationRoute, /attachTrustedCaptureLocation/);
assert.match(
  locationRoute,
  /accuracyMetres === null \|\| accuracyMetres <= 0/,
);
assert.match(
  locationRoute,
  /Number\.isNaN\(Date\.parse\(capturedAt\)\)/,
);
assert.match(attachRoute, /attachTrustedMediaAssetToProjectUnit/);
assert.match(attachRoute, /auth\.user\.id/);
assert.match(attachRoute, /sessionId/);

assert.match(upload, /authenticateMobileRequest\(request\)/);
assert.match(upload, /requireOwnedProjectUnitTarget/);
assert.match(
  upload,
  /origin_type: context\.originType \?\? "trusted_web"/,
);
assert.match(upload, /gps_lat_private: session\.requested_lat/);
assert.match(upload, /location_public_precision: "hidden"/);
assert.match(upload, /completeTrustedCaptureSession/);
assert.match(upload, /listing_media_assets/);
assert.match(upload, /listing_moderation_events/);
assert.match(upload, /MAX_IMAGE_BYTES = 8 \* 1024 \* 1024/);

for (const value of [
  "loadTrustedMediaTargets",
  "startTrustedCaptureSession",
  "bindTrustedCaptureLocation",
  "uploadTrustedUnitPhoto",
  "attachTrustedUnitPhoto",
]) assert.match(client, new RegExp(value));

assert.match(client, /originType: "trusted_native"/);
assert.match(
  client,
  /isMandatoryEvidence: input\.evidenceRole === "unit_overview"/,
);
assert.match(
  client,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
);
assert.match(client, /new FormData\(\)/);
assert.match(
  client,
  /canonicalApiUrl\("\/api\/trusted-media\/upload"\)/,
);

assert.match(screen, /export function TrustedMediaCaptureScreen/);
assert.match(screen, /useCameraPermissions/);
assert.match(screen, /Location\.Accuracy\.Highest/);
assert.match(screen, /point\.mocked === true/);
assert.match(screen, /locationAgeMs > 120_000/);
assert.match(screen, /facing="back"/);
assert.match(screen, /takePictureAsync/);
assert.match(screen, /accessibilityRole="radio"/);
assert.match(screen, /accessibilityLiveRegion="assertive"/);
assert.match(screen, /Precise GPS is stored privately/);
assert.match(screen, /public image does not disclose/);
assert.doesNotMatch(
  screen,
  /DocumentPicker|ImagePicker|launchImageLibrary|recordAsync/,
);

assert.match(
  dashboard,
  /import \{ TrustedMediaCaptureScreen \}/,
);
assert.match(dashboard, /showTrustedCapture/);
assert.match(
  dashboard,
  /label="Capture Trusted Unit Photos"/,
);
assert.match(
  dashboard,
  /workspace\.access\.canManageBuilderProjects &&/,
);

const mobileBoundary = [
  contract,
  authority,
  targetsRoute,
  sessionRoute,
  locationRoute,
  attachRoute,
  client,
  screen,
  dashboard,
].join("\n");

assert.doesNotMatch(
  mobileBoundary,
  /property_project_legal_documents|property_unit_legal|property-documents-private|createSignedUrl|signedUrl/i,
);
assert.doesNotMatch(
  [client, screen].join("\n"),
  /gallery_media|launchImageLibrary|recordAsync|mediaTypes.*video/i,
);

console.log(
  "MOB-29 native trusted-photo and private GPS capture assertions passed.",
);
