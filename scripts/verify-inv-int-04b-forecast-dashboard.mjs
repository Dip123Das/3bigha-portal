import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(
      `INV-INT-04B verification failed: ${message}`,
    );
  }
}

const dashboardPath =
  "app/dashboard/vendor/inventory-intelligence/page.tsx";

const dashboard = read(dashboardPath);
const route = read(
  "app/api/ai/inventory-intelligence/route.ts",
);

assert(
  dashboard.includes("type DemandIntelligence"),
  "dashboard demand intelligence contract is missing",
);

assert(
  dashboard.includes(
    "demandIntelligence?: DemandIntelligence",
  ),
  "API response contract must expose demandIntelligence",
);

assert(
  dashboard.includes(
    "const demandIntelligence = data?.demandIntelligence",
  ),
  "dashboard must consume demandIntelligence",
);

assert(
  dashboard.includes(
    "Forecast & Replenishment Control Center",
  ),
  "forecast and replenishment control center is missing",
);

assert(
  dashboard.includes(
    "function ForecastReplenishmentControlCenter",
  ),
  "forecast control center component is missing",
);

for (const metric of [
  "forecastDemand7d",
  "forecastDemand30d",
  "forecastDemand90d",
  "estimatedReplenishmentCost",
  "minimumStockRunwayDays",
  "averageForecastConfidence",
  "suggestedReplenishmentQuantity",
  "suggestedReorderDate",
  "procurementPriority",
  "forecastConfidence",
  "stockRunwayDays",
]) {
  assert(
    dashboard.includes(metric),
    `forecast dashboard metric is missing: ${metric}`,
  );
}

for (const label of [
  "Forecast — 7 Days",
  "Forecast — 30 Days",
  "Forecast — 90 Days",
  "Replenishment Cost",
  "Minimum Stock Runway",
  "Forecast Confidence",
  "Immediate Procurement",
  "Replenishment Priority",
  "Increasing Demand",
  "Stable Demand",
  "Falling Demand",
  "Insufficient History",
]) {
  assert(
    dashboard.includes(label),
    `forecast dashboard label is missing: ${label}`,
  );
}

assert(
  dashboard.includes(
    '"repeat(auto-fit, minmax(280px, 1fr))"',
  ),
  "responsive replenishment card layout is missing",
);

assert(
  dashboard.includes("replenishmentItems"),
  "replenishment priority items must be rendered",
);

assert(
  dashboard.includes(".slice(0, 30)"),
  "replenishment priority list must be bounded",
);

assert(
  route.includes("demandIntelligence"),
  "canonical API must continue exposing demand intelligence",
);

assert(
  !dashboard.includes("inventory_stock_movements"),
  "dashboard must not query the legacy stock movement table",
);

assert(
  !dashboard.includes(
    "buildDeterministicDemandIntelligence",
  ),
  "dashboard must not duplicate deterministic calculations",
);

console.log(
  "INV-INT-04B Forecast & Replenishment Control Center assertions passed.",
);
