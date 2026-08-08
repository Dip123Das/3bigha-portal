"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type IntegrityRow = {
  material_listing_id: string;
  canonical_stock: number | string;
  allocated_stock: number | string;
  allocation_drift: number | string;
  unit: string | null;
};

type LocationRow = {
  id: string;
  location_name: string;
  godown_no: string | null;
  room_no: string | null;
  rack_no: string | null;
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

function numberText(value: unknown) {
  return num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
}

export default function InventoryLocationIntegrityPanel({
  materials,
  onReconciled,
}: {
  materials: MaterialRow[];
  onReconciled?: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [rows, setRows] = useState<IntegrityRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedLocationByMaterial, setSelectedLocationByMaterial] =
    useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setMessage("");

    const [integrityResult, locationResult] = await Promise.all([
      supabase
        .from("bos_material_location_integrity")
        .select(
          "material_listing_id,canonical_stock,allocated_stock,allocation_drift,unit"
        )
        .order("allocation_drift", { ascending: false }),
      supabase
        .from("bos_inventory_locations")
        .select("id,location_name,godown_no,room_no,rack_no")
        .eq("is_active", true)
        .order("location_name"),
    ]);

    const error = integrityResult.error || locationResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }

    setRows((integrityResult.data || []) as IntegrityRow[]);
    setLocations((locationResult.data || []) as LocationRow[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials]
  );

  const driftRows = rows.filter(
    (row) => Math.abs(num(row.allocation_drift)) > 0
  );

  async function reconcile(row: IntegrityRow) {
    const locationId =
      selectedLocationByMaterial[row.material_listing_id] || "";

    if (!locationId) {
      setMessage(
        "Choose the physical location that should absorb this allocation difference."
      );
      return;
    }

    const location = locations.find((item) => item.id === locationId);
    const material = materialById.get(row.material_listing_id);

    const confirmed = window.confirm(
      `Reconcile location allocation for ${titleOf(material)}? Drift: ${numberText(
        row.allocation_drift
      )} ${row.unit || ""}. This will adjust only ${location ? locationLabel(location) : "the selected location"} and will NOT change canonical stock.`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "reconcile_bos_material_location_drift",
        {
          target_material_listing_id: row.material_listing_id,
          target_location_id: locationId,
          target_note:
            "Human-confirmed location allocation drift reconciliation",
        }
      );

      if (error) throw error;

      setMessage(
        data?.already_balanced
          ? "This material is already balanced."
          : `Allocation reconciled. Canonical stock remains ${numberText(
              data?.canonical_stock
            )} ${data?.unit || row.unit || ""}.`
      );

      await load();
      await onReconciled?.();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not reconcile location allocation."
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
        Location Allocation Integrity
      </div>

      <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>
        Check whether physical locations add up to total stock
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
        Canonical stock remains authoritative. This control only
        checks whether the quantities assigned across godowns,
        rooms and racks equal that total.
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
        <Metric label="Tracked Items" value={String(rows.length)} />
        <Metric
          label="Balanced"
          value={String(rows.length - driftRows.length)}
        />
        <Metric
          label="Needs Allocation Review"
          value={String(driftRows.length)}
        />
      </div>

      {message ? (
        <div role="status" style={messageStyle}>
          {message}
        </div>
      ) : null}

      <div style={{ marginTop: 14, overflowX: "auto" }}>
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
                "Stock Item",
                "Canonical",
                "Allocated",
                "Drift",
                "Status",
                "Assign Drift To",
                "Action",
              ].map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={emptyStyle}>
                  No material inventory found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const drift = num(row.allocation_drift);
                const balanced = Math.abs(drift) === 0;

                return (
                  <tr key={row.material_listing_id}>
                    <td style={tdStyle}>
                      <strong>
                        {titleOf(
                          materialById.get(
                            row.material_listing_id
                          )
                        )}
                      </strong>
                    </td>
                    <td style={tdStyle}>
                      {numberText(row.canonical_stock)}{" "}
                      {row.unit || ""}
                    </td>
                    <td style={tdStyle}>
                      {numberText(row.allocated_stock)}{" "}
                      {row.unit || ""}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 900,
                      }}
                    >
                      {drift > 0 ? "+" : ""}
                      {numberText(drift)} {row.unit || ""}
                    </td>
                    <td style={tdStyle}>
                      {balanced ? "Balanced" : "Review"}
                    </td>
                    <td style={tdStyle}>
                      {balanced ? (
                        "—"
                      ) : (
                        <select
                          value={
                            selectedLocationByMaterial[
                              row.material_listing_id
                            ] || ""
                          }
                          onChange={(event) =>
                            setSelectedLocationByMaterial(
                              (current) => ({
                                ...current,
                                [row.material_listing_id]:
                                  event.target.value,
                              })
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="">
                            Choose location…
                          </option>
                          {locations.map((location) => (
                            <option
                              key={location.id}
                              value={location.id}
                            >
                              {locationLabel(location)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {balanced ? (
                        "—"
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void reconcile(row)}
                          style={buttonStyle}
                        >
                          Reconcile Allocation
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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
        This control never changes canonical stock. It only repairs
        the physical-location allocation when older workflows changed
        total stock without specifying a location.
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

const inputStyle: React.CSSProperties = {
  minHeight: 36,
  minWidth: 180,
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "7px 10px",
  borderRadius: 8,
  border: 0,
  background: "#0f766e",
  color: "#fff",
  fontWeight: 900,
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
  verticalAlign: "top",
  fontSize: 12,
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  color: "#64748b",
  fontSize: 12,
};
