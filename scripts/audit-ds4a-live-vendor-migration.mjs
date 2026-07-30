import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/dashboard/vendor/page.tsx");
const previewPath = path.join(root, "app/dashboard/vendor/business-os-preview/page.tsx");
const adapterPath = path.join(root, "lib/3bos/projections/create-vendor-business-os-projection.ts");
const rendererPath = path.join(root, "components/3bos/framework/BusinessOsRenderer.tsx");

for (const file of [pagePath, previewPath, adapterPath, rendererPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`DS-4A required file missing: ${path.relative(root, file)}`);
  }
}

const source = fs.readFileSync(pagePath, "utf8");

for (const assertion of [
  "// HUMAN_FIRST_VENDOR_DASHBOARD_RETURN",
  "DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY",
  "/dashboard/vendor/business-os-preview",
  "<WorkspaceHome",
  "<GlobalAiOperationalStatus",
  "<OperationalRecoveryFeed",
  "Start your daily vendor work here",
  "VendorErpNav",
  "VendorOperationStream",
]) {
  if (!source.includes(assertion)) {
    throw new Error(`DS-4A Vendor migration assertion failed: ${assertion}`);
  }
}

const liveIndex = source.indexOf("// HUMAN_FIRST_VENDOR_DASHBOARD_RETURN");
const entryIndex = source.indexOf("DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY", liveIndex);
const workspaceIndex = source.indexOf("<WorkspaceHome", liveIndex);

if (liveIndex < 0 || entryIndex < 0 || workspaceIndex < 0 || entryIndex > workspaceIndex) {
  throw new Error("Business OS preview entry is not positioned safely before live WorkspaceHome.");
}

const markerCount = source.split("DS4A_LIVE_BUSINESS_OS_PREVIEW_ENTRY").length - 1;
if (markerCount !== 1) {
  throw new Error(`Expected one DS-4A preview entry marker, found ${markerCount}.`);
}

console.log("DS-4A live Vendor migration audit assertions passed.");
console.log("Legacy Vendor workspace preserved.");
console.log("Controlled Business OS preview entry exposed.");
