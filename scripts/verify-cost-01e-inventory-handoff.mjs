import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260808170000_cost_inventory_handoff.sql"
  ),
  "utf8"
);

const handoff = fs.readFileSync(
  path.join(root, "lib/cost-execution/inventory-handoff.ts"),
  "utf8"
);

const panel = fs.readFileSync(
  path.join(
    root,
    "components/cost-execution/FinishedOutputHandoffPanel.tsx"
  ),
  "utf8"
);

const sellerInventory = fs.readFileSync(
  path.join(root, "app/dashboard/vendor/inventory/page.tsx"),
  "utf8"
);

const builderAddUnit = fs.readFileSync(
  path.join(
    root,
    "app/property/builder/projects/[projectId]/units/add/page.tsx"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "bos_cost_inventory_handoffs",
  "idempotency_key",
  "seller_material_inventory",
  "builder_property_unit_inventory",
  "'prepared'",
  "'opened'",
  "'confirmed'",
]) {
  check(
    migration.includes(marker),
    `COST-01E handoff marker missing: ${marker}`
  );
}

check(
  handoff.includes("/materials/add?inventory=1&source=cost_output"),
  "Manufacturer handoff must reuse the existing seller inventory creation flow."
);

check(
  handoff.includes("/property/builder/projects/") &&
    handoff.includes("/units/add?source=cost_output"),
  "Builder handoff must reuse the existing builder unit creation flow."
);

check(
  handoff.includes("handoffNeedsHumanConfirmation"),
  "Inventory handoff must require human confirmation."
);

check(
  panel.includes("Nothing is added automatically"),
  "Human confirmation wording is required."
);

check(
  panel.includes("non_sellable_project_asset"),
  "Non-sellable project infrastructure must not enter inventory."
);

check(
  sellerInventory.includes('from("material_listings")'),
  "Existing seller inventory must remain material_listings-backed."
);

check(
  builderAddUnit.includes("BuilderAddUnitWizardPage"),
  "Existing builder unit wizard must remain the destination flow."
);

console.log(
  "COST-01E finished-output inventory handoff assertions passed."
);
