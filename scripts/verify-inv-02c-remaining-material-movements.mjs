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

const addMaterial = read("app/materials/add/page.tsx");
const inventoryPage = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const panel = read(
  "components/inventory/InventoryTransactionPanel.tsx"
);
const dispatch = read(
  "app/dashboard/vendor/dispatch/page.tsx"
);
const inv02a = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

check(
  addMaterial.includes("post_bos_material_inventory_transaction"),
  "New material inventory must post initial stock through canonical RPC."
);

check(
  addMaterial.includes('"production_receipt"') &&
    addMaterial.includes('"opening_stock"'),
  "Initial stock must distinguish production receipt from ordinary opening stock."
);

check(
  addMaterial.includes("current_stock: 0"),
  "New material listing must start current_stock at zero before canonical initial transaction."
);

check(
  addMaterial.includes("material-initial-stock:"),
  "Initial stock posting must be idempotent."
);

check(
  inventoryPage.includes("InventoryTransactionPanel"),
  "Vendor inventory page must expose canonical human stock updates."
);

for (const marker of [
  "purchase_receipt",
  "customer_return",
  "material_return",
  "damage",
  "loss",
  "stock_adjustment_in",
  "stock_adjustment_out",
  "post_bos_material_inventory_transaction",
  "window.confirm",
]) {
  check(
    panel.includes(marker),
    `Inventory transaction UI marker missing: ${marker}`
  );
}

check(
  dispatch.includes('from("inventory_dispatches")') &&
    !dispatch.includes("post_bos_material_inventory_transaction") &&
    !dispatch.includes("current_stock:"),
  "Dispatch must remain logistics-only to avoid double stock deduction after billing sale."
);

check(
  inv02a.includes("'dispatch'") &&
    inv02a.includes("'sale'"),
  "Unified vocabulary may include dispatch, while current dispatch workflow remains non-mutating."
);

console.log(
  "INV-02C remaining material inventory movement assertions passed."
);
