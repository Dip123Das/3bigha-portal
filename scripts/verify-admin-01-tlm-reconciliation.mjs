import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ADMIN-01 TLM verification failed: ${message}`);
  }
}

const migration = read(
  "supabase/migrations/20260822000100_trusted_listing_media_foundation.sql",
);
for (const authority of [
  "trusted_capture_sessions",
  "listing_media_assets",
  "listing_media_verifications",
  "listing_moderation_events",
]) {
  assert(migration.includes(authority), `missing database authority: ${authority}`);
}
assert(
  migration.includes("enable row level security"),
  "trusted media tables must enable RLS",
);

for (const routePath of [
  "app/api/trusted-media/capture-session/route.ts",
  "app/api/trusted-media/capture-session/[sessionId]/location/route.ts",
  "app/api/trusted-media/capture-session/[sessionId]/complete/route.ts",
  "app/api/trusted-media/upload/route.ts",
]) {
  const route = read(routePath);
  assert(
    route.includes("auth.getUser()"),
    `trusted route must authenticate canonically: ${routePath}`,
  );
  assert(
    !route.includes("auth.getSession()"),
    `trusted route must not trust getSession: ${routePath}`,
  );
}

const uploadRoute = read("app/api/trusted-media/upload/route.ts");
for (const requirement of [
  'const PRIVATE_BUCKET = "listing-evidence-private"',
  "createHash",
  'origin_type: context.originType ?? "trusted_web"',
  "completeTrustedCaptureSession",
  'eventType: "trusted_upload_completed"',
]) {
  assert(uploadRoute.includes(requirement), `trusted upload requirement missing: ${requirement}`);
}

const uploader = read("app/components/media/UniversalMediaUploader.tsx");
for (const requirement of [
  'fetch("/api/trusted-media/capture-session"',
  "/location`",
  "executeMediaUpload",
  'isTrustedCapture ? "trusted" : "standard"',
  "captureSession.nonce",
]) {
  assert(uploader.includes(requirement), `production uploader integration missing: ${requirement}`);
}

const publication = read("lib/media/trusted-publication-server.ts");
for (const requirement of [
  'import "server-only"',
  '.from("listing_media_assets")',
  '.from("trusted_capture_sessions")',
  "loadCanonicalTrustedAssets",
]) {
  assert(publication.includes(requirement), `canonical publication gate missing: ${requirement}`);
}

console.log("ADMIN-01 Trusted Listing Media reconciliation assertions passed.");
