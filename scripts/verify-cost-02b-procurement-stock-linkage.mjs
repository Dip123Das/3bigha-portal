import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(
  "supabase/migrations/20260808194500_cost_procurement_stock_linkage.sql"
);
const helper = read(
  "lib/cost-execution/procurement-linkage.ts"
);
const panel = read(
  "components/cost-execution/ProcurementInventoryLinkPanel.tsx"
);
const planning = read(
  "components/cost-execution/PlanningConsumptionControlPanel.tsx"
);
const rfq = read("app/rfq/new/page.tsx");
const rfqApi = read("app/api/rfq/create/route.ts");
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);

for (const marker of [
  "bos_cost_procurement_handoffs",
  "bos_cost_stock_consumption_intents",
  "idempotency_key",
  "material_listing_id",
]) {
  check(
    migration.includes(marker),
    `COST-02B migration marker missing: ${marker}`
  );
}

check(
  helper.includes("3bigha_cost_procurement_prefill"),
  "Procurement prefill browser bridge is missing."
);

check(
  panel.includes("Need to Buy → RFQ") &&
    panel.includes('target_route: "/rfq/new"'),
  "COST planned demand must route through the existing professional RFQ page."
);

check(
  panel.includes("does not silently reduce seller inventory"),
  "Stock consumption must explicitly avoid unverified direct stock mutation."
);

check(
  planning.includes("ProcurementInventoryLinkPanel"),
  "Planning control must expose procurement/stock actions."
);

check(
  rfq.includes('fetch("/api/rfq/create"') &&
    rfqApi.includes('.from("rfqs")'),
  "Existing RFQ creation path must remain authoritative."
);

check(
  rfq.includes("readProcurementPrefillFromBrowser") &&
    rfq.includes("source=cost_plan") === false,
  "RFQ form must consume COST procurement prefill without introducing a parallel form."
);

check(
  inventory.includes('.from("material_listings")') &&
    inventory.includes("current_stock"),
  "Existing seller inventory architecture must remain material_listings-backed."
);

console.log(
  "COST-02B procurement & stock-consumption linkage assertions passed."
);
