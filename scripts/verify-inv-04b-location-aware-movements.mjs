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
  "supabase/migrations/20260808235500_inv04b_location_aware_stock_movements.sql"
);
const panel = read(
  "components/inventory/InventoryTransactionPanel.tsx"
);
const locationFoundation = read(
  "supabase/migrations/20260808233000_inv04a_stock_location_transfer.sql"
);
const canonicalFoundation = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

check(
  migration.includes(
    "create or replace function public.post_bos_material_inventory_transaction"
  ),
  "INV-04B must extend the existing canonical posting RPC."
);

for (const marker of [
  "target_metadata->>'location_id'",
  "bos_material_location_allocations",
  "location_quantity_before",
  "location_quantity_after",
  "Insufficient stock at selected location",
]) {
  check(
    migration.includes(marker),
    `INV-04B location-aware posting marker missing: ${marker}`
  );
}

check(
  migration.includes("on conflict (material_listing_id, location_id)") &&
    migration.includes("updated_at = now()"),
  "Canonical posting must atomically synchronize the selected location allocation."
);

check(
  panel.includes('from("bos_inventory_locations")') &&
    panel.includes('from("bos_material_location_allocations")'),
  "Human stock update panel must load physical locations and allocations."
);

check(
  panel.includes("location_id: locationId") &&
    panel.includes("Choose physical location"),
  "Human stock updates must pass selected physical location through canonical metadata."
);

check(
  panel.includes("selectedLocationStock < qty"),
  "Location-aware stock-out must warn before attempting an impossible location deduction."
);

check(
  locationFoundation.includes("bos_inventory_locations") &&
    locationFoundation.includes("bos_material_location_allocations"),
  "INV-04A location foundation must remain intact."
);

check(
  canonicalFoundation.includes("post_bos_material_inventory_transaction"),
  "INV-02 canonical stock authority must remain the same posting API."
);

console.log(
  "INV-04B location-aware canonical stock movement assertions passed."
);
