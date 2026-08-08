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
  "supabase/migrations/20260808201500_cost_canonical_stock_issue.sql"
);
const panel = read(
  "components/cost-execution/ProcurementInventoryLinkPanel.tsx"
);
const billing = read("app/dashboard/vendor/billing/page.tsx");
const foundation = read(
  "supabase/migrations/20260808194500_cost_procurement_stock_linkage.sql"
);

for (const marker of [
  "post_bos_cost_stock_consumption",
  "for update",
  "Insufficient stock",
  "current_stock",
  "inventory_stock_movements",
  "'material_issue'",
  "posted_cost_entry_id",
  "posted_stock_movement_id",
]) {
  check(
    migration.toLowerCase().includes(marker.toLowerCase()),
    `COST-02C stock posting marker missing: ${marker}`
  );
}

check(
  migration.includes("listing_user <> auth.uid()") &&
    migration.includes("plan_owner <> auth.uid()"),
  "Stock posting must enforce ownership of both plan and inventory."
);

check(
  migration.includes("intent_row.status = 'posted'"),
  "Stock posting must be idempotent against double posting."
);

check(
  migration.includes("current_stock < requested_qty"),
  "Stock posting must reject insufficient inventory."
);

check(
  migration.includes("Unit mismatch"),
  "Stock posting must protect against incompatible stock/plan units."
);

check(
  billing.includes("current_stock: updatedStock") &&
    billing.includes('from("inventory_stock_movements")'),
  "COST-02C must remain aligned with the existing billing stock mutation model."
);

check(
  panel.includes("post_bos_cost_stock_consumption") &&
    panel.includes('from("material_listings")'),
  "Use My Stock UI must select owned stock and invoke canonical posting RPC."
);

check(
  panel.includes("window.confirm"),
  "Final stock issue must require explicit human confirmation."
);

check(
  foundation.includes("bos_cost_stock_consumption_intents"),
  "COST-02B stock consumption intent foundation must remain present."
);

console.log(
  "COST-02C canonical stock issue posting assertions passed."
);
