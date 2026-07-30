import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adapterPath = path.join(
  root,
  "lib/3bos/projections/create-vendor-business-os-projection.ts",
);

if (!fs.existsSync(adapterPath)) {
  throw new Error("Missing Vendor Business OS projection adapter.");
}

const source = fs.readFileSync(adapterPath, "utf8");

for (const assertion of [
  "createVendorBusinessOsProjection",
  "BusinessOsProjection",
  "workNow:",
  "journey:",
  "priorities:",
  "pulse:",
  "assistance:",
  "mobileNavigation:",
  "Unread vendor alerts",
  "Buyer conversations",
  "Assigned RFQs",
]) {
  if (!source.includes(assertion)) {
    throw new Error(`Vendor projection assertion failed: ${assertion}`);
  }
}

if (source.includes("use client")) {
  throw new Error("Vendor projection adapter must remain a pure server-safe function.");
}

console.log("DS-3B.2 Vendor projection adapter assertions passed.");
