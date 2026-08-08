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

const history = read(
  "components/inventory/InventoryTransactionHistoryPanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const ledger = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

check(
  history.includes('from("bos_inventory_transactions")') &&
    history.includes('from("bos_inventory_transaction_types")'),
  "INV-03A history must read canonical transaction ledger and type master."
);

for (const marker of [
  "stock_before",
  "stock_after",
  "source_module",
  "source_reference_type",
  "source_reference_id",
  "occurred_at",
  "note",
  "Stock Transaction History",
  "Inventory Audit Trail",
]) {
  check(
    history.includes(marker),
    `INV-03A audit marker missing: ${marker}`
  );
}

check(
  history.includes("read-only audit view"),
  "Transaction history must remain explicitly read-only."
);

check(
  inventory.includes("InventoryTransactionHistoryPanel"),
  "Vendor Inventory must expose inventory transaction history."
);

check(
  ledger.includes("Members read own inventory transactions") &&
    ledger.includes("user_id = auth.uid()"),
  "Transaction history must remain protected by existing owner RLS."
);

check(
  ledger.includes("bos_inventory_transactions") &&
    ledger.includes("source_reference_id") &&
    ledger.includes("stock_before") &&
    ledger.includes("stock_after"),
  "Canonical ledger must remain the audit source of truth."
);

console.log(
  "INV-03A inventory transaction history & audit assertions passed."
);
