export type InventoryIntelligenceRow = {
  user_id: string;
  material_listing_id: string;
  material_name: string | null;
  sku: string | null;
  on_hand_stock: number | string | null;
  reserved_stock: number | string | null;
  available_to_sell: number | string | null;
  unit: string | null;
  reorder_level: number | string | null;
  purchase_price: number | string | null;
  selling_price: number | string | null;
  stock_in_30d: number | string | null;
  stock_out_30d: number | string | null;
  movement_count_30d: number | string | null;
  last_movement_at: string | null;
  stock_age_days: number | string | null;
  stock_status:
    | "out_of_stock"
    | "fully_reserved"
    | "low_stock"
    | "healthy";
  movement_velocity: "no_movement" | "slow" | "normal" | "fast";
  ageing_status: "active" | "slow_moving" | "dead_stock";
  suggested_reorder_quantity: number | string | null;
  allocated_stock: number | string | null;
  allocation_drift: number | string | null;
  location_balanced: boolean | null;
  risk_score: number | string | null;
  risk_level: "low" | "medium" | "high";
};

function asNumber(value: unknown) {
  const number =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(number) ? number : 0;
}

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function buildDeterministicInventoryIntelligence(
  rows: InventoryIntelligenceRow[],
) {
  const items = rows.map((row) => ({
    materialListingId: row.material_listing_id,
    item: row.material_name || row.sku || "Inventory item",
    sku: row.sku,
    onHandStock: asNumber(row.on_hand_stock),
    reservedStock: asNumber(row.reserved_stock),
    availableToSell: asNumber(row.available_to_sell),
    unit: row.unit || "",
    reorderLevel: asNumber(row.reorder_level),
    purchasePrice: asNumber(row.purchase_price),
    sellingPrice: asNumber(row.selling_price),
    stockIn30d: asNumber(row.stock_in_30d),
    stockOut30d: asNumber(row.stock_out_30d),
    movementCount30d: asNumber(row.movement_count_30d),
    lastMovementAt: row.last_movement_at,
    stockAgeDays: asNumber(row.stock_age_days),
    stockStatus: row.stock_status,
    movementVelocity: row.movement_velocity,
    ageingStatus: row.ageing_status,
    suggestedReorderQuantity: asNumber(row.suggested_reorder_quantity),
    allocatedStock: asNumber(row.allocated_stock),
    allocationDrift: asNumber(row.allocation_drift),
    locationBalanced: Boolean(row.location_balanced),
    riskScore: asNumber(row.risk_score),
    riskLevel: row.risk_level,
  }));

  const totals = items.reduce(
    (summary, item) => {
      summary.onHand += item.onHandStock;
      summary.reserved += item.reservedStock;
      summary.availableToSell += item.availableToSell;
      summary.stockIn30d += item.stockIn30d;
      summary.stockOut30d += item.stockOut30d;
      summary.inventoryCostValue += item.onHandStock * item.purchasePrice;
      summary.inventorySalesValue += item.onHandStock * item.sellingPrice;
      return summary;
    },
    {
      onHand: 0,
      reserved: 0,
      availableToSell: 0,
      stockIn30d: 0,
      stockOut30d: 0,
      inventoryCostValue: 0,
      inventorySalesValue: 0,
    },
  );

  const lowStock = items.filter((item) =>
    ["out_of_stock", "fully_reserved", "low_stock"].includes(
      item.stockStatus,
    ),
  );

  const outOfStock = items.filter(
    (item) => item.stockStatus === "out_of_stock",
  );

  const fullyReserved = items.filter(
    (item) => item.stockStatus === "fully_reserved",
  );

  const fastMoving = items.filter(
    (item) => item.movementVelocity === "fast",
  );

  const slowMoving = items.filter(
    (item) => item.ageingStatus === "slow_moving",
  );

  const deadStock = items.filter(
    (item) => item.ageingStatus === "dead_stock",
  );

  const reorderSuggestions = items
    .filter((item) => item.suggestedReorderQuantity > 0)
    .sort(
      (a, b) =>
        b.suggestedReorderQuantity - a.suggestedReorderQuantity,
    );

  const locationDrift = items.filter((item) => !item.locationBalanced);

  const highRisk = items.filter((item) => item.riskLevel === "high");
  const mediumRisk = items.filter((item) => item.riskLevel === "medium");

  const riskLevel =
    highRisk.length > 0
      ? "high"
      : mediumRisk.length > 0
        ? "medium"
        : "low";

  const healthScore =
    items.length === 0
      ? 100
      : Math.max(
          0,
          Math.round(
            100 -
              items.reduce((sum, item) => sum + item.riskScore, 0) /
                items.length,
          ),
        );

  const reservationCoverage =
    totals.onHand > 0
      ? round((totals.reserved / totals.onHand) * 100, 1)
      : 0;

  const summary =
    items.length === 0
      ? "No inventory intelligence is available because no canonical material inventory items were found."
      : `${items.length} inventory item(s) reviewed. ${lowStock.length} need stock attention, ${deadStock.length} show dead-stock risk, and ${locationDrift.length} have location-allocation drift.`;

  const nextActions: string[] = [];

  if (outOfStock.length > 0) {
    nextActions.push(
      `Restock ${outOfStock.length} out-of-stock item(s) before accepting new demand.`,
    );
  }

  if (fullyReserved.length > 0) {
    nextActions.push(
      `Review ${fullyReserved.length} fully reserved item(s) before confirming additional orders.`,
    );
  }

  if (reorderSuggestions.length > 0) {
    nextActions.push(
      `Create procurement actions for ${reorderSuggestions.length} item(s) below their target availability.`,
    );
  }

  if (deadStock.length > 0) {
    nextActions.push(
      `Review pricing, promotion or redistribution for ${deadStock.length} dead-stock item(s).`,
    );
  }

  if (locationDrift.length > 0) {
    nextActions.push(
      `Reconcile physical location allocations for ${locationDrift.length} item(s).`,
    );
  }

  if (nextActions.length === 0) {
    nextActions.push(
      "No urgent inventory action is required. Continue posting all stock movements through canonical workflows.",
    );
  }

  return {
    ok: true,
    source: "canonical_inventory_intelligence",
    generatedAt: new Date().toISOString(),
    summary,
    riskLevel,
    healthScore,
    totals: {
      itemCount: items.length,
      onHand: round(totals.onHand),
      reserved: round(totals.reserved),
      availableToSell: round(totals.availableToSell),
      reservationCoverage,
      stockIn30d: round(totals.stockIn30d),
      stockOut30d: round(totals.stockOut30d),
      inventoryCostValue: round(totals.inventoryCostValue),
      inventorySalesValue: round(totals.inventorySalesValue),
    },
    counts: {
      healthy: items.filter((item) => item.stockStatus === "healthy")
        .length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      fullyReserved: fullyReserved.length,
      fastMoving: fastMoving.length,
      slowMoving: slowMoving.length,
      deadStock: deadStock.length,
      reorderSuggestions: reorderSuggestions.length,
      locationDrift: locationDrift.length,
      highRisk: highRisk.length,
      mediumRisk: mediumRisk.length,
    },
    items,
    lowStock,
    outOfStock,
    fullyReserved,
    fastMoving,
    slowMoving,
    deadStock,
    reorderSuggestions,
    locationDrift,
    highRisk,
    nextActions,
  };
}

