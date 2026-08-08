import type { CostOperatingMode, CostOutputType } from "./cost-foundation";
import { targetInventoryForOutput } from "./cost-foundation";

export type CostInventoryHandoffTarget =
  | "seller_material_inventory"
  | "builder_property_unit_inventory";

export type CostInventoryHandoffDraft = {
  outputId: string;
  planId: string;
  targetInventory: CostInventoryHandoffTarget;
  targetRoute: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export function inventoryRouteForOutput(input: {
  mode: CostOperatingMode;
  outputType: CostOutputType;
  projectId?: string | null;
}): string | null {
  const target = targetInventoryForOutput(
    input.mode,
    input.outputType
  );

  if (target === "seller_material_inventory") {
    return "/materials/add?inventory=1&source=cost_output";
  }

  if (target === "builder_property_unit_inventory") {
    const projectId = String(input.projectId || "").trim();
    if (!projectId) return null;

    return `/property/builder/projects/${encodeURIComponent(
      projectId
    )}/units/add?source=cost_output`;
  }

  return null;
}

export function createCostInventoryHandoffDraft(input: {
  userId: string;
  planId: string;
  outputId: string;
  mode: CostOperatingMode;
  outputType: CostOutputType;
  outputName: string;
  completedQuantity: number;
  allocatedCost: number;
  unitProductionCost: number;
  projectId?: string | null;
}): CostInventoryHandoffDraft | null {
  const targetInventory = targetInventoryForOutput(
    input.mode,
    input.outputType
  );

  if (!targetInventory) return null;

  const targetRoute = inventoryRouteForOutput({
    mode: input.mode,
    outputType: input.outputType,
    projectId: input.projectId,
  });

  if (!targetRoute) return null;

  const idempotencyKey =
    `cost-output:${input.outputId}:${targetInventory}`;

  return {
    outputId: input.outputId,
    planId: input.planId,
    targetInventory,
    targetRoute,
    idempotencyKey,
    payload: {
      sourceSystem: "bos_cost_output",
      sourceOutputId: input.outputId,
      sourcePlanId: input.planId,
      outputName: input.outputName,
      completedQuantity: input.completedQuantity,
      allocatedCost: input.allocatedCost,
      unitProductionCost: input.unitProductionCost,
      outputType: input.outputType,
      operatingMode: input.mode,
    },
  };
}

export function handoffNeedsHumanConfirmation() {
  return true as const;
}
