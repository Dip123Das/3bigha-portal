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

const billing = read("app/dashboard/vendor/billing/page.tsx");
const migration = read(
  "supabase/migrations/20260808213000_inv02b_consolidate_stock_authority.sql"
);
const invFoundation = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

check(
  billing.includes("post_bos_material_inventory_transaction"),
  "Billing must use canonical material inventory posting RPC."
);

check(
  billing.includes('target_transaction_type: "sale"'),
  "Billing must record semantic sale transactions."
);

check(
  billing.includes("billing-sale:") &&
    billing.includes("billId") &&
    billing.includes("item.source_id"),
  "Billing canonical posting must have stable source/idempotency context."
);

check(
  !billing.includes("current_stock: updatedStock"),
  "Billing must no longer mutate material current_stock directly."
);

check(
  !billing.includes("inventory_stock_movements"),
  "Billing must no longer write legacy stock movement rows directly."
);

check(
  migration.includes("post_bos_material_inventory_transaction") &&
    migration.includes("'material_issue'"),
  "COST stock issue must reuse canonical material inventory posting RPC."
);

check(
  !migration.includes("'offline_bill'"),
  "COST stock issue must no longer masquerade as an offline bill."
);

check(
  migration.includes("'bos_inventory_transaction'"),
  "COST entry must reference canonical inventory transaction."
);

check(
  invFoundation.includes("bos_inventory_transactions") &&
    invFoundation.includes("post_bos_material_inventory_transaction"),
  "INV-02A foundation must remain intact."
);

console.log(
  "INV-02B Billing + COST canonical stock authority assertions passed."
);
