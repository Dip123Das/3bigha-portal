import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing: ${rel}`);
  return fs.readFileSync(p, "utf8");
};
const check = (c, m) => { if (!c) throw new Error(m); };

const migration = read(
  "supabase/migrations/20260809014500_inv05c_reservation_lifecycle_expiry.sql"
);
const panel = read(
  "components/inventory/InventoryReservationPanel.tsx"
);
const ats = read(
  "supabase/migrations/20260809011500_inv05b_reservation_sales_integration.sql"
);

for (const marker of [
  "bos_material_reservation_lifecycle",
  "expired_pending_finalize",
  "finalize_bos_expired_material_reservations",
  "expiry_finalization",
  "physical_stock_unchanged"
]) {
  check(
    migration.includes(marker),
    `INV-05C lifecycle marker missing: ${marker}`
  );
}

check(
  migration.includes("'release_reservation'") &&
    migration.includes("status = 'expired'"),
  "Expired reservations must finalize via neutral release semantics."
);

check(
  !migration.includes("update public.material_listings"),
  "INV-05C must never change canonical physical stock."
);

check(
  panel.includes("consumed_quantity") &&
    panel.includes("Finalize Expired Reservations") &&
    panel.includes("Expired Pending Finalize"),
  "INV-05C panel lifecycle controls missing."
);

check(
  panel.includes("finalize_bos_expired_material_reservations") &&
    panel.includes("window.confirm"),
  "Expiry finalization must require explicit human confirmation."
);

check(
  ats.includes("r.expires_at is null or r.expires_at > now()"),
  "ATS must continue ignoring expired active reservations immediately."
);

console.log(
  "INV-05C reservation lifecycle & expiry assertions passed."
);
