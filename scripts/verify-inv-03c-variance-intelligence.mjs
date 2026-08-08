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

const panel = read(
  "components/inventory/InventoryVarianceIntelligencePanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const reconciliation = read(
  "supabase/migrations/20260808224500_inv03b_stock_reconciliation.sql"
);

for (const marker of [
  'from("bos_inventory_stock_counts")',
  "Match Rate",
  "Mismatch Rate",
  "Reconciled Counts",
  "Items to Watch",
  "Avg Variance %",
  "Reliability",
  "No stock is adjusted from this panel",
]) {
  check(
    panel.includes(marker),
    `INV-03C variance intelligence marker missing: ${marker}`
  );
}

check(
  !panel.includes("post_bos_material_inventory_transaction") &&
    !panel.includes("reconcile_bos_material_stock_count") &&
    !panel.includes("update("),
  "Variance intelligence must remain read-only."
);

check(
  panel.includes('"High"') &&
    panel.includes('"Watch"') &&
    panel.includes('"Low"'),
  "Variance intelligence must classify advisory reliability."
);

check(
  inventory.includes("InventoryVarianceIntelligencePanel"),
  "Vendor Inventory must expose variance intelligence."
);

check(
  reconciliation.includes("bos_inventory_stock_counts") &&
    reconciliation.includes("variance") &&
    reconciliation.includes("reconciliation_transaction_id"),
  "INV-03B physical count evidence must remain the source for INV-03C."
);

console.log(
  "INV-03C inventory variance intelligence assertions passed."
);
