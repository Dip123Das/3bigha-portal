import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("lib/mobile/contracts/v1.ts");
const canonicalTypes = read(
  "lib/trusted-media/trusted-media-types.ts",
);
const upload = read("app/api/trusted-media/upload/route.ts");
const authority = read("lib/mobile/server/trusted-media.ts");
const client = read(
  "apps/mobile/src/features/property/trusted-media-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/TrustedMediaCaptureScreen.tsx",
);
const migration = read(
  "supabase/migrations/20260920170000_mob_30_trusted_video_storage.sql",
);

for (const value of [
  "unit_walkthrough_video",
  "MobileTrustedMediaKind",
  "MobileTrustedVideoPolicy",
  "maximumDurationSeconds: 45",
  "maximumBytes: 83886080",
  "galleryMaySatisfyVideo: false",
  "recordsAudio: false",
  "durationMs",
]) {
  assert.match(contract, new RegExp(value));
}

assert.match(canonicalTypes, /\| "unit_walkthrough_video"/);

assert.match(migration, /file_size_limit = 83886080/);
assert.match(migration, /'video\/mp4'/);
assert.match(migration, /'video\/quicktime'/);
assert.doesNotMatch(migration, /public\s*=\s*true/i);

for (const value of [
  "unit_walkthrough_video",
  "mediaKind",
  "durationMs",
  "recordsAudio",
  "UNIVERSAL_MEDIA_LIMITS.maxVideoSize",
  "ACCEPTED_VIDEO_TYPES",
  "ACCEPTED_TRUSTED_VIDEO_TYPES",
]) {
  assert.match(upload, new RegExp(value));
}

assert.match(
  upload,
  /context\.evidenceRole !== "unit_walkthrough_video"/,
);
assert.match(
  upload,
  /Trusted property video must be recorded without audio/,
);
assert.match(
  upload,
  /Trusted video cannot replace the mandatory live photograph/,
);
assert.match(
  upload,
  /public_derivative_path: isVideo \? null : publicObjectPath/,
);
assert.match(
  upload,
  /isVideo\s*\|\|[\s\S]*?\?\s*"review_required"/,
);
assert.match(upload, /isVideo\s*\?\s*"verification_pending"/);

assert.match(authority, /VIDEO_REQUIRES_PHOTO/);
assert.match(authority, /duration_ms/);
assert.match(
  authority,
  /isVideo && evidenceRole !== "unit_walkthrough_video"/,
);
assert.match(
  authority,
  /Capture and attach the required trusted unit photograph before adding a walkthrough video/,
);
assert.match(authority, /kind === "image"/);
assert.match(authority, /role === "unit_overview"/);
assert.match(
  authority,
  /bucket: isVideo \? "" : publicBucket/,
);
assert.match(
  authority,
  /path: isVideo \? "" : publicPath/,
);
assert.match(
  authority,
  /const publicationEvidence = isVideo/,
);

for (const value of [
  "uploadTrustedUnitVideo",
  "attachTrustedUnitVideo",
  'evidenceRole: "unit_walkthrough_video"',
  "isMandatoryEvidence: false",
  'mediaKind: "video"',
  "recordsAudio: input.video.recordsAudio",
  'body.asset.kind !== "video"',
  'body.asset.lifecycleStatus !== "verification_pending"',
]) {
  assert.match(client, new RegExp(value));
}

assert.match(
  client,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
);
assert.match(client, /120_000/);

const videoFlowStart = screen.indexOf(
  "async function recordAndUploadVideo()",
);
const stopFlowStart = screen.indexOf(
  "function stopVideoRecording()",
);
assert.ok(videoFlowStart >= 0);
assert.ok(stopFlowStart > videoFlowStart);
const videoFlow = screen.slice(videoFlowStart, stopFlowStart);

assert.match(videoFlow, /existingAssetCount === 0/);
assert.match(videoFlow, /locationAgeMs > 120_000/);
assert.match(videoFlow, /recordAsync/);
assert.match(videoFlow, /maxDuration: 45/);
assert.match(videoFlow, /maxFileSize: 80 \* 1024 \* 1024/);
assert.match(videoFlow, /durationMs < 5_000/);
assert.match(videoFlow, /durationMs > 47_000/);
assert.match(videoFlow, /recordsAudio: false/);
assert.match(videoFlow, /uploadTrustedUnitVideo/);
assert.match(videoFlow, /attachTrustedUnitVideo/);

assert.match(screen, /camera\.current\?\.stopRecording\(\)/);
assert.match(
  screen,
  /mode=\{prepared\.mode === "video" \? "video" : "picture"\}/,
);
assert.match(screen, /\r?\n\s*mute\r?\n/);
assert.match(screen, /videoQuality="720p"/);
assert.match(screen, /LIVE SILENT GPS-BOUND VIDEO/);
assert.match(
  screen,
  /Record 5–45 seconds\. Audio is disabled/,
);
assert.match(screen, /Record private silent walkthrough/);
assert.match(screen, /selected\.existingAssetCount > 0/);
assert.match(screen, /Videos are recorded without audio/);
assert.match(
  screen,
  /cannot\s+replace the required trusted photograph/,
);

const nativeBoundary = [client, screen].join("\n");
assert.doesNotMatch(
  nativeBoundary,
  /DocumentPicker|ImagePicker|launchImageLibrary|gallery_media/i,
);
assert.doesNotMatch(nativeBoundary, /recordsAudio:\s*true/);
assert.doesNotMatch(
  nativeBoundary,
  /property_project_legal_documents|property_unit_legal|property-documents-private|createSignedUrl|signedUrl/i,
);

assert.doesNotMatch(
  authority,
  /url: privateUrl|bucket: privateBucket|path: privatePath/,
);

console.log(
  "MOB-30 native silent trusted-video and private GPS assertions passed.",
);
