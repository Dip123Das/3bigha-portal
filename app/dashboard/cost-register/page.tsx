"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import UniversalDashboardShell from "@/components/operational/UniversalDashboardShell";
import CostRegisterCapabilityGate from "@/components/cost-execution/CostRegisterCapabilityGate";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  humanCostEntryExamples,
  makeCostCustomFieldKey,
  normalizeCustomFieldValue,
  type CostCustomFieldType,
} from "@/lib/cost-execution/custom-fields";

type CostPlan = {
  id: string;
  operating_mode: "product" | "project";
  title: string;
  status: string;
  actual_total: number | string;
  estimated_total: number | string;
  target_output_quantity: number | string | null;
  target_output_unit: string | null;
};

type CostCentre = {
  id: string;
  plan_id: string;
  label: string;
  centre_type: string;
};

type CostEntry = {
  id: string;
  plan_id: string;
  cost_centre_id: string | null;
  entry_date: string;
  entry_type: string;
  description: string;
  quantity: number | string;
  unit: string | null;
  rate: number | string;
  amount: number | string;
};

type CustomField = {
  id: string;
  plan_id: string | null;
  field_key: string;
  label: string;
  field_type: CostCustomFieldType;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  options: unknown;
};

const ENTRY_TYPES = [
  ["purchase", "Purchase / Raw material"],
  ["wage", "Labour / Wages"],
  ["salary", "Salary"],
  ["electricity", "Electricity"],
  ["fuel", "Fuel"],
  ["equipment", "Equipment"],
  ["rental", "Rental"],
  ["service", "Service"],
  ["professional_fee", "Professional fee"],
  ["subcontract", "Subcontract"],
  ["transport", "Vehicle / Transport"],
  ["statutory_fee", "Statutory fee"],
  ["finance_cost", "Finance cost"],
  ["overhead", "Overhead"],
  ["tax", "Tax"],
  ["adjustment", "Adjustment"],
  ["other", "Other"],
] as const;

