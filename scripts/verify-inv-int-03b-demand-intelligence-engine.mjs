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
    throw new Error(
      `INV-INT-03B verification failed: ${message}`,
    );
  }
}

const migrationPath =
  "supabase/migrations/20260822093000_inv_int_03b_demand_intelligence_engine.sql";

assert(exists(migrationPath), "demand intelligence migration is missing");

const migration = read(migrationPath);

assert(
  migration.includes(
    "create or replace view public.bos_material_inventory_demand_intelligence",
  ),
  "canonical demand intelligence view is missing",
);

for (const authority of [
  "public.bos_inventory_transactions",
  "public.bos_inventory_transaction_types",
  "public.bos_material_inventory_intelligence",
  "public.bos_material_inventory_reservations",
]) {
  assert(
    migration.includes(authority),
    `canonical demand input is missing: ${authority}`,
  );
}

for (const metric of [
  "demand_7d",
  "demand_30d",
  "demand_90d",
  "average_daily_demand_7d",
  "average_daily_demand_30d",
  "average_daily_demand_90d",
  "weighted_average_daily_demand",
  "forecast_demand_7d",
  "forecast_demand_30d",
  "forecast_demand_90d",
  "demand_trend",
  "stock_runway_days",
  "predicted_depletion_date",
  "reservation_pressure_percent",
  "forecast_confidence_score",
  "forecast_confidence",
  "procurement_priority",
  "suggested_replenishment_quantity",
  "suggested_reorder_date",
]) {
  assert(
    migration.includes(metric),
    `demand intelligence metric is missing: ${metric}`,
  );
}

assert(
  migration.includes("abs(t.quantity)"),
  "outbound demand must use absolute canonical quantities",
);

assert(
  migration.includes("tt.direction = 'out'"),
  "demand must use canonical outbound transaction direction",
);

assert(
  migration.includes("tt.affects_quantity = true"),
  "neutral reservations must not be counted as physical outbound demand",
);

assert(
  migration.includes("grant select") &&
    migration.includes("to authenticated"),
  "authenticated read grant is missing",
);

for (const forbidden of [
  "insert into public.material_listings",
  "update public.material_listings",
  "delete from public.material_listings",
  "post_bos_material_inventory_transaction(",
  "inventory_stock_movements",
  "supplier_lead_time",
  "minimum_order_quantity",
  "economic_order_quantity",
]) {
  assert(
    !migration.includes(forbidden),
    `read-only demand engine contains forbidden or unsupported logic: ${forbidden}`,
  );
}

console.log(
  "INV-INT-03B Demand Intelligence Engine migration assertions passed.",
);
