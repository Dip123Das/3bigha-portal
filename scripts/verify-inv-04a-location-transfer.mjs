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
  "supabase/migrations/20260808233000_inv04a_stock_location_transfer.sql"
);
const panel = read(
  "components/inventory/InventoryLocationTransferPanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const foundation = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

for (const marker of [
  "bos_inventory_locations",
  "bos_material_location_allocations",
  "bos_inventory_location_transfers",
  "assign_bos_material_stock_location",
  "transfer_bos_material_between_locations",
]) {
  check(
    migration.includes(marker),
    `INV-04A location-control marker missing: ${marker}`
  );
}

check(
  migration.includes("post_bos_material_inventory_transaction") &&
    migration.includes("'transfer_out'") &&
    migration.includes("'transfer_in'"),
  "Internal transfers must reuse canonical semantic transaction authority."
);

check(
  migration.includes("canonical_after <> canonical_before"),
  "Internal transfer must assert canonical stock total remains unchanged."
);

check(
  migration.includes("for update") &&
    migration.includes("Insufficient stock at source location"),
  "Internal transfer must lock and validate source allocation."
);

check(
  migration.includes("target_quantity > max_assignable"),
  "Location assignment must not exceed canonical stock."
);

for (const marker of [
  "Stock Location Control",
  "Create Location",
  "Save Allocation",
  "Confirm Internal Transfer",
  "transfer_bos_material_between_locations",
  "assign_bos_material_stock_location",
  "window.confirm",
]) {
  check(
    panel.includes(marker),
    `INV-04A UI marker missing: ${marker}`
  );
}

check(
  panel.includes("not another inventory balance") &&
    panel.includes("total stock is unchanged"),
  "Location UI must make subordinate-allocation semantics explicit."
);

check(
  inventory.includes("InventoryLocationTransferPanel"),
  "Vendor Inventory must expose stock location and transfer control."
);

check(
  foundation.includes("'transfer_out'") &&
    foundation.includes("'transfer_in'"),
  "Canonical transaction vocabulary must already contain transfer semantics."
);

console.log(
  "INV-04A stock location & internal transfer assertions passed."
);
