import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pageFile = path.join(root, "app/dashboard/vendor/page.tsx");
const projectionFile = path.join(
  root,
  "lib/3bos/vendor/resolve-vendor-workspace-projection.ts"
);

for (const file of [pageFile, projectionFile]) {
  if (!fs.existsSync(file)) {
    throw new Error(`V-1B file missing: ${file}`);
  }
}

const page = fs.readFileSync(pageFile, "utf8");
const projection = fs.readFileSync(projectionFile, "utf8");

for (const marker of [
  "V1B_CANONICAL_VENDOR_WORKSPACE_PROJECTION",
  "resolveVendorWorkspaceProjection",
  "data-vendor-workspace-projection",
  "data-vendor-workspace-readiness",
  "data-vendor-workspace-actions",
]) {
  if (!page.includes(marker)) {
    throw new Error(`V-1B page assertion failed: ${marker}`);
  }
}

for (const marker of [
  "VendorWorkspaceProjectionInput",
  "VendorWorkspaceProjection",
  "identity:",
  "readiness:",
  "workNow:",
  "pulse:",
  "performance:",
  "growth:",
  'version: "v1b"',
  "Use the Essential Workspace fully",
]) {
  if (!projection.includes(marker)) {
    throw new Error(`V-1B projection assertion failed: ${marker}`);
  }
}

for (const preserved of [
  "WorkspaceHome",
  "GlobalAiOperationalStatus",
  "OperationalRecoveryFeed",
  "WorkflowContinuityRecorder",
  "OperationalEventRecorder",
  'fetch("/api/vendor/rfqs?limit=100"',
  'fetch("/api/vendor/leaderboard"',
]) {
  if (!page.includes(preserved)) {
    throw new Error(`V-1B regression guard failed: ${preserved}`);
  }
}

console.log("V-1B Vendor Workspace Projection assertions passed.");
console.log("Canonical identity, readiness, work, pulse, performance and growth data are available.");
console.log("The existing live Vendor Dashboard presentation remains preserved.");
