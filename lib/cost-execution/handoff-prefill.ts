"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CostInventoryHandoffPrefill = {
  handoffId: string;
  outputId: string;
  planId: string;
  targetInventory:
    | "seller_material_inventory"
    | "builder_property_unit_inventory";
  status: string;
  payload: {
    sourceSystem?: string;
    sourceOutputId?: string;
    sourcePlanId?: string;
    outputName?: string;
    completedQuantity?: number;
    allocatedCost?: number;
    unitProductionCost?: number;
    outputType?: string;
    operatingMode?: string;
    [key: string]: unknown;
  };
};

export function getHandoffIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("handoff");
  return value?.trim() || null;
}

export async function loadCostInventoryHandoff(
  supabase: SupabaseClient,
  handoffId: string,
  expectedTarget:
    | "seller_material_inventory"
    | "builder_property_unit_inventory"
): Promise<CostInventoryHandoffPrefill> {
  const { data, error } = await supabase
    .from("bos_cost_inventory_handoffs")
    .select(
      "id,plan_id,output_id,target_inventory,status,handoff_payload"
    )
    .eq("id", handoffId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Inventory handoff was not found.");

  if (data.target_inventory !== expectedTarget) {
    throw new Error("This handoff belongs to a different inventory workflow.");
  }

  if (data.status === "confirmed") {
    throw new Error("This finished output has already been moved to inventory.");
  }

  if (data.status === "cancelled") {
    throw new Error("This inventory handoff was cancelled.");
  }

  await supabase
    .from("bos_cost_inventory_handoffs")
    .update({
      status: "opened",
      opened_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", handoffId)
    .in("status", ["prepared", "opened"]);

  return {
    handoffId: String(data.id),
    outputId: String(data.output_id),
    planId: String(data.plan_id),
    targetInventory: data.target_inventory,
    status: String(data.status),
    payload:
      data.handoff_payload && typeof data.handoff_payload === "object"
        ? data.handoff_payload
        : {},
  };
}

export async function confirmCostInventoryHandoff(input: {
  supabase: SupabaseClient;
  handoff: CostInventoryHandoffPrefill;
  destinationRecordIds: string[];
  transferredQuantity: number;
}) {
  const ids = Array.from(
    new Set(
      input.destinationRecordIds
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    throw new Error("Destination inventory record was not created.");
  }

  const now = new Date().toISOString();

  const { error: handoffError } = await input.supabase
    .from("bos_cost_inventory_handoffs")
    .update({
      status: "confirmed",
      destination_record_id: ids[0],
      destination_record_ids: ids,
      confirmed_at: now,
      updated_at: now,
    })
    .eq("id", input.handoff.handoffId)
    .in("status", ["prepared", "opened"]);

  if (handoffError) throw handoffError;

  const { error: outputError } = await input.supabase
    .from("bos_cost_outputs")
    .update({
      completion_status: "transferred",
      target_inventory_type: input.handoff.targetInventory,
      target_inventory_reference_id: ids[0],
      transferred_quantity: Math.max(
        0,
        Number(input.transferredQuantity || 0)
      ),
      transferred_at: now,
      updated_at: now,
    })
    .eq("id", input.handoff.outputId)
    .eq("plan_id", input.handoff.planId);

  if (outputError) throw outputError;
}
