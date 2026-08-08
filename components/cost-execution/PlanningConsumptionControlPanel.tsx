"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ProcurementInventoryLinkPanel from "@/components/cost-execution/ProcurementInventoryLinkPanel";
import {
  calculatePlanLineVariance,
  defaultActualEntryTypeForPlanLine,
  type CostActualEntryLike,
  type CostPlanLineLike,
} from "@/lib/cost-execution/planning-variance";

type CostMode = "product" | "project";

type CostCentre = {
  id: string;
  label: string;
};

type PlanLine = CostPlanLineLike & {
  plan_id: string;
  cost_centre_id: string | null;
  description: string | null;
};

type ActualEntry = CostActualEntryLike & {
  id: string;
  description: string;
  entry_date: string;
};

type MeasurementUnit = {
  id: string;
  unit_name: string;
  unit_slug: string;
};

const LINE_TYPES = [
  ["raw_material", "Raw material"],
  ["consumable", "Consumable"],
  ["labour", "Labour"],
  ["wages", "Wages"],
  ["electricity", "Electricity"],
  ["fuel", "Fuel"],
  ["equipment", "Equipment"],
  ["machinery", "Machinery"],
  ["rental", "Rental"],
  ["service", "Service"],
  ["professional_fee", "Professional fee"],
  ["subcontract", "Subcontract"],
  ["transport", "Transport"],
  ["logistics", "Logistics"],
  ["statutory_fee", "Statutory fee"],
  ["finance_cost", "Finance cost"],
  ["overhead", "Overhead"],
  ["tax", "Tax"],
  ["contingency", "Contingency"],
  ["other", "Other"],
] as const;

const ACTUAL_TYPES = [
  ["purchase", "Purchase / procurement"],
  ["material_issue", "Material issued / consumed"],
  ["material_return", "Material returned"],
  ["wage", "Labour / wage"],
  ["salary", "Salary"],
  ["electricity", "Electricity"],
  ["fuel", "Fuel"],
  ["equipment", "Equipment"],
  ["rental", "Rental"],
  ["service", "Service"],
  ["professional_fee", "Professional fee"],
  ["subcontract", "Subcontract"],
  ["transport", "Transport"],
  ["statutory_fee", "Statutory fee"],
  ["finance_cost", "Finance cost"],
  ["overhead", "Overhead"],
  ["tax", "Tax"],
  ["adjustment", "Adjustment"],
  ["other", "Other"],
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: unknown) {
  const number = Number(value || 0);
  return `₹${Number.isFinite(number) ? number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  }) : "0"}`;
}

function numberText(value: unknown, digits = 4) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", {
        maximumFractionDigits: digits,
      })
    : "0";
}

