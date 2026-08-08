"use client";

import { useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  buildProcurementPrefill,
  costProcurementIdempotencyKey,
  saveProcurementPrefillToBrowser,
} from "@/lib/cost-execution/procurement-linkage";

type PlanLine = {
  id: string;
  plan_id: string;
  item_name: string;
  line_type: string;
  quantity: number | string;
  revised_quantity?: number | string | null;
  unit: string;
  description?: string | null;
};

function plannedQty(line: PlanLine) {
  const revised = line.revised_quantity;
  if (revised !== null && revised !== undefined && revised !== "") {
    return Math.max(0, Number(revised || 0));
  }
  return Math.max(0, Number(line.quantity || 0));
}

export default function ProcurementInventoryLinkPanel({
  planId,
  line,
}: {
  planId: string;
  line: PlanLine;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [consumeQty, setConsumeQty] = useState(
    String(plannedQty(line) || "")
  );

  const isMaterial =
    line.line_type === "raw_material" ||
    line.line_type === "consumable";

  if (!isMaterial) return null;

  async function prepareProcurement() {
    setBusy(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const quantity = plannedQty(line);
      const unit = line.unit || "";

      const prefill = buildProcurementPrefill({
        sourceSystem: "bos_cost_plan_line",
        planId,
        planLineId: line.id,
        itemName: line.item_name,
        quantity,
        unit,
        notes: line.description || null,
      });

      const idempotencyKey =
        costProcurementIdempotencyKey({
          planLineId: line.id,
          quantity,
          unit,
        });

      const { data, error } = await supabase
        .from("bos_cost_procurement_handoffs")
        .upsert(
          {
            user_id: user.id,
            plan_id: planId,
            plan_line_id: line.id,
            target_route: "/rfq/new",
            status: "prepared",
            idempotency_key: idempotencyKey,
            requested_quantity: quantity,
            unit: unit || null,
            handoff_payload: prefill,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,idempotency_key" }
        )
        .select("id")
        .single();

      if (error) throw error;

      saveProcurementPrefillToBrowser(prefill);

      await supabase
        .from("bos_cost_procurement_handoffs")
        .update({
          status: "opened",
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("user_id", user.id);

      window.location.assign(
        `/rfq/new?source=cost_plan&handoff=${encodeURIComponent(
          String(data.id)
        )}`
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not prepare procurement requirement."
      );
      setBusy(false);
    }
  }

  async function prepareStockConsumption() {
    setBusy(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const quantity = Math.max(
        0,
        Number(consumeQty || 0)
      );

      if (quantity <= 0) {
        throw new Error("Enter quantity to consume.");
      }

      const { error } = await supabase
        .from("bos_cost_stock_consumption_intents")
        .insert({
          user_id: user.id,
          plan_id: planId,
          plan_line_id: line.id,
          requested_quantity: quantity,
          unit: line.unit || null,
          status: "prepared",
          note:
            "Prepared from COST-02B. Existing inventory stock is not automatically decremented until a canonical stock transaction mechanism is verified.",
        });

      if (error) throw error;

      setMessage(
        "Stock consumption intent prepared. No stock has been deducted yet."
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not prepare stock consumption."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: "1px dashed #cbd5e1",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => void prepareProcurement()}
          style={buttonStyle}
        >
          Need to Buy → RFQ
        </button>

        <input
          type="number"
          min="0"
          step="any"
          value={consumeQty}
          onChange={(event) =>
            setConsumeQty(event.target.value)
          }
          aria-label={`Quantity of ${line.item_name} to consume from owned stock`}
          style={{
            width: 100,
            minHeight: 34,
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void prepareStockConsumption()
          }
          style={buttonStyle}
        >
          Use My Stock
        </button>
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        “Need to Buy” opens the existing professional RFQ form
        for your review. “Use My Stock” only records a consumption
        intent for now; it does not silently reduce seller inventory.
      </div>

      {message ? (
        <div
          style={{
            marginTop: 7,
            fontSize: 12,
            fontWeight: 750,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: "6px 9px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 850,
  cursor: "pointer",
  fontSize: 12,
};
