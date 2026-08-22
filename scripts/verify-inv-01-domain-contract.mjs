import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`INV-01 assertion failed: ${message}`);
    process.exit(1);
  }
}

function runVerifier(relativePath) {
  const result = spawnSync(process.execPath, [relativePath], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  assert(result.status === 0, `child verifier failed: ${relativePath}`);
}

const contractPath = "docs/3bos/27-Inventory-Domain-Contract.md";

assert(exists(contractPath), "inventory domain contract is missing");

const contract = read(contractPath);

const requiredContractTerms = [
  "public.material_listings",
  "material_listings.attributes.inventory.current_stock",
  "public.bos_inventory_transactions",
  "public.post_bos_material_inventory_transaction",
  "public.bos_material_inventory_reservations",
  "public.bos_material_available_to_sell",
  "public.reserve_bos_material_inventory",
  "public.release_bos_material_inventory_reservation",
  "public.post_bos_cost_stock_consumption",
  "AI must not",
  "Idempotency",
  "Required invariants",
  "Dispatch cannot duplicate a completed sale deduction",
  "Location totals reconcile to physical stock",
];

for (const term of requiredContractTerms) {
  assert(contract.includes(term), `contract must contain: ${term}`);
}

console.log("INV-01 contract content assertions passed.");

const requiredMigrations = [
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql",
  "supabase/migrations/20260808213000_inv02b_consolidate_stock_authority.sql",
  "supabase/migrations/20260808224500_inv03b_stock_reconciliation.sql",
  "supabase/migrations/20260808233000_inv04a_stock_location_transfer.sql",
  "supabase/migrations/20260808235500_inv04b_location_aware_stock_movements.sql",
  "supabase/migrations/20260809001500_inv04c_location_allocation_integrity.sql",
  "supabase/migrations/20260809004500_inv05a_reservation_available_to_sell.sql",
  "supabase/migrations/20260809011500_inv05b_reservation_sales_integration.sql",
  "supabase/migrations/20260809014500_inv05c_reservation_lifecycle_expiry.sql",
  "supabase/migrations/20260809021500_inv06a_operational_location_closure.sql",
];

for (const migration of requiredMigrations) {
  assert(exists(migration), `required migration is missing: ${migration}`);
}

const ledgerMigration = read(
  "supabase/migrations/20260808210000_inv02_unified_inventory_transaction_ledger.sql",
);

assert(
  ledgerMigration.includes(
    "create table if not exists public.bos_inventory_transactions",
  ),
  "semantic inventory transaction ledger must exist",
);

assert(
  ledgerMigration.includes(
    "create or replace function public.post_bos_material_inventory_transaction",
  ),
  "canonical material inventory posting RPC must exist",
);

assert(
  ledgerMigration.includes("unique(user_id,idempotency_key)"),
  "canonical ledger must enforce per-user idempotency",
);

assert(
  ledgerMigration.includes("for update"),
  "canonical posting RPC must lock the material listing",
);

assert(
  ledgerMigration.includes("if next_stock < 0"),
  "canonical posting RPC must prevent negative stock",
);

assert(
  ledgerMigration.includes("listing_user <> auth.uid()"),
  "canonical posting RPC must validate vendor ownership",
);

const locationAwareMigration = read(
  "supabase/migrations/20260808235500_inv04b_location_aware_stock_movements.sql",
);

assert(
  locationAwareMigration.includes(
    "create or replace function public.post_bos_material_inventory_transaction",
  ),
  "location-aware migration must preserve the canonical posting RPC",
);

const reconciliationMigration = read(
  "supabase/migrations/20260808224500_inv03b_stock_reconciliation.sql",
);

assert(
  reconciliationMigration.includes(
    "post_bos_material_inventory_transaction",
  ),
  "reconciliation must delegate to canonical stock posting",
);

const reservationMigration = read(
  "supabase/migrations/20260809004500_inv05a_reservation_available_to_sell.sql",
);

assert(
  reservationMigration.includes(
    "create table if not exists public.bos_material_inventory_reservations",
  ),
  "material reservation authority must exist",
);

assert(
  reservationMigration.includes(
    "create or replace view public.bos_material_available_to_sell",
  ),
  "available-to-sell projection must exist",
);

assert(
  reservationMigration.includes(
    "create or replace function public.reserve_bos_material_inventory",
  ),
  "canonical reservation RPC must exist",
);

assert(
  reservationMigration.includes(
    "create or replace function public.release_bos_material_inventory_reservation",
  ),
  "canonical reservation release RPC must exist",
);

assert(
  reservationMigration.includes("physical_stock_unchanged"),
  "reservation lifecycle must record that physical stock is unchanged",
);

assert(
  reservationMigration.includes("for update"),
  "reservation command must lock the material listing",
);

const reservationSalesMigration = read(
  "supabase/migrations/20260809011500_inv05b_reservation_sales_integration.sql",
);

assert(
  reservationSalesMigration.includes(
    "post_bos_material_inventory_transaction",
  ),
  "reservation sales integration must use canonical stock posting",
);

const locationIntegrityMigration = read(
  "supabase/migrations/20260809001500_inv04c_location_allocation_integrity.sql",
);

assert(
  locationIntegrityMigration.includes("current_stock"),
  "location allocation integrity must reconcile against physical stock",
);

const costAuthority = read(
  "supabase/migrations/20260808213000_inv02b_consolidate_stock_authority.sql",
);

assert(
  costAuthority.includes(
    "create or replace function public.post_bos_cost_stock_consumption",
  ),
  "COST canonical stock consumption command must exist",
);

assert(
  costAuthority.includes("public.post_bos_material_inventory_transaction"),
  "COST consumption must delegate to canonical stock posting",
);

const materialAdd = read("app/materials/add/page.tsx");

assert(
  materialAdd.includes("post_bos_material_inventory_transaction"),
  "opening stock from material creation must use canonical posting RPC",
);

const transactionPanel = read(
  "components/inventory/InventoryTransactionPanel.tsx",
);

assert(
  transactionPanel.includes("post_bos_material_inventory_transaction"),
  "manual stock transactions must use canonical posting RPC",
);

const reservationPanel = read(
  "components/inventory/InventoryReservationPanel.tsx",
);

assert(
  reservationPanel.includes("reserve_bos_material_inventory"),
  "reservation UI must use canonical reservation RPC",
);

assert(
  reservationPanel.includes(
    "release_bos_material_inventory_reservation",
  ),
  "reservation UI must use canonical release RPC",
);

const dispatchPage = read("app/dashboard/vendor/dispatch/page.tsx");

assert(
  !dispatchPage.includes("post_bos_material_inventory_transaction"),
  "dispatch must not independently post a generic stock deduction",
);

const inventoryIntelligence = read(
  "app/api/ai/inventory-intelligence/route.ts",
);

assert(
  inventoryIntelligence.includes(
    '.from("bos_material_inventory_intelligence")',
  ),
  "canonical inventory intelligence view must remain explicit",
);

assert(
  inventoryIntelligence.includes(
    "buildDeterministicInventoryIntelligence",
  ),
  "shared deterministic inventory engine must remain explicit",
);

assert(
  !inventoryIntelligence.includes(
    "inventory_stock_movements",
  ),
  "legacy inventory movement table must not be referenced",
);

assert(
  !inventoryIntelligence.includes(
    "post_bos_material_inventory_transaction",
  ),
  "AI inventory intelligence must not mutate canonical stock",
);

console.log("INV-01 canonical implementation assertions passed.");

const childVerifiers = [
  "scripts/verify-inv-02a-unified-transaction-ledger.mjs",
  "scripts/verify-inv-02b-consolidate-stock-authority.mjs",
  "scripts/verify-inv-02c-remaining-material-movements.mjs",
  "scripts/verify-inv-03a-transaction-history.mjs",
  "scripts/verify-inv-03b-stock-reconciliation.mjs",
  "scripts/verify-inv-03c-variance-intelligence.mjs",
  "scripts/verify-inv-04a-location-transfer.mjs",
  "scripts/verify-inv-04b-location-aware-movements.mjs",
  "scripts/verify-inv-04c-location-integrity.mjs",
  "scripts/verify-inv-05a-reservation-ats.mjs",
  "scripts/verify-inv-05b-reservation-sales.mjs",
  "scripts/verify-inv-05c-reservation-lifecycle.mjs",
  "scripts/verify-inv-06a-operational-location-closure.mjs",
  "scripts/verify-cost-01e-inventory-handoff.mjs",
  "scripts/verify-cost-02b-procurement-stock-linkage.mjs",
  "scripts/verify-cost-02c-canonical-stock-issue.mjs",
];

for (const verifier of childVerifiers) {
  assert(exists(verifier), `required child verifier is missing: ${verifier}`);
}

console.log("INV-01 required verifier inventory passed.");

for (const verifier of childVerifiers) {
  console.log(`\n=== Running ${verifier} ===`);
  runVerifier(verifier);
}

console.log(
  "\nINV-01 inventory domain contract and stock integrity baseline assertions passed.",
);
