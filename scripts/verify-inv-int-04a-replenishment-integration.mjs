import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(
      `INV-INT-04A verification failed: ${message}`,
    );
  }
}

const engine = read("lib/inventory/intelligence.ts");
const route = read("app/api/ai/inventory-intelligence/route.ts");

assert(
  engine.includes("export type InventoryDemandIntelligenceRow"),
  "demand intelligence row contract is missing",
);

assert(
  engine.includes(
    "export function buildDeterministicDemandIntelligence",
  ),
  "deterministic demand intelligence engine is missing",
);

for (const metric of [
  "forecastDemand7d",
  "forecastDemand30d",
  "forecastDemand90d",
  "weightedAverageDailyDemand",
  "stockRunwayDays",
  "predictedDepletionDate",
  "forecastConfidenceScore",
  "forecastConfidence",
  "procurementPriority",
  "suggestedReplenishmentQuantity",
  "suggestedReorderDate",
  "estimatedReplenishmentCost",
]) {
  assert(
    engine.includes(metric),
    `deterministic demand metric is missing: ${metric}`,
  );
}

assert(
  route.includes(
    '.from("bos_material_inventory_demand_intelligence")',
  ),
  "API must query the canonical demand intelligence view",
);

assert(
  route.includes("buildDeterministicDemandIntelligence"),
  "API must invoke the deterministic demand engine",
);

assert(
  route.includes("demandIntelligence"),
  "API response must expose demand intelligence",
);

assert(
  route.includes("supabase.auth.getUser()"),
  "API must authenticate through Supabase getUser",
);

assert(
  !route.includes("supabase.auth.getSession()"),
  "insecure server-side getSession authentication must not remain",
);

assert(
  !engine.includes("inventory_stock_movements"),
  "legacy stock movement table must not be used",
);

assert(
  !route.includes("inventory_stock_movements"),
  "API must not use the legacy stock movement table",
);

console.log(
  "INV-INT-04A replenishment API integration assertions passed.",
);
