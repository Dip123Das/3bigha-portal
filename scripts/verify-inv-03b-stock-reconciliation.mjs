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
  "supabase/migrations/20260808224500_inv03b_stock_reconciliation.sql"
);
const panel = read(
  "components/inventory/InventoryReconciliationPanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const foundation = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

for (const marker of [
  "bos_inventory_stock_counts",
  "create_bos_material_stock_count",
  "reconcile_bos_material_stock_count",
  "system_stock",
  "physical_stock",
  "variance",
  "reconciliation_transaction_id",
]) {
  check(
    migration.includes(marker),
    `INV-03B reconciliation marker missing: ${marker}`
  );
}

check(
  migration.includes("post_bos_material_inventory_transaction") &&
    migration.includes("'stock_adjustment_in'") &&
    migration.includes("'stock_adjustment_out'"),
  "Reconciliation must delegate stock changes to canonical inventory authority."
);

check(
  migration.includes("for update") &&
    migration.includes("variance_now := count_row.physical_stock - current_stock"),
  "Reconciliation must recalculate variance against current stock under lock."
);

check(
  migration.includes("'stock-reconciliation:' || count_row.id::text"),
  "Reconciliation adjustment must be idempotent."
);

check(
  migration.includes("Members manage own material stock counts") &&
    migration.includes("vendor_user_id = auth.uid()"),
  "Physical counts must remain protected by ownership RLS."
);

for (const marker of [
  "Physical Stock Audit",
  "Record Physical Count",
  "Reconcile",
  "window.confirm",
  "create_bos_material_stock_count",
  "reconcile_bos_material_stock_count",
]) {
  check(
    panel.includes(marker),
    `INV-03B UI marker missing: ${marker}`
  );
}

check(
  panel.includes("never writes stock directly"),
  "Human UI must explicitly preserve canonical stock authority."
);

check(
  inventory.includes("InventoryReconciliationPanel"),
  "Vendor Inventory must expose physical count reconciliation."
);

check(
  foundation.includes("post_bos_material_inventory_transaction"),
  "INV-02 canonical transaction authority must remain intact."
);

console.log(
  "INV-03B physical stock reconciliation assertions passed."
);