function money(value: unknown) {
  const number = Number(value || 0);
  return `₹${Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0"}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CostRegisterWorkspacePage() {
  const [requestedMode, setRequestedMode] = useState<"product" | "project" | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    setRequestedMode(
      mode === "product" || mode === "project"
        ? mode
        : null
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState<CostPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [centres, setCentres] = useState<CostCentre[]>([]);
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, Record<string, unknown>>>({});

  const [planForm, setPlanForm] = useState({
    operating_mode: "product" as "product" | "project",
    title: "",
    target_output_quantity: "",
    target_output_unit: "unit",
  });

  const [centreLabel, setCentreLabel] = useState("");
  const [entryForm, setEntryForm] = useState({
    entry_date: today(),
    entry_type: "purchase",
    description: "",
    cost_centre_id: "",
    quantity: "",
    unit: "",
    rate: "",
    amount: "",
  });
  const [entryCustomValues, setEntryCustomValues] = useState<Record<string, unknown>>({});

  const [columnForm, setColumnForm] = useState({
    label: "",
    field_type: "text" as CostCustomFieldType,
  });

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const planFields = customFields.filter(
    (field) => field.is_active && (field.plan_id === null || field.plan_id === selectedPlanId)
  );

  async function requireUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/dashboard/cost-register")}`);
      return null;
    }

    return user;
  }

  async function loadPlans() {
    const user = await requireUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("bos_cost_plans")
      .select("id,operating_mode,title,status,actual_total,estimated_total,target_output_quantity,target_output_unit")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const nextPlans = (data || []) as CostPlan[];
    setPlans(nextPlans);

    if (!selectedPlanId && nextPlans[0]?.id) {
      setSelectedPlanId(nextPlans[0].id);
    }
  }

  async function loadPlanDetail(planId: string) {
    if (!planId) {
      setCentres([]);
      setEntries([]);
      setCustomFields([]);
      setCustomValues({});
      return;
    }

    const [centreResult, entryResult, fieldResult] = await Promise.all([
      supabase
        .from("bos_cost_centres")
        .select("id,plan_id,label,centre_type")
        .eq("plan_id", planId)
        .order("sort_order"),
      supabase
        .from("bos_cost_entries")
        .select("id,plan_id,cost_centre_id,entry_date,entry_type,description,quantity,unit,rate,amount")
        .eq("plan_id", planId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("bos_cost_custom_fields")
        .select("id,plan_id,field_key,label,field_type,is_required,is_active,sort_order,options")
        .or(`plan_id.eq.${planId},plan_id.is.null`)
        .order("sort_order"),
    ]);

    const firstError = centreResult.error || entryResult.error || fieldResult.error;
    if (firstError) throw firstError;

    const nextEntries = (entryResult.data || []) as CostEntry[];
    setCentres((centreResult.data || []) as CostCentre[]);
    setEntries(nextEntries);
    setCustomFields((fieldResult.data || []) as CustomField[]);

    if (nextEntries.length > 0) {
      const entryIds = nextEntries.map((entry) => entry.id);
      const { data: valueRows, error: valueError } = await supabase
        .from("bos_cost_entry_custom_values")
        .select("entry_id,field_id,value")
        .in("entry_id", entryIds);

      if (valueError) throw valueError;

      const valueMap: Record<string, Record<string, unknown>> = {};
      for (const row of valueRows || []) {
        const entryId = String(row.entry_id);
        valueMap[entryId] = valueMap[entryId] || {};
        valueMap[entryId][String(row.field_id)] = row.value;
      }
      setCustomValues(valueMap);
    } else {
      setCustomValues({});
    }
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        await loadPlans();
      } catch (error: any) {
        if (active) setMessage(error?.message || "Could not load cost registers.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;
    void loadPlanDetail(selectedPlanId).catch((error: any) =>
      setMessage(error?.message || "Could not load this cost register.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId]);

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    const user = await requireUser();
    if (!user) return;

    const title = planForm.title.trim();
    if (title.length < 2) return setMessage("Give the register a clear name.");

    const { data, error } = await supabase
      .from("bos_cost_plans")
      .insert({
        user_id: user.id,
        operating_mode: planForm.operating_mode,
        title,
        status: "active",
        target_output_quantity: Number(planForm.target_output_quantity || 0) || null,
        target_output_unit: planForm.target_output_unit.trim() || null,
      })
      .select("id")
      .single();

    if (error) return setMessage(error.message);

    setPlanForm({
      operating_mode: "product",
      title: "",
      target_output_quantity: "",
      target_output_unit: "unit",
    });
    await loadPlans();
    if (data?.id) setSelectedPlanId(String(data.id));
    setMessage("Cost register created.");
  }

  async function addCentre(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPlanId) return setMessage("Open a register first.");
    if (!centreLabel.trim()) return setMessage("Enter a cost centre/work package name.");

    const { error } = await supabase.from("bos_cost_centres").insert({
      plan_id: selectedPlanId,
      label: centreLabel.trim(),
      centre_type: selectedPlan?.operating_mode === "product" ? "product_batch" : "work_package",
    });

    if (error) return setMessage(error.message);

    setCentreLabel("");
    await loadPlanDetail(selectedPlanId);
    setMessage("Cost centre added.");
  }

  async function addColumn(event: React.FormEvent) {
    event.preventDefault();
    const user = await requireUser();
    if (!user) return;
    if (!selectedPlanId) return setMessage("Open a register first.");

    const label = columnForm.label.trim();
    if (!label) return setMessage("Enter a custom column name.");

    const fieldKey = makeCostCustomFieldKey(
      label,
      customFields.map((field) => field.field_key)
    );

    const { error } = await supabase.from("bos_cost_custom_fields").insert({
      user_id: user.id,
      plan_id: selectedPlanId,
      field_key: fieldKey,
      label,
      field_type: columnForm.field_type,
      sort_order: 1000 + customFields.length,
    });

    if (error) return setMessage(error.message);

    setColumnForm({ label: "", field_type: "text" });
    await loadPlanDetail(selectedPlanId);
    setMessage(`Column “${label}” added.`);
  }

  async function addEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPlanId) return setMessage("Open a register first.");

    const description = entryForm.description.trim();
    if (!description) return setMessage("Enter what the expense was for.");

    const quantity = Number(entryForm.quantity || 0);
    const rate = Number(entryForm.rate || 0);
    const typedAmount = Number(entryForm.amount || 0);
    const amount = typedAmount > 0 ? typedAmount : quantity > 0 && rate > 0 ? quantity * rate : 0;

    if (amount <= 0) return setMessage("Enter the amount spent.");

    const { data, error } = await supabase
      .from("bos_cost_entries")
      .insert({
        plan_id: selectedPlanId,
        cost_centre_id: entryForm.cost_centre_id || null,
        entry_date: entryForm.entry_date,
        entry_type: entryForm.entry_type,
        description,
        quantity: quantity > 0 ? quantity : 0,
        unit: entryForm.unit.trim() || null,
        rate: rate > 0 ? rate : 0,
        amount,
      })
      .select("id")
      .single();

    if (error) return setMessage(error.message);

    const entryId = String(data.id);
    const valueRows = planFields
      .map((field) => ({
        entry_id: entryId,
        field_id: field.id,
        value: normalizeCustomFieldValue(field.field_type, entryCustomValues[field.id]),
      }))
      .filter((row) => row.value !== null);

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase
        .from("bos_cost_entry_custom_values")
        .insert(valueRows);

      if (valuesError) return setMessage(valuesError.message);
    }

    const { error: totalError } = await supabase.rpc(
      "refresh_bos_cost_plan_actual_total",
      { target_plan_id: selectedPlanId }
    );

    if (totalError) return setMessage(totalError.message);

    setEntryForm({
      entry_date: today(),
      entry_type: "purchase",
      description: "",
      cost_centre_id: "",
      quantity: "",
      unit: "",
      rate: "",
      amount: "",
    });
    setEntryCustomValues({});

    await loadPlans();
    await loadPlanDetail(selectedPlanId);
    setMessage("Expense added to the register.");
  }

  if (loading) {
    return (
      <UniversalDashboardShell
        eyebrow="Cost Inventory"
        title="Preparing your cost register"
        subtitle="Loading production and project cost records."
        workFirst
      >
        <div style={{ padding: 24 }}>Loading…</div>
      </UniversalDashboardShell>
    );
  }

  const examples = humanCostEntryExamples();

  return (
    <CostRegisterCapabilityGate requestedMode={requestedMode}>
    <UniversalDashboardShell
      eyebrow="Human-First Production & Project Cost Inventory"
      title="Cost Register"
      subtitle="Keep the real cost of making products or executing projects in one simple register. Add your own columns whenever your work needs them."
      workFirst
    >
      <div style={{ display: "grid", gap: 16 }}>
        {message ? (
          <div style={{ padding: 12, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe", fontWeight: 800 }}>
            {message}
          </div>
        ) : null}

        <section style={{ padding: 16, borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff" }}>
          <h2 style={{ marginTop: 0 }}>1. Create or open a register</h2>
          <form onSubmit={createPlan} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <select
              value={requestedMode ?? planForm.operating_mode}
              onChange={(e) => setPlanForm({ ...planForm, operating_mode: e.target.value as "product" | "project" })}
              disabled={Boolean(requestedMode)}
              style={inputStyle}
            >
              <option value="product">Manufacturing / Production</option>
              <option value="project">Builder / Construction Project</option>
            </select>
            <input
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              placeholder="e.g. 10 Sweet Display Counters – August"
              style={inputStyle}
            />
            <input
              value={planForm.target_output_quantity}
              onChange={(e) => setPlanForm({ ...planForm, target_output_quantity: e.target.value })}
              placeholder="Target quantity"
              type="number"
              min="0"
              style={inputStyle}
            />
            <input
              value={planForm.target_output_unit}
              onChange={(e) => setPlanForm({ ...planForm, target_output_unit: e.target.value })}
              placeholder="unit / nos / sq.ft"
              style={inputStyle}
            />
            <button style={primaryButton}>Create register</button>
          </form>

          {plans.length > 0 ? (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  style={{
                    ...secondaryButton,
                    borderColor: selectedPlanId === plan.id ? "#2563eb" : "#cbd5e1",
                    background: selectedPlanId === plan.id ? "#eff6ff" : "#fff",
                  }}
                >
                  {plan.title} · {money(plan.actual_total)}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {selectedPlan ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <Metric label="Register" value={selectedPlan.title} />
              <Metric label="Mode" value={selectedPlan.operating_mode === "product" ? "Manufacturing" : "Builder / Project"} />
              <Metric label="Estimated" value={money(selectedPlan.estimated_total)} />
              <Metric label="Actual spent" value={money(selectedPlan.actual_total)} />
            </section>

            <section style={{ padding: 16, borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff" }}>
              <h2 style={{ marginTop: 0 }}>2. Add work areas when useful</h2>
              <p style={{ color: "#64748b" }}>
                Examples: Raw Frame, Glass Work, Tower A, Road, Drainage, Commercial Block.
              </p>
              <form onSubmit={addCentre} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <input
                  value={centreLabel}
                  onChange={(e) => setCentreLabel(e.target.value)}
                  placeholder="Cost centre / work package"
                  style={{ ...inputStyle, flex: "1 1 260px" }}
                />
                <button style={secondaryButton}>Add work area</button>
              </form>
            </section>

            <section style={{ padding: 16, borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0 }}>3. Add your own columns</h2>
                  <p style={{ color: "#64748b", marginBottom: 0 }}>
                    Add Worker Name, Vehicle No., Tower, Machine Hours, Electricity Units—or anything else your business needs.
                  </p>
                </div>
              </div>

              <form onSubmit={addColumn} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <input
                  value={columnForm.label}
                  onChange={(e) => setColumnForm({ ...columnForm, label: e.target.value })}
                  placeholder="Column name"
                  style={{ ...inputStyle, flex: "1 1 220px" }}
                />
                <select
                  value={columnForm.field_type}
                  onChange={(e) => setColumnForm({ ...columnForm, field_type: e.target.value as CostCustomFieldType })}
                  style={inputStyle}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="date">Date</option>
                  <option value="boolean">Yes / No</option>
                  <option value="select">Drop-down</option>
                </select>
                <button style={secondaryButton}>+ Add Column</button>
              </form>
            </section>

            <section style={{ padding: 16, borderRadius: 18, border: "1px solid #dbeafe", background: "#fff" }}>
              <h2 style={{ marginTop: 0 }}>4. Add an expense</h2>
              <p style={{ color: "#64748b" }}>
                Example: “{examples[0].description} – {money(examples[0].amount)}” or “{examples[1].description} – {money(examples[1].amount)}”.
              </p>

              <form onSubmit={addEntry} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                <input
                  type="date"
                  value={entryForm.entry_date}
                  onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
                  style={inputStyle}
                />
                <select
                  value={entryForm.entry_type}
                  onChange={(e) => setEntryForm({ ...entryForm, entry_type: e.target.value })}
                  style={inputStyle}
                >
                  {ENTRY_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder="What was this expense for?"
                  style={inputStyle}
                />
                <select
                  value={entryForm.cost_centre_id}
                  onChange={(e) => setEntryForm({ ...entryForm, cost_centre_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">General / whole register</option>
                  {centres.map((centre) => (
                    <option key={centre.id} value={centre.id}>{centre.label}</option>
                  ))}
                </select>
                <input
                  value={entryForm.quantity}
                  onChange={(e) => setEntryForm({ ...entryForm, quantity: e.target.value })}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Quantity"
                  style={inputStyle}
                />
                <input
                  value={entryForm.unit}
                  onChange={(e) => setEntryForm({ ...entryForm, unit: e.target.value })}
                  placeholder="Unit"
                  style={inputStyle}
                />
                <input
                  value={entryForm.rate}
                  onChange={(e) => setEntryForm({ ...entryForm, rate: e.target.value })}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Rate"
                  style={inputStyle}
                />
                <input
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount ₹"
                  style={inputStyle}
                />

                {planFields.map((field) => (
                  <input
                    key={field.id}
                    value={String(entryCustomValues[field.id] ?? "")}
                    onChange={(e) =>
                      setEntryCustomValues({
                        ...entryCustomValues,
                        [field.id]:
                          field.field_type === "boolean"
                            ? e.target.value === "true"
                            : e.target.value,
                      })
                    }
                    type={
                      field.field_type === "number" || field.field_type === "currency"
                        ? "number"
                        : field.field_type === "date"
                          ? "date"
                          : "text"
                    }
                    placeholder={field.label}
                    style={inputStyle}
                  />
                ))}

                <button style={primaryButton}>Add to register</button>
              </form>
            </section>

            <section style={{ padding: 16, borderRadius: 18, border: "1px solid #e2e8f0", background: "#fff", overflowX: "auto" }}>
              <h2 style={{ marginTop: 0 }}>5. Cost register</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    {["Date", "Type", "Description", "Work area", "Qty", "Unit", "Rate", "Amount", ...planFields.map((field) => field.label)].map((label) => (
                      <th key={label} style={thStyle}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={8 + planFields.length} style={{ padding: 20, color: "#64748b" }}>
                        No entries yet. Add the first real expense above.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={tdStyle}>{entry.entry_date}</td>
                        <td style={tdStyle}>{ENTRY_TYPES.find(([value]) => value === entry.entry_type)?.[1] || entry.entry_type}</td>
                        <td style={tdStyle}><strong>{entry.description}</strong></td>
                        <td style={tdStyle}>{centres.find((centre) => centre.id === entry.cost_centre_id)?.label || "General"}</td>
                        <td style={tdStyle}>{entry.quantity || ""}</td>
                        <td style={tdStyle}>{entry.unit || ""}</td>
                        <td style={tdStyle}>{Number(entry.rate || 0) > 0 ? money(entry.rate) : ""}</td>
                        <td style={{ ...tdStyle, fontWeight: 900 }}>{money(entry.amount)}</td>
                        {planFields.map((field) => (
                          <td key={field.id} style={tdStyle}>
                            {String(customValues[entry.id]?.[field.id] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <section style={{ padding: 20, borderRadius: 18, border: "1px dashed #cbd5e1", color: "#64748b" }}>
            Create your first production or project cost register above.
          </section>
        )}
      </div>
    </UniversalDashboardShell>
    </CostRegisterCapabilityGate>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 18, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 10,
  border: 0,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 9px",
  borderBottom: "1px solid #cbd5e1",
  fontSize: 12,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 9px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13,
  verticalAlign: "top",
};
