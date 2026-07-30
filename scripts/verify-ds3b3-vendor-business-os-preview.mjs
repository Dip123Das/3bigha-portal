import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const previewPath = path.join(
  root,
  "app/dashboard/vendor/business-os-preview/page.tsx",
);

if (!fs.existsSync(previewPath)) {
  throw new Error("Missing controlled Vendor Business OS preview route.");
}

const source = fs.readFileSync(previewPath, "utf8");

for (const assertion of [
  'data-vendor-business-os-preview="true"',
  "BusinessOsRenderer",
  "createVendorBusinessOsProjection",
  "/api/vendor/rfqs",
  "/api/vendor/notifications",
  "/api/vendor/price-updates",
  "/api/vendor/performance",
  "Refresh live data",
  "Return to current dashboard",
  "existing Vendor Dashboard remains unchanged",
]) {
  if (!source.includes(assertion)) {
    throw new Error(`Vendor Business OS preview assertion failed: ${assertion}`);
  }
}

const legacyPath = path.join(root, "app/dashboard/vendor/page.tsx");
if (!fs.existsSync(legacyPath)) {
  throw new Error("Existing Vendor Dashboard route is missing.");
}

const legacySource = fs.readFileSync(legacyPath, "utf8");
if (!legacySource.includes("HUMAN_FIRST_VENDOR_DASHBOARD_RETURN")) {
  throw new Error("Existing Vendor Dashboard safety marker was not preserved.");
}

console.log("DS-3B.3 controlled Vendor Business OS preview assertions passed.");
