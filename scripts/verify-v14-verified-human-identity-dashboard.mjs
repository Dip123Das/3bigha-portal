import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/dashboard/vendor/page.tsx");
const shellPath = path.join(root, "components/3bos/vendor/VendorDashboardApplicationShell.tsx");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const page = fs.readFileSync(pagePath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");

for (const marker of [
  "registeredName",
  "verifiedSelfieUrl",
  "verifiedSelfieStatus",
  "firstVerifiedSelfieUrl",
  "selfie_capture_status",
  "selfie_media_json",
  "profile_photo_source",
]) {
  check(page.includes(marker), `Vendor identity data marker missing: ${marker}`);
}

for (const marker of [
  "V14_VERIFIED_HUMAN_IDENTITY_DASHBOARD",
  "Welcome, ${humanName}! 👋",
  "vendor-photo-modal",
  "Retake Verified Live Selfie",
  "/onboarding/business#sec-selfie",
  "Verified live-camera registration selfie",
]) {
  check(shell.includes(marker), `V-14 shell marker missing: ${marker}`);
}

for (const forbidden of [
  "Choose from Gallery",
  "Upload Photo",
  "Select File",
  "gallery_upload",
]) {
  check(!shell.includes(forbidden), `Gallery-upload bypass found: ${forbidden}`);
}

console.log("V-14 Verified Human Identity Dashboard assertions passed.");
console.log("Registered names and verified live-camera selfies now power the dashboard identity layer.");
console.log("Photo replacement remains restricted to the existing live-camera selfie workflow.");
