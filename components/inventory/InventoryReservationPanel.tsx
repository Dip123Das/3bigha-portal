"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type AtsRow = {
  material_listing_id: string;
  on_hand_stock: number | string;
  reserved_stock: number | string;
  available_to_sell: number | string;
  unit: string | null;
};

type ReservationRow = {
  id: string;
  material_listing_id: string;
  reserved_quantity: number | string;
  released_quantity: number | string;
  unit: string | null;
  status: string;
  source_module: string | null;
  source_reference_type: string | null;
  source_reference_id: string | null;
  note: string | null;
  expires_at: string | null;
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

export default function InventoryReservationPanel({
  materials,
}: {
  materials: MaterialRow[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [atsRows, setAtsRows] = useState<AtsRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");

    const [atsResult, reservationResult] = await Promise.all([
      supabase
        .from("bos_material_available_to_sell")
        .select(
          "material_listing_id,on_hand_stock,reserved_stock,available_to_sell,unit"
        )
        .order("available_to_sell", { ascending: true }),
      supabase
        .from("bos_material_inventory_reservations")
        .select(
          "id,material_listing_id,reserved_quantity,released_quantity,unit,status,source_module,source_reference_type,source_reference_id,note,expires_at,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const error = atsResult.error || reservationResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }

    setAtsRows((atsResult.data || []) as AtsRow[]);
    setReservations(
      (reservationResult.data || []) as ReservationRow[]
    );
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials]
  );

  const atsById = useMemo(
    () => new Map(atsRows.map((row) => [row.material_listing_id, row])),
    [atsRows]
  );

  const selectedAts = materialId ? atsById.get(materialId) : undefined;

  async function reserve() {
    const qty = num(quantity);

    if (!materialId) {
      setMessage("Choose the stock item to reserve.");
      return;
    }

    if (qty <= 0) {
      setMessage("Enter a reservation quantity greater than zero.");
      return;
    }

    const available = num(selectedAts?.available_to_sell);
    if (qty > available) {
      setMessage(
        `Only ${numberText(available)} ${selectedAts?.unit || ""} is available to sell.`
      );
      return;
    }

    const material = materialById.get(materialId);

    const confirmed = window.confirm(
      `Reserve ${numberText(qty)} ${selectedAts?.unit || ""} of ${titleOf(
        material
      )}? Physical on-hand stock will NOT change.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "reserve_bos_material_inventory",
        {
          target_material_listing_id: materialId,
          target_quantity: qty,
          target_source_module: "inventory",
          target_source_reference_type: "manual_reservation",
          target_source_reference_id: reference.trim() || null,
          target_note: note.trim() || null,
          target_expires_at: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
        }
      );

      if (error) throw error;

      setMessage(
        `Reservation created. Available to sell: ${numberText(
          data?.available_after
        )} ${data?.unit || selectedAts?.unit || ""}.`
      );

      setQuantity("");
      setReference("");
      setNote("");
      setExpiresAt("");
      await load();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not create stock reservation."
      );
    } finally {
      setBusy(false);
    }
  }

  async function release(reservation: ReservationRow) {
    const remaining =
      num(reservation.reserved_quantity) -
      num(reservation.released_quantity);

    const material = materialById.get(
      reservation.material_listing_id
    );

    const confirmed = window.confirm(
      `Release ${numberText(remaining)} ${reservation.unit || ""} reserved for ${titleOf(
        material
      )}? Physical stock will remain unchanged.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "release_bos_material_inventory_reservation",
        {
          target_reservation_id: reservation.id,
          target_note: "Human-confirmed reservation release",
        }
      );

      if (error) throw error;

      setMessage("Reservation released.");
      await load();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not release reservation."
      );
    } finally {
      setBusy(false);
    }
  }

  const totalOnHand = atsRows.reduce(
    (sum, row) => sum + num(row.on_hand_stock),
    0
  );
  const totalReserved = atsRows.reduce(
    (sum, row) => sum + num(row.reserved_stock),
    0
  );
  const totalAvailable = atsRows.reduce(
    (sum, row) => sum + num(row.available_to_sell),
    0
  );

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
        Stock Reservation Control
      </div>

      <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>
        On Hand → Reserved → Available to Sell
      </h2>

      <p
        style={{
          margin: "7px 0 0",
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.6,
          fontWeight: 700,
        }}
      >
        Reserve stock for an enquiry, order or internal commitment
        without reducing physical inventory. Only a later sale or
        stock-out changes On Hand.
      </p>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(150px,1fr))",
          gap: 8,
        }}
      >
        <Metric label="Total On Hand" value={numberText(totalOnHand)} />
        <Metric label="Reserved" value={numberText(totalReserved)} />
        <Metric
          label="Available to Sell"
          value={numberText(totalAvailable)}
        />
      </div>

      <div style={boxStyle}>
        <strong>Create a reservation</strong>

        <div style={gridStyle}>
          <select
            value={materialId}
            onChange={(event) => {
              setMaterialId(event.target.value);
              setMessage("");
            }}
            style={inputStyle}
          >
            <option value="">Choose stock item…</option>
            {atsRows.map((row) => (
              <option
                key={row.material_listing_id}
                value={row.material_listing_id}
              >
                {titleOf(
                  materialById.get(row.material_listing_id)
                )}{" "}
                · Available {numberText(row.available_to_sell)}{" "}
                {row.unit || ""}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={`Reserve quantity${
              selectedAts?.unit ? ` (${selectedAts.unit})` : ""
            }`}
            style={inputStyle}
          />

          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Order / RFQ / reference (optional)"
            style={inputStyle}
          />

          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            style={inputStyle}
          />

          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Reservation note (optional)"
            style={inputStyle}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => void reserve()}
            style={buttonStyle}
          >
            Reserve Stock
          </button>
        </div>

        {selectedAts ? (
          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(130px,1fr))",
              gap: 8,
            }}
          >
            <Metric
              label="On Hand"
              value={`${numberText(selectedAts.on_hand_stock)} ${
                selectedAts.unit || ""
              }`}
            />
            <Metric
              label="Reserved"
              value={`${numberText(selectedAts.reserved_stock)} ${
                selectedAts.unit || ""
              }`}
            />
            <Metric
              label="Available"
              value={`${numberText(selectedAts.available_to_sell)} ${
                selectedAts.unit || ""
              }`}
            />
          </div>
        ) : null}
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
        Active Reservations
      </div>

      <div style={{ marginTop: 8, overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 900,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {[
                "Created",
                "Stock Item",
                "Reserved",
                "Reference",
                "Expires",
                "Status",
                "Action",
              ].map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {reservations.filter((r) => r.status === "active").length ===
            0 ? (
              <tr>
                <td colSpan={7} style={emptyStyle}>
                  No active reservation.
                </td>
              </tr>
            ) : (
              reservations
                .filter((reservation) => reservation.status === "active")
                .map((reservation) => (
                  <tr key={reservation.id}>
                    <td style={tdStyle}>
                      {new Date(
                        reservation.created_at
                      ).toLocaleString("en-IN")}
                    </td>
                    <td style={tdStyle}>
                      <strong>
                        {titleOf(
                          materialById.get(
                            reservation.material_listing_id
                          )
                        )}
                      </strong>
                    </td>
                    <td style={tdStyle}>
                      {numberText(
                        num(reservation.reserved_quantity) -
                          num(reservation.released_quantity)
                      )}{" "}
                      {reservation.unit || ""}
                    </td>
                    <td style={tdStyle}>
                      {reservation.source_reference_id || "—"}
                    </td>
                    <td style={tdStyle}>
                      {reservation.expires_at
                        ? new Date(
                            reservation.expires_at
                          ).toLocaleString("en-IN")
                        : "No expiry"}
                    </td>
                    <td style={tdStyle}>
                      {reservation.status}
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void release(reservation)}
                        style={secondaryButton}
                      >
                        Release
                      </button>
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
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.55,
        }}
      >
        Reservations are commitments, not physical stock movements.
        They change <strong>Available to Sell</strong>, but they do
        not change canonical On Hand stock.
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
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
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

const boxStyle: React.CSSProperties = {
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
    "repeat(auto-fit,minmax(175px,1fr))",
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

const buttonStyle: React.CSSProperties = {
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
  minHeight: 34,
  padding: "6px 9px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 850,
  cursor: "pointer",
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
