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
  counted_at: string;
  reconciled_at: string | null;
};

type InsightRow = {
  materialId: string;
  title: string;
  counts: number;
  mismatches: number;
  matched: number;
  reconciliationCount: number;
  absoluteVariance: number;
  netVariance: number;
  averageVarianceRate: number;
  lastCountedAt: string | null;
  reliability: "High" | "Watch" | "Low";
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

function pct(value: number) {
  return `${value.toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  })}%`;
}

function numberText(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
}

export default function InventoryVarianceIntelligencePanel({
  materials,
}: {
  materials: MaterialRow[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("bos_inventory_stock_counts")
        .select(
          "id,material_listing_id,system_stock,physical_stock,variance,unit,status,counted_at,reconciled_at"
        )
        .neq("status", "cancelled")
        .order("counted_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      setCounts((data || []) as CountRow[]);
    } catch (error: any) {
      setMessage(
        error?.message || "Could not load inventory variance intelligence."
      );
      setCounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials]
  );

  const insights = useMemo<InsightRow[]>(() => {
    const grouped = new Map<string, CountRow[]>();

    for (const count of counts) {
      const list = grouped.get(count.material_listing_id) || [];
      list.push(count);
      grouped.set(count.material_listing_id, list);
    }

    return Array.from(grouped.entries())
      .map(([materialId, rows]) => {
        let mismatches = 0;
        let matched = 0;
        let reconciliationCount = 0;
        let absoluteVariance = 0;
        let netVariance = 0;
        let rateTotal = 0;

        for (const row of rows) {
          const system = Math.abs(num(row.system_stock));
          const variance = num(row.variance);

          if (Math.abs(variance) > 0) mismatches += 1;
          else matched += 1;

          if (row.status === "reconciled") {
            reconciliationCount += 1;
          }

          absoluteVariance += Math.abs(variance);
          netVariance += variance;

          const denominator = system > 0 ? system : 1;
          rateTotal +=
            (Math.abs(variance) / denominator) * 100;
        }

        const mismatchRate =
          rows.length > 0
            ? (mismatches / rows.length) * 100
            : 0;

        const averageVarianceRate =
          rows.length > 0 ? rateTotal / rows.length : 0;

        let reliability: InsightRow["reliability"] = "High";

        if (
          mismatchRate >= 50 ||
          averageVarianceRate >= 10 ||
          mismatches >= 3
        ) {
          reliability = "Low";
        } else if (
          mismatchRate >= 25 ||
          averageVarianceRate >= 5 ||
          mismatches >= 2
        ) {
          reliability = "Watch";
        }

        return {
          materialId,
          title: titleOf(materialById.get(materialId)),
          counts: rows.length,
          mismatches,
          matched,
          reconciliationCount,
          absoluteVariance,
          netVariance,
          averageVarianceRate,
          lastCountedAt: rows[0]?.counted_at || null,
          reliability,
        };
      })
      .sort((a, b) => {
        if (a.reliability !== b.reliability) {
          const order = { Low: 0, Watch: 1, High: 2 };
          return order[a.reliability] - order[b.reliability];
        }
        return b.absoluteVariance - a.absoluteVariance;
      });
  }, [counts, materialById]);

  const visibleInsights = useMemo(() => {
    return materialFilter
      ? insights.filter(
          (item) => item.materialId === materialFilter
        )
      : insights;
  }, [insights, materialFilter]);

  const summary = useMemo(() => {
    const totalCounts = counts.length;
    const mismatches = counts.filter(
      (row) => Math.abs(num(row.variance)) > 0
    ).length;
    const matched = totalCounts - mismatches;
    const reconciled = counts.filter(
      (row) => row.status === "reconciled"
    ).length;
    const watchItems = insights.filter(
      (item) => item.reliability !== "High"
    ).length;

    return {
      totalCounts,
      matchRate:
        totalCounts > 0 ? (matched / totalCounts) * 100 : 0,
      mismatchRate:
        totalCounts > 0 ? (mismatches / totalCounts) * 100 : 0,
      reconciled,
      watchItems,
    };
  }, [counts, insights]);

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
        Inventory Variance Intelligence
      </div>

      <div
        style={{
          marginTop: 5,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            Reconciliation insights
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
            Identify stock items that repeatedly disagree with
            physical counts. This is advisory intelligence only;
            it never changes stock automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          style={secondaryButton}
        >
          Refresh insights
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(150px,1fr))",
          gap: 8,
        }}
      >
        <Metric
          label="Physical Counts"
          value={String(summary.totalCounts)}
        />
        <Metric
          label="Match Rate"
          value={pct(summary.matchRate)}
        />
        <Metric
          label="Mismatch Rate"
          value={pct(summary.mismatchRate)}
        />
        <Metric
          label="Reconciled Counts"
          value={String(summary.reconciled)}
        />
        <Metric
          label="Items to Watch"
          value={String(summary.watchItems)}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <select
          value={materialFilter}
          onChange={(event) =>
            setMaterialFilter(event.target.value)
          }
          style={inputStyle}
        >
          <option value="">All counted stock items</option>
          {insights.map((item) => (
            <option
              key={item.materialId}
              value={item.materialId}
            >
              {item.title}
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
            fontSize: 12,
            fontWeight: 800,
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
            minWidth: 980,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {[
                "Stock Item",
                "Counts",
                "Matched",
                "Mismatches",
                "Reconciliations",
                "Avg Variance %",
                "Absolute Variance",
                "Net Variance",
                "Reliability",
                "Last Count",
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
                  Loading inventory variance intelligence…
                </td>
              </tr>
            ) : visibleInsights.length === 0 ? (
              <tr>
                <td colSpan={10} style={emptyStyle}>
                  No physical count history is available yet.
                </td>
              </tr>
            ) : (
              visibleInsights.map((item) => (
                <tr key={item.materialId}>
                  <td style={tdStyle}>
                    <strong>{item.title}</strong>
                  </td>
                  <td style={tdStyle}>{item.counts}</td>
                  <td style={tdStyle}>{item.matched}</td>
                  <td style={tdStyle}>{item.mismatches}</td>
                  <td style={tdStyle}>
                    {item.reconciliationCount}
                  </td>
                  <td style={tdStyle}>
                    {pct(item.averageVarianceRate)}
                  </td>
                  <td style={tdStyle}>
                    {numberText(item.absoluteVariance)}
                  </td>
                  <td style={tdStyle}>
                    {item.netVariance > 0 ? "+" : ""}
                    {numberText(item.netVariance)}
                  </td>
                  <td style={tdStyle}>
                    <strong>{item.reliability}</strong>
                  </td>
                  <td style={tdStyle}>
                    {item.lastCountedAt
                      ? new Date(
                          item.lastCountedAt
                        ).toLocaleString("en-IN")
                      : "—"}
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
        Reliability is an advisory signal based on count mismatch
        frequency and variance size. <strong>High</strong> means
        counts usually agree; <strong>Watch</strong> means repeat
        checking is sensible; <strong>Low</strong> means the item
        has repeated or material differences and should be reviewed
        by a human. No stock is adjusted from this panel.
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
  minHeight: 40,
  minWidth: 220,
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
