"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type TransactionTypeRow = {
  transaction_type: string;
  label: string;
  direction: "in" | "out" | "neutral";
};

type TransactionRow = {
  id: string;
  inventory_domain: string;
  inventory_entity_type: string;
  inventory_entity_id: string;
  transaction_type: string;
  quantity: number | string;
  unit: string | null;
  stock_before: number | string | null;
  stock_after: number | string | null;
  unit_cost: number | string | null;
  total_cost: number | string | null;
  source_module: string | null;
  source_reference_type: string | null;
  source_reference_id: string | null;
  note: string | null;
  metadata: any;
  occurred_at: string;
};

function numberText(value: unknown, digits = 4) {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", {
        maximumFractionDigits: digits,
      })
    : "0";
}

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? `₹${n.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`
    : "₹0";
}

function materialTitle(row: MaterialRow | undefined) {
  return (
    row?.title?.trim() ||
    row?.local_name?.trim() ||
    "Material"
  );
}

function sourceLabel(value: string | null) {
  switch (value) {
    case "billing":
      return "Billing";
    case "cost_register":
      return "Cost Register";
    case "materials_add":
      return "Material Setup";
    case "inventory":
      return "Inventory";
    default:
      return value
        ? value
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "System";
  }
}

export default function InventoryTransactionHistoryPanel({
  materials,
}: {
  materials: MaterialRow[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [types, setTypes] = useState<TransactionTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const [txResult, typeResult] = await Promise.all([
        supabase
          .from("bos_inventory_transactions")
          .select(
            "id,inventory_domain,inventory_entity_type,inventory_entity_id,transaction_type,quantity,unit,stock_before,stock_after,unit_cost,total_cost,source_module,source_reference_type,source_reference_id,note,metadata,occurred_at"
          )
          .eq("inventory_domain", "materials")
          .eq("inventory_entity_type", "material_listing")
          .order("occurred_at", { ascending: false })
          .limit(500),
        supabase
          .from("bos_inventory_transaction_types")
          .select("transaction_type,label,direction")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (txResult.error) throw txResult.error;
      if (typeResult.error) throw typeResult.error;

      setRows((txResult.data || []) as TransactionRow[]);
      setTypes((typeResult.data || []) as TransactionTypeRow[]);
    } catch (error: any) {
      setMessage(
        error?.message || "Could not load inventory history."
      );
      setRows([]);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialById = useMemo(() => {
    return new Map(materials.map((item) => [item.id, item]));
  }, [materials]);

  const typeByCode = useMemo(() => {
    return new Map(types.map((item) => [item.transaction_type, item]));
  }, [types]);

  const sources = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.source_module).filter(Boolean))
    ).sort() as string[];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows.filter((row) => {
      if (materialId && row.inventory_entity_id !== materialId) {
        return false;
      }
      if (typeFilter && row.transaction_type !== typeFilter) {
        return false;
      }
      if (
        directionFilter &&
        typeByCode.get(row.transaction_type)?.direction !==
          directionFilter
      ) {
        return false;
      }
      if (sourceFilter && row.source_module !== sourceFilter) {
        return false;
      }

      if (!query) return true;

      const material = materialById.get(row.inventory_entity_id);
      const type = typeByCode.get(row.transaction_type);

      const haystack = [
        materialTitle(material),
        type?.label,
        row.transaction_type,
        row.source_module,
        row.source_reference_type,
        row.source_reference_id,
        row.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [
    rows,
    q,
    materialId,
    typeFilter,
    directionFilter,
    sourceFilter,
    materialById,
    typeByCode,
  ]);

  const summary = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    let value = 0;

    for (const row of filteredRows) {
      const quantity = Number(row.quantity || 0);
      if (quantity > 0) incoming += quantity;
      if (quantity < 0) outgoing += Math.abs(quantity);
      value += Math.abs(Number(row.total_cost || 0));
    }

    return {
      count: filteredRows.length,
      incoming,
      outgoing,
      value,
    };
  }, [filteredRows]);

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
        Inventory Audit Trail
      </div>

      <div
        style={{
          marginTop: 5,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            Stock Transaction History
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
              fontWeight: 700,
            }}
          >
            See what changed, why it changed, where it came
            from, and the stock balance before and after every
            transaction.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          style={secondaryButton}
        >
          Refresh history
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(155px,1fr))",
          gap: 9,
        }}
      >
        <Metric label="Transactions" value={String(summary.count)} />
        <Metric
          label="Stock In"
          value={numberText(summary.incoming)}
        />
        <Metric
          label="Stock Out"
          value={numberText(summary.outgoing)}
        />
        <Metric label="Recorded Value" value={money(summary.value)} />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(170px,1fr))",
          gap: 8,
        }}
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search reason, reference, source…"
          style={inputStyle}
        />

        <select
          value={materialId}
          onChange={(event) => setMaterialId(event.target.value)}
          style={inputStyle}
        >
          <option value="">All stock items</option>
          {materials.map((item) => (
            <option key={item.id} value={item.id}>
              {materialTitle(item)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          style={inputStyle}
        >
          <option value="">All transaction types</option>
          {types.map((type) => (
            <option
              key={type.transaction_type}
              value={type.transaction_type}
            >
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={directionFilter}
          onChange={(event) =>
            setDirectionFilter(event.target.value)
          }
          style={inputStyle}
        >
          <option value="">Stock in & out</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="neutral">No quantity change</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(event) =>
            setSourceFilter(event.target.value)
          }
          style={inputStyle}
        >
          <option value="">All sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {sourceLabel(source)}
            </option>
          ))}
        </select>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            marginTop: 10,
            padding: 9,
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1120,
          }}
        >
          <thead>
            <tr>
              {[
                "When",
                "Stock Item",
                "Transaction",
                "Quantity",
                "Before",
                "After",
                "Value",
                "Source",
                "Reference",
                "Reason",
              ].map((label) => (
                <th key={label} style={thStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={emptyStyle}>
                  Loading transaction history…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} style={emptyStyle}>
                  No matching inventory transaction found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const material = materialById.get(
                  row.inventory_entity_id
                );
                const type = typeByCode.get(row.transaction_type);
                const quantity = Number(row.quantity || 0);

                return (
                  <tr key={row.id}>
                    <td style={tdStyle}>
                      {new Date(row.occurred_at).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td style={tdStyle}>
                      <strong>{materialTitle(material)}</strong>
                    </td>

                    <td style={tdStyle}>
                      <strong>
                        {type?.label ||
                          row.transaction_type.replace(
                            /_/g,
                            " "
                          )}
                      </strong>
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 900,
                      }}
                    >
                      {quantity > 0 ? "+" : ""}
                      {numberText(quantity)} {row.unit || ""}
                    </td>

                    <td style={tdStyle}>
                      {row.stock_before == null
                        ? "—"
                        : numberText(row.stock_before)}
                    </td>

                    <td style={tdStyle}>
                      {row.stock_after == null
                        ? "—"
                        : numberText(row.stock_after)}
                    </td>

                    <td style={tdStyle}>
                      {row.total_cost == null
                        ? "—"
                        : money(row.total_cost)}
                    </td>

                    <td style={tdStyle}>
                      {sourceLabel(row.source_module)}
                    </td>

                    <td style={tdStyle}>
                      {row.source_reference_id || "—"}
                      {row.source_reference_type ? (
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                            color: "#64748b",
                          }}
                        >
                          {row.source_reference_type.replace(
                            /_/g,
                            " "
                          )}
                        </div>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      {row.note || "—"}
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
        This is a read-only audit view of
        <strong> bos_inventory_transactions</strong>. Stock changes
        must continue to go through the canonical inventory posting
        authority.
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
        padding: 11,
        borderRadius: 11,
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
          fontSize: 17,
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

const secondaryButton: React.CSSProperties = {
  minHeight: 38,
  padding: "8px 11px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 850,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "9px 8px",
  borderBottom: "1px solid #cbd5e1",
  textAlign: "left",
  fontSize: 11,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 8px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
  fontSize: 12,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  color: "#64748b",
  fontSize: 12,
};
