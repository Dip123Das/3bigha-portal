"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type CountRow = {
  id: string;
  material_listing_id: string;
  system_stock: number | string;
  physical_stock: number | string;
  variance: number | string;
  unit: string | null;
  status: "counted" | "matched" | "reconciled" | "cancelled";
  count_note: string | null;
  counted_at: string;
  reconciliation_transaction_id: string | null;
  reconciled_at: string | null;
};

function titleOf(row: MaterialRow | undefined) {
  return (
    row?.title?.trim() ||
    row?.local_name?.trim() ||
    "Material"
  );
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function numberText(value: unknown) {
  return num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
}

export default function InventoryReconciliationPanel({
  materials,
  onReconciled,
}: {
  materials: MaterialRow[];
  onReconciled?: () => void | Promise<void>;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [materialId, setMaterialId] = useState("");
  const [physicalStock, setPhysicalStock] = useState("");
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selected = materials.find(
    (item) => item.id === materialId
  );
  const inventory = selected?.attributes?.inventory || {};
  const systemStock = num(inventory.current_stock);
  const unit = String(inventory.stock_unit || "");
  const physical =
    physicalStock.trim() === "" ? null : num(physicalStock);
  const liveVariance =
    physical === null ? null : physical - systemStock;

  async function loadCounts() {
    const { data, error } = await supabase
      .from("bos_inventory_stock_counts")
      .select(
        "id,material_listing_id,system_stock,physical_stock,variance,unit,status,count_note,counted_at,reconciliation_transaction_id,reconciled_at"
      )
      .order("counted_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCounts((data || []) as CountRow[]);
  }

  useEffect(() => {
    void loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recordCount() {
    if (!materialId) {
      setMessage("Choose the stock item you physically counted.");
      return;
    }

    if (physical === null || physical < 0) {
      setMessage("Enter the physical quantity counted.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "create_bos_material_stock_count",
        {
          target_material_listing_id: materialId,
          target_physical_stock: physical,
          target_note: note.trim() || null,
        }
      );

      if (error) throw error;

      setMessage(
        Number(data?.variance || 0) === 0
          ? "Count recorded. Physical stock matches the system."
          : `Count recorded. Variance: ${numberText(
              data?.variance
            )} ${data?.unit || unit}. Review it before reconciling.`
      );

      setPhysicalStock("");
      setNote("");
      await loadCounts();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not record physical stock count."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reconcile(count: CountRow) {
    const material = materials.find(
      (item) => item.id === count.material_listing_id
    );

    const variance = num(count.variance);

    const confirmed = window.confirm(
      `Reconcile ${titleOf(material)}? Counted physical stock: ${numberText(
        count.physical_stock
      )} ${count.unit || ""}. The system will recalculate against the CURRENT stock before posting any adjustment.`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "reconcile_bos_material_stock_count",
        {
          target_count_id: count.id,
        }
      );

      if (error) throw error;

      setMessage(
        data?.matched
          ? "No adjustment was required; current system stock already matches the physical count."
          : `Reconciliation posted successfully. New stock: ${numberText(
              data?.stock_after
            )}.`
      );

      await loadCounts();
      await onReconciled?.();
    } catch (error: any) {
      setMessage(
        error?.message || "Could not reconcile this physical count."
      );
    } finally {
      setBusy(false);
    }
  }

  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials]
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
        Physical Stock Audit
      </div>

      <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>
        Count stock and reconcile differences
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
        Enter what you physically counted. 3Bigha shows the system
        balance and variance first. Nothing changes until you
        explicitly confirm reconciliation.
      </p>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 9,
        }}
      >
        <select
          value={materialId}
          onChange={(event) => {
            setMaterialId(event.target.value);
            setPhysicalStock("");
            setMessage("");
          }}
          style={inputStyle}
        >
          <option value="">Choose stock item…</option>
          {materials.map((item) => {
            const inv = item.attributes?.inventory || {};
            return (
              <option key={item.id} value={item.id}>
                {titleOf(item)} · {numberText(inv.current_stock)}{" "}
                {String(inv.stock_unit || "")}
              </option>
            );
          })}
        </select>

        <input
          type="number"
          min="0"
          step="any"
          value={physicalStock}
          onChange={(event) =>
            setPhysicalStock(event.target.value)
          }
          placeholder={`Physical count${unit ? ` (${unit})` : ""}`}
          style={inputStyle}
        />

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Count note / reason (optional)"
          style={inputStyle}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => void recordCount()}
          style={primaryButton}
        >
          {busy ? "Saving…" : "Record Physical Count"}
        </button>
      </div>

      {selected && physical !== null ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(150px,1fr))",
            gap: 8,
          }}
        >
          <Metric
            label="System Stock"
            value={`${numberText(systemStock)} ${unit}`}
          />
          <Metric
            label="Physical Count"
            value={`${numberText(physical)} ${unit}`}
          />
          <Metric
            label="Variance"
            value={`${liveVariance! > 0 ? "+" : ""}${numberText(
              liveVariance
            )} ${unit}`}
          />
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          style={{
            marginTop: 10,
            padding: 9,
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#f8fafc",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          fontSize: 14,
          fontWeight: 950,
        }}
      >
        Recent Physical Counts
      </div>

      <div
        style={{
          marginTop: 8,
          overflowX: "auto",
        }}
      >
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
                "When",
                "Stock Item",
                "System",
                "Physical",
                "Variance",
                "Status",
                "Note",
                "Action",
              ].map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {counts.length === 0 ? (
              <tr>
                <td colSpan={8} style={emptyStyle}>
                  No physical stock count recorded yet.
                </td>
              </tr>
            ) : (
              counts.map((count) => {
                const material = materialById.get(
                  count.material_listing_id
                );
                const variance = num(count.variance);

                return (
                  <tr key={count.id}>
                    <td style={tdStyle}>
                      {new Date(
                        count.counted_at
                      ).toLocaleString("en-IN")}
                    </td>
                    <td style={tdStyle}>
                      <strong>{titleOf(material)}</strong>
                    </td>
                    <td style={tdStyle}>
                      {numberText(count.system_stock)}{" "}
                      {count.unit || ""}
                    </td>
                    <td style={tdStyle}>
                      {numberText(count.physical_stock)}{" "}
                      {count.unit || ""}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 900,
                      }}
                    >
                      {variance > 0 ? "+" : ""}
                      {numberText(variance)} {count.unit || ""}
                    </td>
                    <td style={tdStyle}>
                      {count.status}
                    </td>
                    <td style={tdStyle}>
                      {count.count_note || "—"}
                    </td>
                    <td style={tdStyle}>
                      {count.status === "counted" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void reconcile(count)}
                          style={secondaryButton}
                        >
                          Reconcile
                        </button>
                      ) : (
                        "—"
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
          marginTop: 9,
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        Reconciliation never writes stock directly. Positive
        differences post <strong>stock_adjustment_in</strong>;
        negative differences post{" "}
        <strong>stock_adjustment_out</strong> through the canonical
        inventory transaction authority.
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
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  minHeight: 40,
  padding: "8px 12px",
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

const thStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #cbd5e1",
  textAlign: "left",
  fontSize: 11,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  verticalAlign: "top",
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  color: "#64748b",
  fontSize: 12,
};
