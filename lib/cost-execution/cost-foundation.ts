export type CostOperatingMode = "product" | "project";

export type ProductCostOutputType = "finished_good";

export type ProjectCostOutputType =
  | "apartment"
  | "land_plot"
  | "shop"
  | "office"
  | "commercial_unit"
  | "villa"
  | "house"
  | "other_sellable_unit"
  | "non_sellable_project_asset";

export type CostOutputType =
  | ProductCostOutputType
  | ProjectCostOutputType;

export type CostEntryType =
  | "purchase"
  | "material_issue"
  | "material_return"
  | "wage"
  | "salary"
  | "electricity"
  | "fuel"
  | "equipment"
  | "rental"
  | "service"
  | "professional_fee"
  | "subcontract"
  | "transport"
  | "statutory_fee"
  | "finance_cost"
  | "overhead"
  | "tax"
  | "adjustment"
  | "other";

export type CostLineInput = {
  quantity: number;
  rate: number;
  wastagePercent?: number;
};

export type ConstructionEstimateCostSource = {
  sourceSystem: "construction_cost_calculator";
  sourceEntityType: "construction_project";
  sourceEntityId: string;
  sourceSnapshotId?: string | null;
};

function finiteNonNegative(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

export function calculateCostLineAmount(input: CostLineInput): number {
  const quantity = finiteNonNegative(input.quantity);
  const rate = finiteNonNegative(input.rate);
  const wastagePercent = finiteNonNegative(input.wastagePercent);

  const effectiveQuantity = quantity * (1 + wastagePercent / 100);
  return Math.round(effectiveQuantity * rate * 100) / 100;
}

export function calculateUnitProductionCost(
  totalActualCost: unknown,
  completedQuantity: unknown
): number {
  const cost = finiteNonNegative(totalActualCost);
  const quantity = finiteNonNegative(completedQuantity);

  if (quantity <= 0) return 0;
  return Math.round((cost / quantity) * 10000) / 10000;
}

export function requiredCapabilityForCostMode(
  mode: CostOperatingMode
): "product_costing" | "project_costing" {
  return mode === "product"
    ? "product_costing"
    : "project_costing";
}

export function secondaryStructureCapabilityForCostMode(
  mode: CostOperatingMode
): "bom" | "boq" {
  return mode === "product" ? "bom" : "boq";
}

export function targetInventoryForOutput(
  mode: CostOperatingMode,
  outputType: CostOutputType
): "seller_material_inventory" | "builder_property_unit_inventory" | null {
  if (mode === "product") {
    return outputType === "finished_good"
      ? "seller_material_inventory"
      : null;
  }

  if (outputType === "non_sellable_project_asset") {
    return null;
  }

  return "builder_property_unit_inventory";
}

export function constructionEstimateCostSource(
  projectId: string,
  snapshotId?: string | null
): ConstructionEstimateCostSource {
  const cleanProjectId = String(projectId || "").trim();

  if (!cleanProjectId) {
    throw new Error(
      "Construction estimate source requires a saved construction project."
    );
  }

  return {
    sourceSystem: "construction_cost_calculator",
    sourceEntityType: "construction_project",
    sourceEntityId: cleanProjectId,
    sourceSnapshotId: String(snapshotId || "").trim() || null,
  };
}
