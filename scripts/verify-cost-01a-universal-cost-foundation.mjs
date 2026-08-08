import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260808143000_universal_cost_execution_foundation.sql"
);
const libPath = path.join(
  root,
  "lib/cost-execution/cost-foundation.ts"
);
const sellerInventoryPath = path.join(
  root,
  "app/dashboard/vendor/inventory/page.tsx"
);
const builderInventoryPath = path.join(
  root,
  "app/property/builder/projects/[projectId]/units/page.tsx"
);
const calculatorPath = path.join(
  root,
  "components/construction-cost/ConstructionCostCalculator.tsx"
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

const migration = read(migrationPath, "COST-01A v2 migration");
const foundation = read(libPath, "COST-01A v2 library");
const sellerInventory = read(sellerInventoryPath, "Existing seller inventory");
const builderInventory = read(builderInventoryPath, "Existing builder unit inventory");
const calculator = read(calculatorPath, "Existing construction calculator");

for (const marker of [
  "bos_cost_plans",
  "bos_cost_centres",
  "bos_cost_plan_sections",
  "bos_cost_plan_lines",
  "bos_cost_entries",
  "bos_cost_outputs",
  "bos_cost_plan_revisions",
]) {
  check(migration.includes(marker), `Missing cost inventory table: ${marker}`);
}

for (const costType of [
  "raw_material",
  "wages",
  "electricity",
  "fuel",
  "rental",
  "professional_fee",
  "subcontract",
  "transport",
  "overhead",
]) {
  check(
    migration.includes(`'${costType}'`),
    `Production/project cost type missing: ${costType}`
  );
}

for (const entryType of [
  "purchase",
  "wage",
  "electricity",
  "fuel",
  "rental",
  "service",
  "transport",
  "overhead",
]) {
  check(
    migration.includes(`'${entryType}'`),
    `Actual expenditure register type missing: ${entryType}`
  );
}

for (const outputType of [
  "finished_good",
  "apartment",
  "land_plot",
  "shop",
  "office",
  "commercial_unit",
]) {
  check(
    migration.includes(`'${outputType}'`),
    `Finished output type missing: ${outputType}`
  );
}

check(
  migration.includes("'seller_material_inventory'") &&
    migration.includes("'builder_property_unit_inventory'"),
  "Finished production must have explicit transfer destinations."
);

check(
  foundation.includes("calculateUnitProductionCost"),
  "Unit production cost calculator missing."
);

check(
  foundation.includes("targetInventoryForOutput"),
  "Finished-output inventory routing helper missing."
);

check(
  foundation.includes('"construction_cost_calculator"'),
  "Builder project costing must reuse the existing construction calculator."
);

check(
  sellerInventory.includes('from("material_listings")'),
  "Existing seller inventory connection changed unexpectedly."
);

check(
  builderInventory.includes('from("builder_projects")'),
  "Existing builder project inventory connection changed unexpectedly."
);

for (const feature of [
  "BoqPreviewTable",
  "MaterialEstimatePreview",
  "ProcurementPhaseScheduler",
  "ConstructionAutoRfqPanel",
]) {
  check(
    calculator.includes(feature),
    `Existing construction calculator feature missing: ${feature}`
  );
}

console.log(
  "COST-01A v2 production/project cost inventory assertions passed."
);
