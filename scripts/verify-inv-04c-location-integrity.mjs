import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(
  "supabase/migrations/20260809001500_inv04c_location_allocation_integrity.sql"
);
const panel = read(
  "components/inventory/InventoryLocationIntegrityPanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const locationAware = read(
  "supabase/migrations/20260808235500_inv04b_location_aware_stock_movements.sql"
);

for (const marker of [
  "bos_material_location_integrity",
  "canonical_stock",
  "allocated_stock",
  "allocation_drift",
  "reconcile_bos_material_location_drift",
]) {
  check(
    migration.includes(marker),
    `INV-04C integrity marker missing: ${marker}`
  );
}

check(
  migration.includes("location_allocation_only") &&
    migration.includes("canonical_stock_unchanged"),
  "Location drift reconciliation must explicitly preserve canonical stock."
);

check(
  !migration.includes("update public.material_listings"),
  "INV-04C must never rewrite canonical material stock."
);

check(
  panel.includes("Needs Allocation Review") &&
    panel.includes("Reconcile Allocation") &&
    panel.includes("never changes canonical stock"),
  "INV-04C Human-First integrity UI markers missing."
);

check(
  panel.includes("window.confirm") &&
    panel.includes("reconcile_bos_material_location_drift"),
  "Allocation drift repair must require explicit human confirmation."
);

check(
  inventory.includes("InventoryLocationIntegrityPanel"),
  "Vendor Inventory must expose location allocation integrity control."
);

check(
  locationAware.includes("target_metadata->>'location_id'"),
  "INV-04B location-aware posting must remain intact."
);

console.log(
  "INV-04C location allocation integrity assertions passed."
);
