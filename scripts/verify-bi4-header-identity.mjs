import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const header = fs.readFileSync(
  path.join(root, "components/layout/TopHeaderClient.tsx"),
  "utf8"
);
const resolver = fs.readFileSync(
  path.join(root, "lib/identity/resolveCanonicalIdentity.ts"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "resolveCanonicalIdentity",
  "loadCanonicalAccountIdentity",
  "identity.registeredName",
  "identity.verifiedSelfie",
  "identity.verifiedSelfieUrl",
  "identity.primaryRole",
  "identity.workspaceProjection.defaultPath",
  "Retake Verified Live Selfie",
]) {
  check(header.includes(marker), `Header marker missing: ${marker}`);
}

for (const marker of [
  "loadAccountIdentity",
  "resolveDashboardHrefForUser",
  "firstHeaderSelfieUrl",
  "headerRoleLabel",
  '.from("profiles")',
  '.from("business_profiles")',
  "Change Profile Photo",
]) {
  check(!header.includes(marker), `Duplicate header logic remains: ${marker}`);
}

for (const marker of [
  "resolveDefaultWorkspacePath",
  'return "/admin/dashboard"',
  'return "/dashboard/banker"',
  'return "/dashboard/vendor"',
  'return "/dashboard"',
  'unifiedPath: "/dashboard/workspace"',
]) {
  check(resolver.includes(marker), `Workspace marker missing: ${marker}`);
}

console.log("BI-4 canonical header identity assertions passed.");
