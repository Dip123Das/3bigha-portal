"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  createCostInventoryHandoffDraft,
  handoffNeedsHumanConfirmation,
} from "@/lib/cost-execution/inventory-handoff";
import type {
  CostOperatingMode,
  CostOutputType,
} from "@/lib/cost-execution/cost-foundation";

type OutputRow = {
  id: string;
  plan_id: string;
  output_type: CostOutputType;
  output_name: string;
  completed_quantity: number | string;
  allocated_cost: number | string;
  unit_production_cost: number | string;
  completion_status: string;
  target_inventory_type: string | null;
  target_inventory_reference_id: string | null;
};

export default function FinishedOutputHandoffPanel({
  mode,
  planId,
  projectId,
  outputs,
  onChanged,
}: {
  mode: CostOperatingMode;
  planId: string;
  projectId?: string | null;
  outputs: OutputRow[];
  onChanged?: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const eligible = outputs.filter(
    (output) =>
      output.completion_status === "ready_for_inventory" ||
      output.completion_status === "completed"
  );

  async function prepare(output: OutputRow) {
    setBusyId(output.id);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const draft = createCostInventoryHandoffDraft({
        userId: user.id,
        planId,
        outputId: output.id,
        mode,
        outputType: output.output_type,
        outputName: output.output_name,
        completedQuantity: Number(output.completed_quantity || 0),
        allocatedCost: Number(output.allocated_cost || 0),
        unitProductionCost: Number(output.unit_production_cost || 0),
        projectId,
      });

      if (!draft) {
        throw new Error(
          "This output is not ready for a supported existing inventory."
        );
      }

      const { data, error } = await supabase
        .from("bos_cost_inventory_handoffs")
        .upsert(
          {
            user_id: user.id,
            plan_id: draft.planId,
            output_id: draft.outputId,
            target_inventory_type: draft.targetInventory,
            target_route: draft.targetRoute,
            idempotency_key: draft.idempotencyKey,
            handoff_payload: draft.payload,
            status: "prepared",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,idempotency_key",
          }
        )
        .select("id,target_route,status")
        .single();

      if (error) throw error;

      await supabase
        .from("bos_cost_outputs")
        .update({
          completion_status: "ready_for_inventory",
          target_inventory_type: draft.targetInventory,
        })
        .eq("id", output.id)
        .eq("plan_id", planId);

      const separator =
        String(data.target_route).includes("?") ? "&" : "?";

      const destination =
        `${data.target_route}${separator}` +
        `handoff=${encodeURIComponent(data.id)}`;

      setMessage(
        handoffNeedsHumanConfirmation()
          ? "Handoff prepared. Open the existing inventory form and confirm the destination record."
          : "Handoff prepared."
      );

      window.location.assign(destination);
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not prepare the inventory handoff."
      );
    } finally {
      setBusyId(null);
      await onChanged?.();
    }
  }

  if (eligible.length === 0) return null;

  return (
    <section
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#15803d",
        }}
      >
        Finished Output
      </div>

      <h2 style={{ margin: "6px 0 0" }}>
        Move completed work into your existing inventory
      </h2>

      <p style={{ color: "#475569", lineHeight: 1.6 }}>
        Nothing is added automatically. You review the completed output,
        open the existing inventory form and confirm the destination record.
        This prevents duplicate stock or property units.
      </p>

      {message ? (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            background: "#fff",
            borderRadius: 10,
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {eligible.map((output) => {
          const sellable =
            output.output_type !== "non_sellable_project_asset";

          if (!sellable) {
            return (
              <div
                key={output.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "#fff",
                }}
              >
                <strong>{output.output_name}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  Project infrastructure / non-sellable asset — remains in
                  project costing and does not move to seller inventory.
                </div>
              </div>
            );
          }

          return (
            <div
              key={output.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div>
                <strong>{output.output_name}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  Completed: {Number(output.completed_quantity || 0)} ·
                  Unit cost: ₹
                  {Number(
                    output.unit_production_cost || 0
                  ).toLocaleString("en-IN")}
                </div>
              </div>

              <button
                type="button"
                disabled={busyId === output.id}
                onClick={() => void prepare(output)}
                style={{
                  minHeight: 40,
                  padding: "8px 13px",
                  borderRadius: 10,
                  border: 0,
                  background: "#15803d",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {busyId === output.id
                  ? "Preparing…"
                  : "Review & Move to Inventory →"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
        <Link href="/dashboard/workspace">
          Back to My 3BOS Workspace
        </Link>
      </div>
    </section>
  );
}
