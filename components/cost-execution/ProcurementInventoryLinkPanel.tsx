"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  buildProcurementPrefill,
  costProcurementIdempotencyKey,
  saveProcurementPrefillToBrowser,
} from "@/lib/cost-execution/procurement-linkage";

type OwnedStockItem = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type InventoryLocationRow = {
  id: string;
  location_name: string;
  godown_no: string | null;
  room_no: string | null;
  rack_no: string | null;
};

type LocationAllocationRow = {
  material_listing_id: string;
  location_id: string;
  quantity: number | string;
  unit: string | null;
};

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
  const [ownedStock, setOwnedStock] = useState<OwnedStockItem[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locations, setLocations] = useState<InventoryLocationRow[]>([]);
  const [allocations, setAllocations] = useState<LocationAllocationRow[]>([]);
  const [preparedIntentId, setPreparedIntentId] = useState<string | null>(null);

  const isMaterial =
    line.line_type === "raw_material" ||
    line.line_type === "consumable";

  useEffect(() => {
    let active = true;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [stockResult, locationResult, allocationResult] = await Promise.all([
        supabase
          .from("material_listings")
          .select("id,title,local_name,attributes")
          .eq("vendor_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("bos_inventory_locations")
          .select("id,location_name,godown_no,room_no,rack_no")
          .eq("is_active", true)
          .order("location_name"),
        supabase
          .from("bos_material_location_allocations")
          .select("material_listing_id,location_id,quantity,unit"),
      ]);

      if (active) {
        setOwnedStock((stockResult.data || []) as OwnedStockItem[]);
        setLocations((locationResult.data || []) as InventoryLocationRow[]);
        setAllocations((allocationResult.data || []) as LocationAllocationRow[]);
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

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

      const quantity = Math.max(0, Number(consumeQty || 0));
      if (quantity <= 0) {
        throw new Error("Enter quantity to consume.");
      }
      if (!selectedStockId) {
        throw new Error("Choose the inventory item to use.");
      }
      if (locations.length > 0 && !selectedLocationId) {
        throw new Error("Choose the physical stock location to use.");
      }

      const { data, error } = await supabase
        .from("bos_cost_stock_consumption_intents")
        .insert({
          user_id: user.id,
          plan_id: planId,
          plan_line_id: line.id,
          material_listing_id: selectedStockId,
          location_id: selectedLocationId || null,
          requested_quantity: quantity,
          unit: line.unit || null,
          status: "prepared",
          note:
            "Prepared for canonical 3BOS stock issue posting.",
        })
        .select("id")
        .single();

      if (error) throw error;

      setPreparedIntentId(String(data.id));
      setMessage(
        "Stock issue prepared. Review the selected stock and click Post Stock Issue."
      );
    } catch (error: any) {
      setMessage(
        error?.message || "Could not prepare stock consumption."
      );
    } finally {
      setBusy(false);
    }
  }

  async function postPreparedStockIssue() {
    if (!preparedIntentId) {
      setMessage("Prepare the stock issue first.");
      return;
    }

    const chosen = ownedStock.find(
      (item) => item.id === selectedStockId
    );
    const inventory = chosen?.attributes?.inventory;
    const available = Number(inventory?.current_stock || 0);
    const locationAllocation = allocations.find(
      (row) =>
        row.material_listing_id === selectedStockId &&
        row.location_id === selectedLocationId
    );
    const locationAvailable = Number(locationAllocation?.quantity || 0);

    const confirmed = window.confirm(
      `Issue ${consumeQty} ${line.unit || "unit"} of ${line.item_name} from selected inventory? Total stock: ${available}.${selectedLocationId ? ` Selected location stock: ${locationAvailable}.` : ""} This will reduce inventory and add the material cost to this BOM/BOQ line.`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "post_bos_cost_stock_consumption",
        { target_intent_id: preparedIntentId }
      );

      if (error) throw error;

      setMessage(
        data?.already_posted
          ? "This stock issue was already posted."
          : `Stock issued successfully. Remaining stock: ${data?.stock_after ?? "updated"}.`
      );

      setPreparedIntentId(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: refreshed } = await supabase
          .from("material_listings")
          .select("id,title,local_name,attributes")
          .eq("vendor_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(300);

        setOwnedStock((refreshed || []) as OwnedStockItem[]);
      }
    } catch (error: any) {
      setMessage(
        error?.message || "Could not post the stock issue."
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

        <select
          value={selectedStockId}
          onChange={(event) => {
            setSelectedStockId(event.target.value);
            setSelectedLocationId("");
            setPreparedIntentId(null);
          }}
          aria-label="Owned inventory item"
          style={selectStyle}
        >
          <option value="">Choose owned stock…</option>
          {ownedStock.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || item.local_name || "Material"}
            </option>
          ))}
        </select>

        <select
          value={selectedLocationId}
          onChange={(event) => {
            setSelectedLocationId(event.target.value);
            setPreparedIntentId(null);
          }}
          aria-label="Physical stock location"
          style={selectStyle}
        >
          <option value="">
            {locations.length > 0
              ? "Choose stock location…"
              : "No stock locations configured"}
          </option>
          {locations.map((location) => {
            const allocation = allocations.find(
              (row) =>
                row.material_listing_id === selectedStockId &&
                row.location_id === location.id
            );
            const label = [
              location.location_name,
              location.godown_no ? `Godown ${location.godown_no}` : null,
              location.room_no ? `Room ${location.room_no}` : null,
              location.rack_no ? `Rack ${location.rack_no}` : null,
            ].filter(Boolean).join(" · ");

            return (
              <option key={location.id} value={location.id}>
                {label}{selectedStockId ? ` · ${Number(allocation?.quantity || 0)} ${allocation?.unit || line.unit || ""}` : ""}
              </option>
            );
          })}
        </select>

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

const selectStyle: React.CSSProperties = {
  minHeight: 34,
  minWidth: 180,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
};

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
