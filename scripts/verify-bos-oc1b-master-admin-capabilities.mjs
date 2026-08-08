import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const componentPath = path.join(
  root,
  "app/admin/dashboard/master-data/identities/OperatingCapabilityMasterSections.tsx"
);

const pagePath = path.join(
  root,
  "app/admin/dashboard/master-data/identities/page.tsx"
);

const resolverPath = path.join(
  root,
  "lib/identity/resolveCanonicalIdentity.ts"
);

function read(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} is missing: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const component = read(componentPath, "BOS-OC1B Master Admin component");
const page = read(pagePath, "Identity Master Admin page");
const resolver = read(resolverPath, "Canonical identity resolver");

for (const marker of [
  "bos_operating_capabilities",
  "identity_bos_operating_capabilities",
  "New identities receive no operating capability",
  "Map capabilities explicitly",
]) {
  check(
    component.includes(marker),
    `BOS-OC1B admin marker missing: ${marker}`
  );
}

check(
  component.includes('placeholder="/dashboard/vendor/inventory"'),
  "Capability route field should expose an existing-route example."
);

check(
  component.includes("Leave blank until a real production page exists"),
  "Master Admin must be warned not to create dead navigation."
);

check(
  page.includes("OperatingCapabilityMasterSections"),
  "Identity Master page must mount the 3BOS capability master."
);

check(
  resolver.includes("operatingProjection"),
  "Canonical identity must continue exposing operatingProjection."
);

console.log(
  "BOS-OC1B Master Admin operating capability assertions passed."
);
