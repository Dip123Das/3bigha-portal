"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialRow = {
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
  notes: string | null;
  is_active: boolean;
};

type AllocationRow = {
  material_listing_id: string;
  location_id: string;
  quantity: number | string;
  unit: string | null;
};

type TransferRow = {
  id: string;
  material_listing_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number | string;
  unit: string | null;
  note: string | null;
  created_at: string;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function titleOf(row: MaterialRow | undefined) {
  return (
    row?.title?.trim() ||
    row?.local_name?.trim() ||
    "Material"
  );
}

function numberText(value: unknown) {
  return num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
}

function locationLabel(row: LocationRow | undefined) {
  if (!row) return "Location";
  const parts = [
    row.location_name,
    row.godown_no ? `Godown ${row.godown_no}` : null,
    row.room_no ? `Room ${row.room_no}` : null,
    row.rack_no ? `Rack ${row.rack_no}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function InventoryLocationTransferPanel({
  materials,
  onTransferred,
}: {
  materials: MaterialRow[];
  onTransferred?: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [godownNo, setGodownNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [rackNo, setRackNo] = useState("");

  const [materialId, setMaterialId] = useState("");
  const [assignLocationId, setAssignLocationId] = useState("");
  const [assignQuantity, setAssignQuantity] = useState("");

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");

    const [locationResult, allocationResult, transferResult] =
      await Promise.all([
        supabase
          .from("bos_inventory_locations")
          .select(
            "id,location_code,location_name,godown_no,room_no,rack_no,notes,is_active"
          )
          .eq("is_active", true)
          .order("location_name"),
        supabase
          .from("bos_material_location_allocations")
          .select(
            "material_listing_id,location_id,quantity,unit"
          ),
        supabase
          .from("bos_inventory_location_transfers")
          .select(
            "id,material_listing_id,from_location_id,to_location_id,quantity,unit,note,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const error =
      locationResult.error ||
      allocationResult.error ||
      transferResult.error;

    if (error) {
      setMessage(error.message);
      return;
    }

    setLocations((locationResult.data || []) as LocationRow[]);
    setAllocations(
      (allocationResult.data || []) as AllocationRow[]
    );
    setTransfers((transferResult.data || []) as TransferRow[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials]
  );

  const locationById = useMemo(
    () => new Map(locations.map((item) => [item.id, item])),
    [locations]
  );

  const selectedMaterial = materialById.get(materialId);
  const canonicalStock = num(
    selectedMaterial?.attributes?.inventory?.current_stock
  );
  const stockUnit = String(
    selectedMaterial?.attributes?.inventory?.stock_unit || ""
  );

  const selectedAllocations = allocations.filter(
    (item) => item.material_listing_id === materialId
  );

  const allocatedTotal = selectedAllocations.reduce(
    (sum, item) => sum + num(item.quantity),
    0
  );

  const unallocatedStock = canonicalStock - allocatedTotal;

  const sourceAllocation = selectedAllocations.find(
    (item) => item.location_id === fromLocationId
  );

  async function createLocation() {
    if (!locationCode.trim() || !locationName.trim()) {
      setMessage("Enter a location code and location name.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("bos_inventory_locations")
        .insert({
          user_id: user.id,
          location_code: locationCode.trim(),
          location_name: locationName.trim(),
          godown_no: godownNo.trim() || null,
          room_no: roomNo.trim() || null,
          rack_no: rackNo.trim() || null,
        });

      if (error) throw error;

      setLocationCode("");
      setLocationName("");
      setGodownNo("");
      setRoomNo("");
      setRackNo("");
      setMessage("Inventory location created.");
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Could not create location.");
    } finally {
      setBusy(false);
    }
  }

  async function assignStock() {
    const quantity = num(assignQuantity);

    if (!materialId || !assignLocationId) {
      setMessage("Choose a stock item and location.");
      return;
    }

    if (quantity < 0) {
      setMessage("Allocated quantity cannot be negative.");
      return;
    }

    const confirmed = window.confirm(
      `Allocate ${numberText(quantity)} ${stockUnit} of ${titleOf(
        selectedMaterial
      )} to ${locationLabel(
        locationById.get(assignLocationId)
      )}? This does not change total stock.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "assign_bos_material_stock_location",
        {
          target_material_listing_id: materialId,
          target_location_id: assignLocationId,
          target_quantity: quantity,
        }
      );

      if (error) throw error;

      setAssignQuantity("");
      setMessage(
        `Location allocation saved. Unallocated stock: ${numberText(
          data?.unallocated_quantity
        )} ${data?.unit || stockUnit}.`
      );
      await load();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not assign stock location."
      );
    } finally {
      setBusy(false);
    }
  }

  async function transferStock() {
    const quantity = num(transferQuantity);

    if (
      !materialId ||
      !fromLocationId ||
      !toLocationId ||
      quantity <= 0
    ) {
      setMessage(
        "Choose material, source, destination and transfer quantity."
      );
      return;
    }

    if (fromLocationId === toLocationId) {
      setMessage("Choose a different destination location.");
      return;
    }

    const confirmed = window.confirm(
      `Move ${numberText(quantity)} ${stockUnit} of ${titleOf(
        selectedMaterial
      )} from ${locationLabel(
        locationById.get(fromLocationId)
      )} to ${locationLabel(
        locationById.get(toLocationId)
      )}? Total stock will remain unchanged.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "transfer_bos_material_between_locations",
        {
          target_material_listing_id: materialId,
          target_from_location_id: fromLocationId,
          target_to_location_id: toLocationId,
          target_quantity: quantity,
          target_note: transferNote.trim() || null,
        }
      );

      if (error) throw error;

      setTransferQuantity("");
      setTransferNote("");
      setMessage(
        `Transfer posted. Total canonical stock remains ${numberText(
          data?.canonical_stock_after
        )} ${data?.unit || stockUnit}.`
      );

      await load();
      await onTransferred?.();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not transfer stock."
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
        background: "#fff",
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
        Stock Location Control
      </div>

      <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>
        Know where stock is kept
      </h2>

      <p
        style={{
          margin: "7px 0 0",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#64748b",
          fontWeight: 700,
        }}
      >
        Create godown, room or rack locations, allocate existing
        stock to them, and transfer stock internally. Location
        quantities are subordinate to the canonical total stock.
      </p>

      <div style={sectionBox}>
        <strong>Create a location</strong>
        <div style={gridStyle}>
          <input
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            placeholder="Location code e.g. GD-01"
            style={inputStyle}
          />
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Location name"
            style={inputStyle}
          />
          <input
            value={godownNo}
            onChange={(e) => setGodownNo(e.target.value)}
            placeholder="Godown no."
            style={inputStyle}
          />
          <input
            value={roomNo}
            onChange={(e) => setRoomNo(e.target.value)}
            placeholder="Room no."
            style={inputStyle}
          />
          <input
            value={rackNo}
            onChange={(e) => setRackNo(e.target.value)}
            placeholder="Rack no."
            style={inputStyle}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void createLocation()}
            style={primaryButton}
          >
            Create Location
          </button>
        </div>
      </div>

      <div style={sectionBox}>
        <strong>Allocate current stock to locations</strong>
        <div style={gridStyle}>
          <select
            value={materialId}
            onChange={(e) => {
              setMaterialId(e.target.value);
              setFromLocationId("");
              setToLocationId("");
              setMessage("");
            }}
            style={inputStyle}
          >
            <option value="">Choose stock item…</option>
            {materials.map((item) => (
              <option key={item.id} value={item.id}>
                {titleOf(item)}
              </option>
            ))}
          </select>

          <select
            value={assignLocationId}
            onChange={(e) =>
              setAssignLocationId(e.target.value)
            }
            style={inputStyle}
          >
            <option value="">Choose location…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {locationLabel(location)}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="any"
            value={assignQuantity}
            onChange={(e) => setAssignQuantity(e.target.value)}
            placeholder={`Quantity${stockUnit ? ` (${stockUnit})` : ""}`}
            style={inputStyle}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => void assignStock()}
            style={secondaryButton}
          >
            Save Allocation
          </button>
        </div>

        {materialId ? (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 8,
            }}
          >
            <Metric
              label="Canonical Stock"
              value={`${numberText(canonicalStock)} ${stockUnit}`}
            />
            <Metric
              label="Allocated"
              value={`${numberText(allocatedTotal)} ${stockUnit}`}
            />
            <Metric
              label="Unallocated"
              value={`${numberText(unallocatedStock)} ${stockUnit}`}
            />
          </div>
        ) : null}

        {selectedAllocations.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            {selectedAllocations.map((allocation) => (
              <div key={allocation.location_id} style={allocationRow}>
                <span>
                  {locationLabel(
                    locationById.get(allocation.location_id)
                  )}
                </span>
                <strong>
                  {numberText(allocation.quantity)}{" "}
                  {allocation.unit || stockUnit}
                </strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={sectionBox}>
        <strong>Transfer between locations</strong>
        <div style={gridStyle}>
          <select
            value={fromLocationId}
            onChange={(e) =>
              setFromLocationId(e.target.value)
            }
            style={inputStyle}
          >
            <option value="">From location…</option>
            {selectedAllocations
              .filter((item) => num(item.quantity) > 0)
              .map((allocation) => (
                <option
                  key={allocation.location_id}
                  value={allocation.location_id}
                >
                  {locationLabel(
                    locationById.get(allocation.location_id)
                  )}{" "}
                  · {numberText(allocation.quantity)}{" "}
                  {allocation.unit || stockUnit}
                </option>
              ))}
          </select>

          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            style={inputStyle}
          >
            <option value="">To location…</option>
            {locations
              .filter((location) => location.id !== fromLocationId)
              .map((location) => (
                <option key={location.id} value={location.id}>
                  {locationLabel(location)}
                </option>
              ))}
          </select>

          <input
            type="number"
            min="0"
            step="any"
            value={transferQuantity}
            onChange={(e) =>
              setTransferQuantity(e.target.value)
            }
            placeholder={`Transfer quantity${
              stockUnit ? ` (${stockUnit})` : ""
            }`}
            style={inputStyle}
          />

          <input
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            placeholder="Transfer note (optional)"
            style={inputStyle}
          />

          <button
            type="button"
            disabled={busy || !sourceAllocation}
            onClick={() => void transferStock()}
            style={primaryButton}
          >
            Confirm Internal Transfer
          </button>
        </div>
      </div>

      {message ? (
        <div role="status" style={messageStyle}>
          {message}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          fontSize: 14,
          fontWeight: 950,
        }}
      >
        Recent Internal Transfers
      </div>

      <div style={{ marginTop: 8, overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 850,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {[
                "When",
                "Stock Item",
                "From",
                "To",
                "Quantity",
                "Note",
              ].map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} style={emptyStyle}>
                  No internal stock transfer recorded yet.
                </td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td style={tdStyle}>
                    {new Date(
                      transfer.created_at
                    ).toLocaleString("en-IN")}
                  </td>
                  <td style={tdStyle}>
                    <strong>
                      {titleOf(
                        materialById.get(
                          transfer.material_listing_id
                        )
                      )}
                    </strong>
                  </td>
                  <td style={tdStyle}>
                    {locationLabel(
                      locationById.get(
                        transfer.from_location_id
                      )
                    )}
                  </td>
                  <td style={tdStyle}>
                    {locationLabel(
                      locationById.get(
                        transfer.to_location_id
                      )
                    )}
                  </td>
                  <td style={tdStyle}>
                    {numberText(transfer.quantity)}{" "}
                    {transfer.unit || ""}
                  </td>
                  <td style={tdStyle}>
                    {transfer.note || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 10,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.55,
        }}
      >
        Location allocation is not another inventory balance.
        Canonical material stock remains authoritative. Internal
        transfers post paired <strong>transfer_out</strong> and{" "}
        <strong>transfer_in</strong> transactions in one atomic
        operation, so total stock is unchanged.
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={metricStyle}>
      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: 16,
          fontWeight: 950,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const sectionBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const gridStyle: React.CSSProperties = {
  marginTop: 9,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(170px,1fr))",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  minHeight: 40,
  padding: "8px 11px",
  border: 0,
  borderRadius: 9,
  background: "#0f766e",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  minHeight: 40,
  padding: "8px 11px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 850,
  cursor: "pointer",
};

const allocationRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "7px 0",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
};

const metricStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const messageStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 9,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 12,
  fontWeight: 800,
};

const thStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #cbd5e1",
  textAlign: "left",
  fontSize: 11,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  verticalAlign: "top",
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  color: "#64748b",
  fontSize: 12,
};
