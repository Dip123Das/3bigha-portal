import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(rel)=>{
  const p=path.join(root,rel);
  if(!fs.existsSync(p)) throw new Error(`Missing: ${rel}`);
  return fs.readFileSync(p,"utf8");
};
const check=(c,m)=>{ if(!c) throw new Error(m); };

const migration=read("supabase/migrations/20260809011500_inv05b_reservation_sales_integration.sql");
const billing=read("app/dashboard/vendor/billing/page.tsx");
const foundation=read("supabase/migrations/20260809004500_inv05a_reservation_available_to_sell.sql");

for(const marker of [
  "consumed_quantity",
  "bos_material_inventory_reservation_consumptions",
  "consume_bos_material_reservation_on_sale",
  "reservation_remaining",
  "Sale quantity exceeds remaining reservation"
]){
  check(migration.includes(marker),`INV-05B marker missing: ${marker}`);
}

check(
  migration.includes("'sale'") &&
  migration.includes("post_bos_material_inventory_transaction"),
  "Reservation consumption must delegate physical stock-out to canonical sale."
);

check(
  !migration.includes("update public.material_listings"),
  "INV-05B must not add a second physical stock mutation path."
);

check(
  migration.includes("unique(user_id, idempotency_key)") &&
  migration.includes("already_posted"),
  "Reservation sale consumption must be idempotent."
);

check(
  billing.includes("reservationId: string") &&
  billing.includes("No reservation / direct sale"),
  "Billing must expose optional reservation selection."
);

check(
  billing.includes("consume_bos_material_reservation_on_sale") &&
  billing.includes("post_bos_material_inventory_transaction"),
  "Billing must preserve direct sale and add reservation-aware sale."
);

check(
  foundation.includes("Reservations are subordinate commitments"),
  "INV-05A semantics must remain intact."
);

console.log("INV-05B reservation consumption & billing integration assertions passed.");
