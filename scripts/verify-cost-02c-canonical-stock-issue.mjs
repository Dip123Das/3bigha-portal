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

const baseMigration = read(
  "supabase/migrations/20260808201500_cost_canonical_stock_issue.sql"
);
const panel = read(
  "components/cost-execution/ProcurementInventoryLinkPanel.tsx"
);
const foundation = read(
  "supabase/migrations/20260808194500_cost_procurement_stock_linkage.sql"
);
const inv02b = fs.existsSync(
  path.join(root, "supabase/migrations/20260808213000_inv02b_consolidate_stock_authority.sql")
)
  ? read("supabase/migrations/20260808213000_inv02b_consolidate_stock_authority.sql")
  : "";

for (const marker of [
  "post_bos_cost_stock_consumption",
  "material_issue",
  "posted_cost_entry_id",
  "posted_stock_movement_id",
]) {
  check(
    baseMigration.toLowerCase().includes(marker.toLowerCase()),
    `COST-02C base stock-posting marker missing: ${marker}`
  );
}

check(
  panel.includes("post_bos_cost_stock_consumption") &&
    panel.includes('from("material_listings")'),
  "Use My Stock UI must select owned stock and invoke cost posting RPC."
);

check(
  panel.includes("window.confirm"),
  "Final stock issue must require explicit human confirmation."
);

check(
  foundation.includes("bos_cost_stock_consumption_intents"),
  "COST-02B stock consumption intent foundation must remain present."
);

if (inv02b) {
  check(
    inv02b.includes("post_bos_material_inventory_transaction") &&
      inv02b.includes("'material_issue'"),
    "After INV-02B, COST stock posting must delegate inventory mutation to canonical INV authority."
  );
  check(
    !inv02b.includes("'offline_bill'"),
    "After INV-02B, COST stock posting must not use legacy offline_bill semantics."
  );
  check(
    inv02b.includes("'bos_inventory_transaction'"),
    "COST material_issue ledger entry must reference canonical inventory transaction."
  );
}

console.log(
  "COST-02C canonical stock issue posting assertions passed."
);
