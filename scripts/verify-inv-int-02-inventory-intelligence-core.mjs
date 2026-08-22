import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`INV-INT-02 verification failed: ${message}`);
  }
}

const migrationPath =
  "supabase/migrations/20260822080000_inv_int_02_inventory_intelligence_core.sql";

assert(exists(migrationPath), "inventory intelligence migration is missing");

const migration = read(migrationPath);

assert(
  migration.includes(
    "create or replace view public.bos_material_inventory_intelligence",
  ),
  "canonical intelligence view is missing",
);

assert(
  migration.includes("public.bos_inventory_transactions"),
  "intelligence must consume the canonical transaction ledger",
);

assert(
  migration.includes("public.bos_inventory_transaction_types"),
  "movement direction must come from canonical transaction types",
);

assert(
  migration.includes("public.bos_material_available_to_sell"),
  "intelligence must consume canonical available-to-sell",
);

assert(
  migration.includes("public.bos_material_location_integrity"),
  "intelligence must consume canonical location integrity",
);

assert(
  migration.includes("stock_in_30d"),
  "30-day inbound movement metric is missing",
);

assert(
  migration.includes("stock_out_30d"),
  "30-day outbound movement metric is missing",
);

assert(
  migration.includes("movement_count_30d"),
  "30-day movement count is missing",
);

assert(
  migration.includes("stock_age_days"),
  "stock ageing metric is missing",
);

assert(
  migration.includes("movement_velocity"),
  "movement velocity classification is missing",
);

assert(
  migration.includes("ageing_status"),
  "ageing classification is missing",
);

assert(
  migration.includes("suggested_reorder_quantity"),
  "reorder recommendation metric is missing",
);

assert(
  migration.includes("allocation_drift"),
  "location allocation drift metric is missing",
);

assert(
  migration.includes("location_balanced"),
  "location integrity status is missing",
);

assert(
  migration.includes("risk_score"),
  "deterministic risk score is missing",
);

assert(
  migration.includes("risk_level"),
  "deterministic risk level is missing",
);

assert(
  (migration.match(/as risk_score/g) || []).length === 1,
  "risk score must be defined exactly once",
);

assert(
  (migration.match(/as risk_level/g) || []).length === 1,
  "risk level must be defined exactly once",
);

assert(
  migration.includes("when ib.risk_score >= 50 then 'high'"),
  "high-risk threshold is missing",
);

assert(
  migration.includes("when ib.risk_score >= 20 then 'medium'"),
  "medium-risk threshold is missing",
);

assert(
  migration.includes("grant select") &&
    migration.includes("to authenticated"),
  "authenticated read grant is missing",
);

const forbiddenWrites = [
  "insert into public.material_listings",
  "update public.material_listings",
  "delete from public.material_listings",
  "post_bos_material_inventory_transaction(",
  "reserve_bos_material_inventory(",
  "release_bos_material_inventory_reservation(",
  "consume_bos_material_reservation_on_sale(",
];

for (const forbidden of forbiddenWrites) {
  assert(
    !migration.includes(forbidden),
    `read-only intelligence migration contains forbidden write path: ${forbidden}`,
  );
}

assert(
  !migration.includes("inventory_stock_movements"),
  "legacy inventory_stock_movements must not be used",
);

console.log(
  "INV-INT-02 inventory intelligence core migration assertions passed.",
);

const routePath = "app/api/ai/inventory-intelligence/route.ts";
const enginePath = "lib/inventory/intelligence.ts";
const dashboardPath =
  "app/dashboard/vendor/inventory-intelligence/page.tsx";

assert(exists(routePath), "canonical inventory intelligence API is missing");
assert(exists(enginePath), "shared inventory intelligence engine is missing");
assert(
  exists(dashboardPath),
  "vendor inventory intelligence dashboard is missing",
);

const route = read(routePath);
const engine = read(enginePath);
const dashboard = read(dashboardPath);

assert(
  route.includes('.from("bos_material_inventory_intelligence")'),
  "API must read the canonical inventory intelligence view",
);

assert(
  route.includes("buildDeterministicInventoryIntelligence"),
  "API must use the shared deterministic intelligence engine",
);

assert(
  route.includes(
    "canonical_inventory_intelligence_with_ai_explanation",
  ),
  "API AI response source marker is missing",
);

assert(
  route.includes(
    "Deterministic stock metrics are authoritative",
  ),
  "API must explicitly keep deterministic metrics authoritative",
);

assert(
  !route.includes("inventory_stock_movements"),
  "API must not read the legacy inventory movement table",
);

assert(
  !route.includes("fallback_inventory_rules"),
  "legacy fallback intelligence must not remain",
);

assert(
  engine.includes(
    "export function buildDeterministicInventoryIntelligence",
  ),
  "shared deterministic intelligence function is missing",
);

for (const metric of [
  "healthScore",
  "availableToSell",
  "reservationCoverage",
  "inventoryCostValue",
  "inventorySalesValue",
  "reorderSuggestions",
  "locationDrift",
  "deadStock",
  "slowMoving",
  "fastMoving",
]) {
  assert(
    engine.includes(metric),
    `shared intelligence engine is missing metric: ${metric}`,
  );
}

for (const section of [
  "Inventory Health Control",
  "Stock Availability",
  "Inventory Risk Signals",
  "Inventory Valuation",
  "Management Summary",
  "Priority Inventory Items",
  "Reorder Recommendations",
  "Location Integrity",
  "Operational Context",
  "Next Best Actions",
]) {
  assert(
    dashboard.includes(section),
    `dashboard is missing section: ${section}`,
  );
}

assert(
  dashboard.includes(
    "AI is used only to",
  ),
  "dashboard must explain that AI is only an explanation layer",
);

assert(
  dashboard.includes("Refresh Intelligence"),
  "dashboard canonical refresh control is missing",
);

assert(
  !dashboard.includes("Refresh AI"),
  "old AI-first refresh label must not remain",
);

assert(
  !dashboard.includes("AI ERP Supervisor"),
  "old AI-first supervisor panel must not remain",
);

assert(
  !dashboard.includes("inventory_stock_movements"),
  "dashboard must not refer to the legacy movement table",
);

console.log(
  "INV-INT-02 API, engine and dashboard assertions passed.",
);
