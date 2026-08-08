"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialStockRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type LocationRow = {
  id: string;
  location_code: string;
  location_name: string;
  godown_no: string | null;
  room_no: string | null;
  rack_no: string | null;
};

type AllocationRow = {
  material_listing_id: string;
  location_id: string;
  quantity: number | string;
  unit: string | null;
};

type MovementType =
  | "purchase_receipt"
  | "customer_return"
  | "material_return"
  | "damage"
  | "loss"
  | "stock_adjustment_in"
  | "stock_adjustment_out";

const MOVEMENTS: Array<{
  value: MovementType;
  label: string;
  hint: string;
  direction: "in" | "out";
}> = [
  {
    value: "purchase_receipt",
    label: "Purchase / Stock Received",
    hint: "Add stock received from purchase or procurement.",
    direction: "in",
  },
  {
    value: "customer_return",
    label: "Customer Return",
    hint: "Add goods returned by a customer.",
    direction: "in",
  },
  {
    value: "material_return",
    label: "Material Returned",
    hint: "Add unused material returned from a project or production job.",
    direction: "in",
  },
  {
    value: "damage",
    label: "Damaged Stock",
    hint: "Reduce stock because items were damaged.",
    direction: "out",
  },
  {
    value: "loss",
    label: "Lost / Missing Stock",
    hint: "Reduce stock because items were lost or missing.",
    direction: "out",
  },
  {
    value: "stock_adjustment_in",
    label: "Stock Correction +",
    hint: "Human-approved positive stock correction.",
    direction: "in",
  },
  {
    value: "stock_adjustment_out",
    label: "Stock Correction −",
    hint: "Human-approved negative stock correction.",
    direction: "out",
  },
];

function titleOf(item: MaterialStockRow) {
  return (
    item.title?.trim() ||
    item.local_name?.trim() ||
    "Material Stock"
  );
}

