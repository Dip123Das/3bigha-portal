import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(rel)=>{
  const p=path.join(root,rel);
  if(!fs.existsSync(p)) throw new Error(`Missing: ${rel}`);
  return fs.readFileSync(p,"utf8");
};
const check=(c,m)=>{if(!c) throw new Error(m);};

const migration=read("supabase/migrations/20260809021500_inv06a_operational_location_closure.sql");
const billing=read("app/dashboard/vendor/billing/page.tsx");
const cost=read("components/cost-execution/ProcurementInventoryLinkPanel.tsx");
const inv04b=read("supabase/migrations/20260808235500_inv04b_location_aware_stock_movements.sql");
const inv05b=read("supabase/migrations/20260809011500_inv05b_reservation_sales_integration.sql");

for(const marker of [
  "post_bos_billing_material_sale",
  "Choose the physical stock location before posting this sale",
  "Choose the physical stock location before posting this material issue",
  "'location_id', target_location_id",
  "'location_id', intent_row.location_id"
]){
  check(migration.includes(marker),`INV-06A migration marker missing: ${marker}`);
}

check(
  migration.includes("consume_bos_material_reservation_on_sale") &&
  migration.includes("post_bos_material_inventory_transaction"),
  "Billing wrapper must delegate to existing canonical sale authorities."
);

check(
  !migration.includes("update public.material_listings"),
  "INV-06A must not introduce another physical stock mutation path."
);

for(const marker of [
  "locationId: string",
  "post_bos_billing_material_sale",
  "Select stock location",
  "locationAllocations"
]){
  check(billing.includes(marker),`INV-06A Billing marker missing: ${marker}`);
}

for(const marker of [
  "selectedLocationId",
  "location_id: selectedLocationId || null",
  "Choose stock location",
  "Selected location stock"
]){
  check(cost.includes(marker),`INV-06A COST marker missing: ${marker}`);
}

check(
  inv04b.includes("target_metadata->>'location_id'"),
  "INV-04B atomic location synchronization must remain the location authority."
);

check(
  inv05b.includes("consume_bos_material_reservation_on_sale"),
  "INV-05B reservation consumption authority must remain intact."
);

console.log("INV-06A operational stock-out location closure assertions passed.");