export type InventoryDemandIntelligenceRow = {
  user_id: string;
  material_listing_id: string;
  material_name: string | null;
  sku: string | null;
  unit: string | null;

  on_hand_stock: number | string | null;
  reserved_stock: number | string | null;
  available_to_sell: number | string | null;
  reorder_level: number | string | null;
  purchase_price: number | string | null;
  selling_price: number | string | null;

  demand_7d: number | string | null;
  demand_30d: number | string | null;
  demand_90d: number | string | null;

  outbound_events_7d: number | string | null;
  outbound_events_30d: number | string | null;
  outbound_events_90d: number | string | null;

  reserved_demand_7d: number | string | null;
  reserved_demand_30d: number | string | null;
  reserved_demand_90d: number | string | null;

  reservation_events_7d: number | string | null;
  reservation_events_30d: number | string | null;
  reservation_events_90d: number | string | null;

  first_outbound_at: string | null;
  last_outbound_at: string | null;
  history_days: number | string | null;

  average_daily_demand_7d: number | string | null;
  average_daily_demand_30d: number | string | null;
  average_daily_demand_90d: number | string | null;
  weighted_average_daily_demand: number | string | null;

  forecast_demand_7d: number | string | null;
  forecast_demand_30d: number | string | null;
  forecast_demand_90d: number | string | null;

  demand_trend: "increasing" | "stable" | "falling" | "no_demand";
  stock_runway_days: number | string | null;
  predicted_depletion_date: string | null;
  reservation_pressure_percent: number | string | null;

  forecast_confidence_score: number | string | null;
  forecast_confidence: "low" | "medium" | "high";

  procurement_priority:
    | "immediate"
    | "within_7_days"
    | "within_15_days"
    | "within_30_days"
    | "monitor";

  suggested_replenishment_quantity: number | string | null;
  suggested_reorder_date: string | null;

  stock_status:
    | "out_of_stock"
    | "fully_reserved"
    | "low_stock"
    | "healthy";

  risk_score: number | string | null;
  risk_level: "low" | "medium" | "high";
};

