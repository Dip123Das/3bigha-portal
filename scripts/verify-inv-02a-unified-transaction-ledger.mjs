import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing: ${rel}`);
  }
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);
const types = read("lib/inventory/transaction-types.ts");
const billing = read("app/dashboard/vendor/billing/page.tsx");
const costIssue = read(
  "supabase/migrations/20260808201500_cost_canonical_stock_issue.sql"
);

for (const marker of [
  "bos_inventory_transaction_types",
  "bos_inventory_transactions",
  "post_bos_material_inventory_transaction",
  "opening_stock",
  "purchase_receipt",
  "production_receipt",
  "sale",
  "dispatch",
  "material_issue",
  "material_return",
  "damage",
  "loss",
  "transfer_in",
  "transfer_out",
  "stock_adjustment_in",
  "stock_adjustment_out",
]) {
  check(
    migration.includes(marker),
    `INV-02A ledger marker missing: ${marker}`
  );
}

check(
  migration.includes("for update") &&
    migration.includes("next_stock < 0"),
  "Canonical posting must lock stock and reject negative balance."
);

check(
  migration.includes("idempotency_key") &&
    migration.includes("already_posted"),
  "Canonical posting must provide idempotency."
);

check(
  migration.includes("vendor_user_id") &&
    migration.includes("auth.uid()"),
  "Canonical posting must enforce material inventory ownership."
);

check(
  migration.includes("material_listings") &&
    migration.includes("{inventory,current_stock}"),
  "Existing material stock balance must remain backward compatible."
);

check(
  types.includes("InventoryTransactionType") &&
    types.includes("inventoryTransactionDirection"),
  "Shared transaction vocabulary is missing."
);

check(
  billing.includes("current_stock: updatedStock") &&
    billing.includes("inventory_stock_movements"),
  "Verifier expected current billing mutation path was not found."
);

check(
  costIssue.includes("'offline_bill'") &&
    costIssue.includes("'material_issue'"),
  "Verifier expected COST-02C legacy movement compatibility bridge was not found."
);

console.log(
  "INV-02A unified inventory transaction ledger foundation assertions passed."
);
