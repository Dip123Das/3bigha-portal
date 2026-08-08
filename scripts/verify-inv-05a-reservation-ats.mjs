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
  "supabase/migrations/20260809004500_inv05a_reservation_available_to_sell.sql"
);
const panel = read(
  "components/inventory/InventoryReservationPanel.tsx"
);
const inventory = read(
  "app/dashboard/vendor/inventory/page.tsx"
);
const foundation = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql"
);

for (const marker of [
  "bos_material_inventory_reservations",
  "bos_material_available_to_sell",
  "reserve_bos_material_inventory",
  "release_bos_material_inventory_reservation",
  "available_to_sell",
  "reserved_stock",
]) {
  check(
    migration.includes(marker),
    `INV-05A reservation marker missing: ${marker}`
  );
}

check(
  migration.includes("'reservation'") &&
    migration.includes("'release_reservation'") &&
    migration.includes("physical_stock_unchanged"),
  "Reservations must record canonical neutral semantic transactions."
);

check(
  !migration.includes("update public.material_listings"),
  "INV-05A reservation control must not rewrite physical current_stock."
);

check(
  migration.includes("Insufficient available-to-sell stock"),
  "Reservation creation must prevent over-reservation."
);

for (const marker of [
  "On Hand → Reserved → Available to Sell",
  "Reserve Stock",
  "Release",
  "Physical on-hand stock will NOT change",
]) {
  check(
    panel.includes(marker),
    `INV-05A Human-First UI marker missing: ${marker}`
  );
}

check(
  inventory.includes("InventoryReservationPanel"),
  "Vendor Inventory must expose reservation/ATS control."
);

check(
  foundation.includes("'reservation','Reservation','neutral',false") &&
    foundation.includes("'release_reservation','Release Reservation','neutral',false"),
  "Canonical transaction vocabulary must preserve neutral reservation semantics."
);

console.log(
  "INV-05A reservation & available-to-sell assertions passed."
);
