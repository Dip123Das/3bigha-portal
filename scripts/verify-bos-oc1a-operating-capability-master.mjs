import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260808123000_bos_operating_capability_master.sql"
);

const loaderPath = path.join(
  root,
  "lib/identity/loadOperatingCapabilityProjection.ts"
);

const resolverPath = path.join(
  root,
  "lib/identity/resolveCanonicalIdentity.ts"
);

function read(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(migrationPath, "BOS-OC1A migration");
const loader = read(loaderPath, "Operating capability projection loader");
const resolver = read(resolverPath, "Canonical identity resolver");

for (const marker of [
  "bos_operating_capabilities",
  "identity_bos_operating_capabilities",
  "references public.identity_master(identity_key)",
  "Master admin manages BOS operating capabilities",
  "Master admin manages identity BOS mappings",
]) {
  check(
    migration.includes(marker),
    `BOS-OC1A migration marker missing: ${marker}`
  );
}

for (const capability of [
  "inventory_operations",
  "product_costing",
  "bom",
  "production_operations",
  "project_costing",
  "boq",
  "project_execution",
]) {
  check(
    migration.includes(`'${capability}'`),
    `Initial operating capability missing: ${capability}`
  );
}

check(
  migration.includes(
    "A new identity created later receives NO operating capability"
  ),
  "New identities must default to no implicit operating capability."
);

check(
  !migration.includes("identity_key like '%manufacturer%'"),
  "Operating capability mapping must not infer manufacturer identity by name."
);

check(
  !migration.includes("identity_key like '%builder%'"),
  "Operating capability mapping must not infer builder identity by name."
);

for (const trader of [
  "wholesaler",
  "distributor",
  "dealer",
  "retailer",
  "supplier",
  "stockist",
]) {
  check(
    migration.includes(
      `('${trader}', 'inventory_operations'`
    ),
    `Trading identity must receive inventory: ${trader}`
  );
}

check(
  !migration.includes("('dealer', 'product_costing'"),
  "Dealer must not receive manufacturing costing."
);

check(
  !migration.includes("('distributor', 'boq'"),
  "Distributor must not receive project BOQ."
);

for (const marker of [
  "loadOperatingCapabilityProjection",
  "identity_bos_operating_capabilities",
  "bos_operating_capabilities",
]) {
  check(
    loader.includes(marker),
    `Operating capability loader marker missing: ${marker}`
  );
}

check(
  resolver.includes("operatingProjection"),
  "Canonical identity must expose the operating projection."
);

check(
  resolver.includes("loadOperatingCapabilityProjection"),
  "Canonical identity must resolve operating capabilities from master data."
);

console.log(
  "BOS-OC1A operating capability master assertions passed."
);