export function buildDeterministicDemandIntelligence(
  rows: InventoryDemandIntelligenceRow[],
) {
  const items = rows.map((row) => ({
    materialListingId: row.material_listing_id,
    item: row.material_name || row.sku || "Inventory item",
    sku: row.sku,
    unit: row.unit || "",

    onHandStock: asNumber(row.on_hand_stock),
    reservedStock: asNumber(row.reserved_stock),
    availableToSell: asNumber(row.available_to_sell),
    reorderLevel: asNumber(row.reorder_level),
    purchasePrice: asNumber(row.purchase_price),
    sellingPrice: asNumber(row.selling_price),

    demand7d: asNumber(row.demand_7d),
    demand30d: asNumber(row.demand_30d),
    demand90d: asNumber(row.demand_90d),

    outboundEvents7d: asNumber(row.outbound_events_7d),
    outboundEvents30d: asNumber(row.outbound_events_30d),
    outboundEvents90d: asNumber(row.outbound_events_90d),

    reservedDemand7d: asNumber(row.reserved_demand_7d),
    reservedDemand30d: asNumber(row.reserved_demand_30d),
    reservedDemand90d: asNumber(row.reserved_demand_90d),

    reservationEvents7d: asNumber(row.reservation_events_7d),
    reservationEvents30d: asNumber(row.reservation_events_30d),
    reservationEvents90d: asNumber(row.reservation_events_90d),

    firstOutboundAt: row.first_outbound_at,
    lastOutboundAt: row.last_outbound_at,
    historyDays: asNumber(row.history_days),

    averageDailyDemand7d: asNumber(row.average_daily_demand_7d),
    averageDailyDemand30d: asNumber(row.average_daily_demand_30d),
    averageDailyDemand90d: asNumber(row.average_daily_demand_90d),
    weightedAverageDailyDemand: asNumber(
      row.weighted_average_daily_demand,
    ),

    forecastDemand7d: asNumber(row.forecast_demand_7d),
    forecastDemand30d: asNumber(row.forecast_demand_30d),
    forecastDemand90d: asNumber(row.forecast_demand_90d),

    demandTrend: row.demand_trend,
    stockRunwayDays:
      row.stock_runway_days == null
        ? null
        : asNumber(row.stock_runway_days),
    predictedDepletionDate: row.predicted_depletion_date,
    reservationPressurePercent: asNumber(
      row.reservation_pressure_percent,
    ),

    forecastConfidenceScore: asNumber(
      row.forecast_confidence_score,
    ),
    forecastConfidence: row.forecast_confidence,
    procurementPriority: row.procurement_priority,

    suggestedReplenishmentQuantity: asNumber(
      row.suggested_replenishment_quantity,
    ),
    suggestedReorderDate: row.suggested_reorder_date,

    stockStatus: row.stock_status,
    riskScore: asNumber(row.risk_score),
    riskLevel: row.risk_level,
  }));

  const totals = items.reduce(
    (summary, item) => {
      summary.forecastDemand7d += item.forecastDemand7d;
      summary.forecastDemand30d += item.forecastDemand30d;
      summary.forecastDemand90d += item.forecastDemand90d;
      summary.suggestedReplenishmentQuantity +=
        item.suggestedReplenishmentQuantity;
      summary.estimatedReplenishmentCost +=
        item.suggestedReplenishmentQuantity * item.purchasePrice;
      return summary;
    },
    {
      forecastDemand7d: 0,
      forecastDemand30d: 0,
      forecastDemand90d: 0,
      suggestedReplenishmentQuantity: 0,
      estimatedReplenishmentCost: 0,
    },
  );

  const priorityWeight = {
    immediate: 5,
    within_7_days: 4,
    within_15_days: 3,
    within_30_days: 2,
    monitor: 1,
  } as const;

  const replenishmentItems = items
    .filter(
      (item) =>
        item.suggestedReplenishmentQuantity > 0 ||
        item.procurementPriority !== "monitor",
    )
    .sort((a, b) => {
      const priorityDifference =
        priorityWeight[b.procurementPriority] -
        priorityWeight[a.procurementPriority];

      if (priorityDifference !== 0) return priorityDifference;

      return (
        b.suggestedReplenishmentQuantity -
        a.suggestedReplenishmentQuantity
      );
    });

  const runwayItems = items.filter(
    (
      item,
    ): item is typeof item & {
      stockRunwayDays: number;
    } => item.stockRunwayDays !== null,
  );

  const minimumStockRunwayDays =
    runwayItems.length === 0
      ? null
      : Math.min(...runwayItems.map((item) => item.stockRunwayDays));

  const averageForecastConfidence =
    items.length === 0
      ? 0
      : round(
          items.reduce(
            (sum, item) => sum + item.forecastConfidenceScore,
            0,
          ) / items.length,
          1,
        );

  const counts = {
    immediate: items.filter(
      (item) => item.procurementPriority === "immediate",
    ).length,
    within7Days: items.filter(
      (item) => item.procurementPriority === "within_7_days",
    ).length,
    within15Days: items.filter(
      (item) => item.procurementPriority === "within_15_days",
    ).length,
    within30Days: items.filter(
      (item) => item.procurementPriority === "within_30_days",
    ).length,
    monitor: items.filter(
      (item) => item.procurementPriority === "monitor",
    ).length,
    increasingDemand: items.filter(
      (item) => item.demandTrend === "increasing",
    ).length,
    noDemandHistory: items.filter(
      (item) => item.demandTrend === "no_demand",
    ).length,
  };

  return {
    source: "canonical_demand_intelligence",
    generatedAt: new Date().toISOString(),
    totals: {
      forecastDemand7d: round(totals.forecastDemand7d),
      forecastDemand30d: round(totals.forecastDemand30d),
      forecastDemand90d: round(totals.forecastDemand90d),
      suggestedReplenishmentQuantity: round(
        totals.suggestedReplenishmentQuantity,
      ),
      estimatedReplenishmentCost: round(
        totals.estimatedReplenishmentCost,
      ),
      minimumStockRunwayDays,
      averageForecastConfidence,
    },
    counts,
    items,
    replenishmentItems,
  };
}