export default function PlanningConsumptionControlPanel({
  planId,
  mode,
}: {
  planId: string;
  mode: CostMode;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [lines, setLines] = useState<PlanLine[]>([]);
  const [entries, setEntries] = useState<ActualEntry[]>([]);
  const [centres, setCentres] = useState<CostCentre[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeLineId, setActiveLineId] = useState("");

  const [planForm, setPlanForm] = useState({
    line_type: "raw_material",
    item_name: "",
    description: "",
    cost_centre_id: "",
    quantity: "",
    revised_quantity: "",
    unit: "unit",
    wastage_percent: "",
    estimated_rate: "",
    revised_rate: "",
  });

  const [actualForm, setActualForm] = useState({
    entry_date: today(),
    entry_type: "material_issue",
    description: "",
    quantity: "",
    unit: "",
    rate: "",
    amount: "",
  });

  const activeLine =
    lines.find((line) => line.id === activeLineId) ?? null;

  async function load() {
    const [lineResult, entryResult, centreResult] = await Promise.all([
      supabase
        .from("bos_cost_plan_lines")
        .select(
          "id,plan_id,cost_centre_id,line_type,item_name,description,quantity,revised_quantity,unit,wastage_percent,estimated_rate,revised_rate,estimated_amount,revised_amount"
        )
        .eq("plan_id", planId)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("bos_cost_entries")
        .select(
          "id,plan_line_id,entry_type,description,entry_date,quantity,rate,amount"
        )
        .eq("plan_id", planId)
        .not("plan_line_id", "is", null)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("bos_cost_centres")
        .select("id,label")
        .eq("plan_id", planId)
        .order("sort_order"),
    ]);

    const error =
      lineResult.error || entryResult.error || centreResult.error;
    if (error) throw error;

    setLines((lineResult.data || []) as PlanLine[]);
    setEntries((entryResult.data || []) as ActualEntry[]);
    setCentres((centreResult.data || []) as CostCentre[]);
  }

  useEffect(() => {
    void load().catch((error: any) =>
      setMessage(error?.message || "Could not load BOM / BOQ planning.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  useEffect(() => {
    let active = true;

    void fetch("/api/measurement/live", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setUnits(
          Array.isArray(data?.units)
            ? (data.units as MeasurementUnit[])
            : []
        );
      })
      .catch(() => {
        if (active) setUnits([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeLine) return;

    setActualForm((current) => ({
      ...current,
      entry_type: defaultActualEntryTypeForPlanLine(
        activeLine.line_type
      ),
      description: activeLine.item_name,
      unit: activeLine.unit || current.unit,
      rate:
        Number(activeLine.revised_rate || 0) > 0
          ? String(activeLine.revised_rate)
          : String(activeLine.estimated_rate || ""),
    }));
  }, [activeLine]);

  async function addPlanLine(event: React.FormEvent) {
    event.preventDefault();

    const itemName = planForm.item_name.trim();
    if (!itemName) {
      setMessage(
        mode === "product"
          ? "Enter the material or planned production cost item."
          : "Enter the BOQ item or planned project cost item."
      );
      return;
    }

    const quantity = Math.max(0, Number(planForm.quantity || 0));
    const revisedQuantity =
      planForm.revised_quantity === ""
        ? null
        : Math.max(0, Number(planForm.revised_quantity || 0));
    const estimatedRate = Math.max(
      0,
      Number(planForm.estimated_rate || 0)
    );
    const revisedRate = Math.max(
      0,
      Number(planForm.revised_rate || 0)
    );
    const wastage = Math.max(
      0,
      Number(planForm.wastage_percent || 0)
    );

    const currentQuantity =
      revisedQuantity === null ? quantity : revisedQuantity;
    const currentRate = revisedRate > 0 ? revisedRate : estimatedRate;

    const estimatedAmount =
      Math.round(
        quantity *
          (1 + wastage / 100) *
          estimatedRate *
          100
      ) / 100;

    const revisedAmount =
      revisedQuantity !== null || revisedRate > 0
        ? Math.round(
            currentQuantity *
              (1 + wastage / 100) *
              currentRate *
              100
          ) / 100
        : 0;

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("bos_cost_plan_lines")
      .insert({
        plan_id: planId,
        cost_centre_id:
          planForm.cost_centre_id || null,
        line_type: planForm.line_type,
        item_name: itemName,
        description:
          planForm.description.trim() || null,
        quantity,
        revised_quantity: revisedQuantity,
        unit: planForm.unit.trim() || "unit",
        wastage_percent: wastage,
        estimated_rate: estimatedRate,
        revised_rate: revisedRate,
        estimated_amount: estimatedAmount,
        revised_amount: revisedAmount,
      });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPlanForm({
      line_type: "raw_material",
      item_name: "",
      description: "",
      cost_centre_id: "",
      quantity: "",
      revised_quantity: "",
      unit: "unit",
      wastage_percent: "",
      estimated_rate: "",
      revised_rate: "",
    });

    await load();
    setMessage(
      mode === "product"
        ? "BOM / production plan item added."
        : "BOQ / project plan item added."
    );
  }

  async function recordActual(event: React.FormEvent) {
    event.preventDefault();

    if (!activeLine) {
      setMessage("Choose a planned item first.");
      return;
    }

    const quantity = Math.max(
      0,
      Number(actualForm.quantity || 0)
    );
    const rate = Math.max(0, Number(actualForm.rate || 0));
    const typedAmount = Math.max(
      0,
      Number(actualForm.amount || 0)
    );
    const amount =
      typedAmount > 0
        ? typedAmount
        : Math.round(quantity * rate * 100) / 100;

    if (amount <= 0 && quantity <= 0) {
      setMessage("Enter the actual quantity or amount.");
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("bos_cost_entries")
      .insert({
        plan_id: planId,
        plan_line_id: activeLine.id,
        cost_centre_id:
          activeLine.cost_centre_id || null,
        entry_date: actualForm.entry_date,
        entry_type: actualForm.entry_type,
        description:
          actualForm.description.trim() ||
          activeLine.item_name,
        quantity,
        unit:
          actualForm.unit.trim() ||
          activeLine.unit ||
          null,
        rate,
        amount,
      });

    if (!error) {
      const totalResult = await supabase.rpc(
        "refresh_bos_cost_plan_actual_total",
        { target_plan_id: planId }
      );

      if (totalResult.error) {
        setBusy(false);
        setMessage(totalResult.error.message);
        return;
      }
    }

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setActualForm({
      entry_date: today(),
      entry_type:
        defaultActualEntryTypeForPlanLine(
          activeLine.line_type
        ),
      description: activeLine.item_name,
      quantity: "",
      unit: activeLine.unit || "",
      rate:
        Number(activeLine.revised_rate || 0) > 0
          ? String(activeLine.revised_rate)
          : String(activeLine.estimated_rate || ""),
      amount: "",
    });

    await load();
    setMessage("Actual consumption / cost recorded against the plan.");
  }

  const totals = lines.reduce(
    (acc, line) => {
      const variance = calculatePlanLineVariance(
        line,
        entries
      );
      acc.planned += variance.plannedAmount;
      acc.actual += variance.actualAmount;
      return acc;
    },
    { planned: 0, actual: 0 }
  );

  const totalVariance = totals.actual - totals.planned;

  return (
    <section
      style={{
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
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#475569",
        }}
      >
        COST-02 Planning & Consumption Control
      </div>

      <h2 style={{ margin: "6px 0 0" }}>
        {mode === "product"
          ? "Production Plan / BOM"
          : "Project Plan / BOQ"}
      </h2>

      <p
        style={{
          marginTop: 7,
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        Plan what you expect to use, then record the actual
        consumption or expenditure against the same item. Unexpected
        expenses can still be entered in the flexible Cost Register
        below.
      </p>

      {message ? (
        <div
          role="status"
          style={{
            margin: "12px 0",
            padding: 10,
            borderRadius: 10,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            fontWeight: 750,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(170px,1fr))",
          gap: 10,
          margin: "14px 0",
        }}
      >
        <Metric
          label="Current planned cost"
          value={money(totals.planned)}
        />
        <Metric
          label="Linked actual cost"
          value={money(totals.actual)}
        />
        <Metric
          label="Variance"
          value={`${totalVariance > 0 ? "+" : ""}${money(
            totalVariance
          )}`}
        />
      </div>

      <details open>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          Add planned item
        </summary>

        <form
          onSubmit={addPlanLine}
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(170px,1fr))",
            gap: 9,
            marginTop: 12,
          }}
        >
          <select
            value={planForm.line_type}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                line_type: event.target.value,
              })
            }
            style={inputStyle}
          >
            {LINE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            value={planForm.item_name}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                item_name: event.target.value,
              })
            }
            placeholder={
              mode === "product"
                ? "e.g. SS sheet / glass / labour"
                : "e.g. Cement / TMT / road work"
            }
            style={inputStyle}
          />

          <select
            value={planForm.cost_centre_id}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                cost_centre_id: event.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">
              General / whole register
            </option>
            {centres.map((centre) => (
              <option
                key={centre.id}
                value={centre.id}
              >
                {centre.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="any"
            value={planForm.quantity}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                quantity: event.target.value,
              })
            }
            placeholder="Planned quantity"
            style={inputStyle}
          />

          <input
            list={`cost-units-${planId}`}
            value={planForm.unit}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                unit: event.target.value,
              })
            }
            placeholder="Unit"
            style={inputStyle}
          />

          <datalist id={`cost-units-${planId}`}>
            {units.map((unit) => (
              <option
                key={unit.id}
                value={unit.unit_name}
              >
                {unit.unit_slug}
              </option>
            ))}
          </datalist>

          <input
            type="number"
            min="0"
            step="any"
            value={planForm.estimated_rate}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                estimated_rate: event.target.value,
              })
            }
            placeholder="Planned rate ₹"
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="any"
            value={planForm.wastage_percent}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                wastage_percent: event.target.value,
              })
            }
            placeholder="Wastage %"
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="any"
            value={planForm.revised_quantity}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                revised_quantity: event.target.value,
              })
            }
            placeholder="Revised qty (optional)"
            style={inputStyle}
          />

          <input
            type="number"
            min="0"
            step="any"
            value={planForm.revised_rate}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                revised_rate: event.target.value,
              })
            }
            placeholder="Revised rate (optional)"
            style={inputStyle}
          />

          <input
            value={planForm.description}
            onChange={(event) =>
              setPlanForm({
                ...planForm,
                description: event.target.value,
              })
            }
            placeholder="Notes / specification"
            style={inputStyle}
          />

          <button
            disabled={busy}
            style={primaryButton}
          >
            Add to {mode === "product" ? "BOM" : "BOQ"}
          </button>
        </form>
      </details>

      <div
        style={{
          marginTop: 16,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1080,
          }}
        >
          <thead>
            <tr>
              {[
                "Item",
                "Work area",
                "Planned qty",
                "Actual qty",
                "Qty variance",
                "Planned rate",
                "Actual rate",
                "Planned cost",
                "Actual cost",
                "Cost variance",
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
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: 18,
                    color: "#64748b",
                  }}
                >
                  No planned items yet. Add the first{" "}
                  {mode === "product" ? "BOM" : "BOQ"} item
                  above.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const variance =
                  calculatePlanLineVariance(
                    line,
                    entries
                  );

                return (
                  <tr key={line.id}>
                    <td style={tdStyle}>
                      <strong>{line.item_name}</strong>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          marginTop: 3,
                        }}
                      >
                        {LINE_TYPES.find(
                          ([value]) =>
                            value === line.line_type
                        )?.[1] || line.line_type}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {centres.find(
                        (centre) =>
                          centre.id ===
                          line.cost_centre_id
                      )?.label || "General"}
                    </td>
                    <td style={tdStyle}>
                      {numberText(
                        variance.plannedQuantity
                      )}{" "}
                      {line.unit}
                    </td>
                    <td style={tdStyle}>
                      {numberText(
                        variance.actualQuantity
                      )}{" "}
                      {line.unit}
                    </td>
                    <td style={tdStyle}>
                      {variance.quantityVariance > 0
                        ? "+"
                        : ""}
                      {numberText(
                        variance.quantityVariance
                      )}
                    </td>
                    <td style={tdStyle}>
                      {money(variance.plannedRate)}
                    </td>
                    <td style={tdStyle}>
                      {money(variance.actualRate)}
                    </td>
                    <td style={tdStyle}>
                      {money(variance.plannedAmount)}
                    </td>
                    <td style={tdStyle}>
                      {money(variance.actualAmount)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 900,
                      }}
                    >
                      {variance.amountVariance > 0
                        ? "+"
                        : ""}
                      {money(variance.amountVariance)}
                    </td>
                    <td style={tdStyle}>
                      <Signal
                        signal={variance.signal}
                      />
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLineId(line.id)
                        }
                        style={secondaryButton}
                      >
                        Record actual
                      </button>

                      <ProcurementInventoryLinkPanel
                        planId={planId}
                        line={line}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {activeLine ? (
        <form
          onSubmit={recordActual}
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              marginBottom: 10,
            }}
          >
            Record actual against: {activeLine.item_name}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 9,
            }}
          >
            <input
              type="date"
              value={actualForm.entry_date}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  entry_date: event.target.value,
                })
              }
              style={inputStyle}
            />

            <select
              value={actualForm.entry_type}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  entry_type: event.target.value,
                })
              }
              style={inputStyle}
            >
              {ACTUAL_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              value={actualForm.description}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  description: event.target.value,
                })
              }
              placeholder="Actual transaction"
              style={inputStyle}
            />

            <input
              type="number"
              min="0"
              step="any"
              value={actualForm.quantity}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  quantity: event.target.value,
                })
              }
              placeholder="Actual quantity"
              style={inputStyle}
            />

            <input
              list={`cost-units-${planId}`}
              value={actualForm.unit}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  unit: event.target.value,
                })
              }
              placeholder="Unit"
              style={inputStyle}
            />

            <input
              type="number"
              min="0"
              step="any"
              value={actualForm.rate}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  rate: event.target.value,
                })
              }
              placeholder="Actual rate ₹"
              style={inputStyle}
            />

            <input
              type="number"
              min="0"
              step="any"
              value={actualForm.amount}
              onChange={(event) =>
                setActualForm({
                  ...actualForm,
                  amount: event.target.value,
                })
              }
              placeholder="Actual amount ₹"
              style={inputStyle}
            />

            <button
              disabled={busy}
              style={primaryButton}
            >
              Record actual
            </button>

            <button
              type="button"
              onClick={() => setActiveLineId("")}
              style={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function Signal({
  signal,
}: {
  signal: "on_plan" | "over" | "under" | "not_started";
}) {
  const label =
    signal === "over"
      ? "Over plan"
      : signal === "under"
        ? "Under plan"
        : signal === "not_started"
          ? "Not started"
          : "On plan";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        background:
          signal === "over"
            ? "#fef2f2"
            : signal === "under"
              ? "#fffbeb"
              : signal === "not_started"
                ? "#f8fafc"
                : "#f0fdf4",
        border: "1px solid #e2e8f0",
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
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
        padding: 12,
        borderRadius: 12,
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
          marginTop: 4,
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
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  minHeight: 40,
  padding: "9px 13px",
  borderRadius: 9,
  border: 0,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  minHeight: 36,
  padding: "7px 10px",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 850,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "9px 8px",
  borderBottom: "1px solid #cbd5e1",
  fontSize: 11,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 8px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  verticalAlign: "top",
};