function locationLabel(row: LocationRow) {
  return [
    row.location_name,
    row.godown_no ? `Godown ${row.godown_no}` : null,
    row.room_no ? `Room ${row.room_no}` : null,
    row.rack_no ? `Rack ${row.rack_no}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function InventoryTransactionPanel({
  materials,
  onPosted,
}: {
  materials: MaterialStockRow[];
  onPosted?: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);

  const [materialId, setMaterialId] = useState("");
  const [movementType, setMovementType] =
    useState<MovementType>("purchase_receipt");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadLocations() {
    const [locationResult, allocationResult] = await Promise.all([
      supabase
        .from("bos_inventory_locations")
        .select(
          "id,location_code,location_name,godown_no,room_no,rack_no"
        )
        .eq("is_active", true)
        .order("location_name"),
      supabase
        .from("bos_material_location_allocations")
        .select("material_listing_id,location_id,quantity,unit"),
    ]);

    if (locationResult.error || allocationResult.error) return;

    setLocations((locationResult.data || []) as LocationRow[]);
    setAllocations(
      (allocationResult.data || []) as AllocationRow[]
    );
  }

  useEffect(() => {
    void loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = materials.find(
    (item) => item.id === materialId
  );
  const inventory = selected?.attributes?.inventory || {};
  const stockUnit = String(inventory.stock_unit || "");
  const currentStock = Number(inventory.current_stock || 0);
  const movement =
    MOVEMENTS.find((item) => item.value === movementType) ||
    MOVEMENTS[0];

  const locationAllocation = allocations.find(
    (item) =>
      item.material_listing_id === materialId &&
      item.location_id === locationId
  );

  const selectedLocationStock = num(
    locationAllocation?.quantity
  );

  async function postMovement() {
    if (!materialId) {
      setMessage("Choose a stock item.");
      return;
    }

    const qty = Math.max(0, Number(quantity || 0));
    if (qty <= 0) {
      setMessage("Enter a quantity greater than zero.");
      return;
    }

    if (locations.length > 0 && !locationId) {
      setMessage(
        "Choose the physical location for this stock movement."
      );
      return;
    }

    if (
      movement.direction === "out" &&
      locationId &&
      selectedLocationStock < qty
    ) {
      setMessage(
        `Selected location has only ${selectedLocationStock} ${
          stockUnit || "unit"
        }.`
      );
      return;
    }

    const locationText = locationId
      ? locationLabel(
          locations.find((item) => item.id === locationId)!
        )
      : "Unallocated stock";

    const confirmed = window.confirm(
      `${movement.label}: ${qty} ${stockUnit || "unit"} for ${titleOf(
        selected!
      )} at ${locationText}? Current total stock: ${currentStock}.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const idempotencyKey =
        `inventory-manual:${materialId}:${movementType}:` +
        `${Date.now()}:${crypto.randomUUID()}`;

      const { data, error } = await supabase.rpc(
        "post_bos_material_inventory_transaction",
        {
          target_material_listing_id: materialId,
          target_transaction_type: movementType,
          target_quantity: qty,
          target_unit: stockUnit || null,
          target_unit_cost:
            unitCost.trim() === ""
              ? null
              : Math.max(0, Number(unitCost || 0)),
          target_source_module: "inventory",
          target_source_reference_type: "manual_stock_update",
          target_source_reference_id: null,
          target_idempotency_key: idempotencyKey,
          target_note: note.trim() || movement.hint,
          target_metadata: {
            human_confirmed: true,
            previous_visible_stock: currentStock,
            ...(locationId ? { location_id: locationId } : {}),
          },
        }
      );

      if (error) throw error;

      setMessage(
        `Stock updated successfully. New total stock: ${
          data?.stock_after ?? "updated"
        }.${
          data?.location_quantity_after != null
            ? ` Location stock: ${data.location_quantity_after}.`
            : ""
        }`
      );

      setQuantity("");
      setUnitCost("");
      setNote("");
      await loadLocations();
      await onPosted?.();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not update inventory stock."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 18,
        border: "1px solid #cbd5e1",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#475569",
        }}
      >
        Inventory Transaction
      </div>

      <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>
        Update stock with a reason and location
      </h2>

      <p
        style={{
          marginTop: 7,
          color: "#64748b",
          lineHeight: 1.6,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        Stock receipts, returns, damage, loss and corrections can
        now be tied to the exact godown, room or rack. Total stock
        still changes only through the canonical inventory ledger.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 9,
          marginTop: 12,
        }}
      >
        <select
          value={materialId}
          onChange={(event) => {
            setMaterialId(event.target.value);
            setLocationId("");
            setMessage("");
          }}
          style={inputStyle}
        >
          <option value="">Choose stock item…</option>
          {materials.map((item) => {
            const inv = item.attributes?.inventory || {};
            return (
              <option key={item.id} value={item.id}>
                {titleOf(item)} · {Number(inv.current_stock || 0)}{" "}
                {String(inv.stock_unit || "")}
              </option>
            );
          })}
        </select>

        <select
          value={movementType}
          onChange={(event) =>
            setMovementType(event.target.value as MovementType)
          }
          style={inputStyle}
        >
          {MOVEMENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          style={inputStyle}
        >
          <option value="">
            {locations.length > 0
              ? "Choose physical location…"
              : "No locations created yet"}
          </option>
          {locations.map((location) => {
            const allocation = allocations.find(
              (item) =>
                item.material_listing_id === materialId &&
                item.location_id === location.id
            );

            return (
              <option key={location.id} value={location.id}>
                {locationLabel(location)}
                {materialId
                  ? ` · ${num(allocation?.quantity)} ${stockUnit}`
                  : ""}
              </option>
            );
          })}
        </select>

        <input
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder={`Quantity${stockUnit ? ` (${stockUnit})` : ""}`}
          style={inputStyle}
        />

        <input
          type="number"
          min="0"
          step="any"
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
          placeholder="Unit cost ₹ (optional)"
          style={inputStyle}
        />

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason / note"
          style={inputStyle}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => void postMovement()}
          style={buttonStyle}
        >
          {busy ? "Posting…" : "Confirm Stock Update"}
        </button>
      </div>

      {locationId && materialId ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#475569",
            fontWeight: 800,
          }}
        >
          Selected location stock: {selectedLocationStock}{" "}
          {stockUnit}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        {movement.hint}
      </div>

      {message ? (
        <div
          role="status"
          style={{
            marginTop: 10,
            padding: 9,
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 40,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 40,
  border: 0,
  borderRadius: 9,
  padding: "8px 12px",
  background: "#0f766e",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
