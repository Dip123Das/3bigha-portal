"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Attribute = {
  id: string;
  name: string;
  slug: string;
  input_type: "single_select" | "multi_select";
  is_active: boolean;
  sort_order: number;
};

type ProductGroup = {
  id: string;
  name: string;
  slug: string;
  kind: "product_group";
  is_active: boolean;
  sort_order: number;
};

type Mapping = { product_group_id: string; attribute_id: string };

type ValueRow = {
  id: string;
  attribute_id: string;
  product_group_id: string | null;
  value: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  source: string;
  historical_answer_count: number;
};

type Summary = {
  total_values: number;
  active_values: number;
  inactive_values: number;
  global_values: number;
  product_group_values: number;
};

type FormState = {
  attribute_id: string;
  scope: "global" | "product_group";
  product_group_id: string;
  value: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  attribute_id: "",
  scope: "global",
  product_group_id: "",
  value: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

function control(disabled = false): React.CSSProperties {
  return {
    width: "100%", minHeight: 42, padding: "9px 11px",
    border: "1px solid rgba(15,23,42,.18)", borderRadius: 10,
    background: disabled ? "#f1f5f9" : "#fff", color: "#0f172a",
  };
}

function button(primary = false, danger = false): React.CSSProperties {
  return {
    minHeight: 38, padding: "8px 12px", borderRadius: 10,
    border: danger ? "1px solid #fecaca" : "1px solid rgba(15,23,42,.16)",
    background: danger ? "#fff1f2" : primary ? "#0f172a" : "#fff",
    color: danger ? "#be123c" : primary ? "#fff" : "#0f172a",
    fontWeight: 750, cursor: "pointer",
  };
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }
  return body;
}

export default function MaterialsValuesPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [values, setValues] = useState<ValueRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [aiBusy, setAiBusy] = useState<"names" | "description" | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
  }

  async function api(method: "GET" | "POST" | "PATCH", body?: unknown) {
    const token = await accessToken();
    const response = await fetch("/api/admin/material-values", {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    return readJson(response);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api("GET");
      setAttributes(Array.isArray(result.attributes) ? result.attributes : []);
      setProductGroups(Array.isArray(result.product_groups) ? result.product_groups : []);
      setMappings(Array.isArray(result.attribute_mappings) ? result.attribute_mappings : []);
      setValues(Array.isArray(result.values) ? result.values : []);
      setSummary(result.summary || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load Materials Values.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAttribute = attributes.find((row) => row.id === form.attribute_id) || null;
  const mappedProductGroups = useMemo(() => {
    const ids = new Set(mappings.filter((row) => row.attribute_id === form.attribute_id).map((row) => row.product_group_id));
    return productGroups.filter((row) => ids.has(row.id) && row.is_active);
  }, [form.attribute_id, mappings, productGroups]);

  const visibleValues = useMemo(() => values.filter((row) => {
    if (form.attribute_id && row.attribute_id !== form.attribute_id) return false;
    if (form.scope === "global" && row.product_group_id) return false;
    if (form.scope === "product_group" && form.product_group_id && row.product_group_id !== form.product_group_id) return false;
    if (form.scope === "product_group" && !form.product_group_id && !row.product_group_id) return false;
    return showInactive || row.is_active;
  }), [values, form.attribute_id, form.scope, form.product_group_id, showInactive]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectAttribute(id: string) {
    if (editingId) return;
    setForm((current) => ({ ...current, attribute_id: id, product_group_id: "" }));
    setAiSuggestions([]);
    setAiMessage("");
  }

  function selectScope(scope: "global" | "product_group") {
    if (editingId) return;
    setForm((current) => ({ ...current, scope, product_group_id: "" }));
    setAiSuggestions([]);
    setAiMessage("");
  }

  function beginCreate() {
    setEditingId(null);
    setSlugTouched(false);
    setForm((current) => ({ ...emptyForm, attribute_id: current.attribute_id, scope: current.scope, product_group_id: current.product_group_id }));
    setMessage(""); setError(""); setAiMessage(""); setAiSuggestions([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginEdit(row: ValueRow) {
    setEditingId(row.id);
    setSlugTouched(true);
    setForm({
      attribute_id: row.attribute_id,
      scope: row.product_group_id ? "product_group" : "global",
      product_group_id: row.product_group_id || "",
      value: row.value,
      slug: row.slug,
      description: row.description || "",
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });
    setMessage(""); setError(""); setAiMessage(""); setAiSuggestions([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      if (!form.attribute_id) throw new Error("Step 1: Choose the parent Materials Attribute.");
      if (form.scope === "product_group" && !form.product_group_id) throw new Error("Step 2: Choose the Product Group for this scoped Value.");
      if (!form.value.trim()) throw new Error("Enter the controlled Value label.");
      const payload = editingId
        ? { id: editingId, value: form.value, description: form.description, sort_order: form.sort_order, is_active: form.is_active }
        : {
            attribute_id: form.attribute_id,
            product_group_id: form.scope === "product_group" ? form.product_group_id : null,
            value: form.value,
            slug: form.slug || slugify(form.value),
            description: form.description,
            sort_order: form.sort_order,
          };
      await api(editingId ? "PATCH" : "POST", payload);
      setMessage(editingId ? "Materials Value updated successfully." : "Materials Value created successfully.");
      setEditingId(null); setSlugTouched(false);
      setForm((current) => ({ ...emptyForm, attribute_id: current.attribute_id, scope: current.scope, product_group_id: current.product_group_id }));
      setAiSuggestions([]); setAiMessage("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the Materials Value.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: ValueRow) {
    setSaving(true); setError(""); setMessage("");
    try {
      await api("PATCH", {
        id: row.id, value: row.value, description: row.description || "",
        sort_order: row.sort_order, is_active: !row.is_active,
      });
      setMessage(row.is_active ? "Materials Value deactivated. Its history remains preserved." : "Materials Value reactivated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the Value lifecycle.");
    } finally {
      setSaving(false);
    }
  }

  async function requestAi(task: "name_suggestions" | "description") {
    if (!selectedAttribute) { setAiMessage("Choose a Materials Attribute first."); return; }
    setAiBusy(task === "name_suggestions" ? "names" : "description");
    setAiMessage("");
    if (task === "name_suggestions") setAiSuggestions([]);
    try {
      const token = await accessToken();
      const group = productGroups.find((row) => row.id === form.product_group_id);
      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task, kind: "material_value", name: form.value,
          context: {
            name: form.value,
            key: editingId ? form.slug : form.slug || slugify(form.value),
            attribute: selectedAttribute.name,
            input_type: selectedAttribute.input_type,
            scope: form.scope,
            group: group?.name || "Global",
          },
        }),
      });
      const result = await readJson(response);
      if (task === "name_suggestions") {
        const suggestions = Array.isArray(result.suggestions)
          ? result.suggestions.filter((item: unknown): item is string => typeof item === "string").slice(0, 8)
          : [];
        if (!suggestions.length) throw new Error("AI did not return usable controlled Values.");
        setAiSuggestions(suggestions);
        setAiMessage("AI suggestions are advisory. Select only a genuine answer for the chosen Attribute.");
      } else {
        const description = typeof result.description === "string" ? result.description.trim() : "";
        if (!description) throw new Error("AI did not return a usable description.");
        updateForm("description", description);
        setAiMessage("AI draft copied into the editable form. Review and correct it before saving.");
      }
    } catch (caught) {
      setAiMessage(caught instanceof Error ? caught.message : "AI assistance is unavailable.");
    } finally {
      setAiBusy(null);
    }
  }

  const selectedGroup = productGroups.find((row) => row.id === form.product_group_id);

  return (
    <Container>
      <SectionHeader title="Materials → Values" subtitle="Create controlled choices for reusable Materials Attributes." />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/taxonomy" variant="secondary">Taxonomy →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">Attributes →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/mapping" variant="secondary">Mapping →</ActionButton>
      </div>

      <section style={{ padding: 14, borderRadius: 14, background: "#eff6ff", marginBottom: 14 }}>
        <strong>How to use this page</strong>
        <div style={{ color: "#334155", marginTop: 5, lineHeight: 1.55 }}>
          Choose a controlled-choice Attribute, choose whether its answers are Global or Product-Group-specific, then add one answer at a time.
          Measurements such as Thickness, Weight and Length are entered on listings—not here.
        </div>
      </section>

      {summary ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Badge>Total {summary.total_values}</Badge><Badge>Active {summary.active_values}</Badge>
          <Badge>Global {summary.global_values}</Badge><Badge>Product Group {summary.product_group_values}</Badge>
        </div>
      ) : null}

      {error ? <div style={{ padding: 12, borderRadius: 10, background: "#fff1f2", color: "#be123c", marginBottom: 12 }}>{error}</div> : null}
      {message ? <div style={{ padding: 12, borderRadius: 10, background: "#ecfdf5", color: "#047857", marginBottom: 12 }}>{message}</div> : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 5px" }}>Step 1 — Choose the parent Materials Attribute</h3>
        <p style={{ color: "#64748b", margin: "0 0 12px" }}>Only one-choice and multiple-choice Attributes can have controlled Values.</p>
        <select value={form.attribute_id} disabled={Boolean(editingId)} onChange={(event) => selectAttribute(event.target.value)} style={control(Boolean(editingId))}>
          <option value="">Select a controlled-choice Attribute</option>
          {attributes.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name} — {row.input_type === "single_select" ? "one choice" : "multiple choices"}</option>)}
        </select>

        <h3 style={{ margin: "18px 0 5px" }}>Step 2 — Choose where this Value applies</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 10 }}>
          <button type="button" disabled={Boolean(editingId)} onClick={() => selectScope("global")} style={{ ...button(form.scope === "global"), textAlign: "left", padding: 14 }}>
            Global Value<br /><small>Available wherever this Attribute is mapped</small>
          </button>
          <button type="button" disabled={Boolean(editingId)} onClick={() => selectScope("product_group")} style={{ ...button(form.scope === "product_group"), textAlign: "left", padding: 14 }}>
            Product Group-specific Value<br /><small>Available only for one mapped Product Group</small>
          </button>
        </div>
        {form.scope === "product_group" ? (
          <div style={{ marginTop: 10 }}>
            <select value={form.product_group_id} disabled={Boolean(editingId) || !form.attribute_id} onChange={(event) => updateForm("product_group_id", event.target.value)} style={control(Boolean(editingId) || !form.attribute_id)}>
              <option value="">Select a mapped Product Group</option>
              {mappedProductGroups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            {form.attribute_id && !mappedProductGroups.length ? <p style={{ color: "#b45309", margin: "8px 0 0" }}>This Attribute has no active Product Group mapping. Use the Mapping page first.</p> : null}
          </div>
        ) : null}

        <h3 style={{ margin: "18px 0 5px" }}>Step 3 — {editingId ? "Edit" : "Add"} controlled Value</h3>
        <p style={{ color: "#64748b", margin: "0 0 12px" }}>
          {selectedAttribute ? `Adding an answer for ${selectedAttribute.name}${form.scope === "product_group" && selectedGroup ? ` under ${selectedGroup.name}` : " globally"}.` : "Choose an Attribute above before entering a Value."}
        </p>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 5 }}>Controlled Value</label>
        <input value={form.value} onChange={(event) => {
          const value = event.target.value;
          updateForm("value", value);
          if (!slugTouched && !editingId) updateForm("slug", slugify(value));
        }} placeholder="Example: OPC 43 Grade, Red, Matte or Interior" style={control()} />

        <label style={{ display: "block", fontWeight: 700, margin: "14px 0 5px" }}>Administrator-reviewed description</label>
        <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={4} placeholder="Explain what this controlled answer means within the selected Attribute." style={control()} />

        <details style={{ marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 750 }}>Advanced details — normally no change is needed</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 12 }}>
            <div><label style={{ display: "block", fontWeight: 700, marginBottom: 5 }}>Permanent key</label><input value={form.slug} disabled={Boolean(editingId)} onChange={(event) => { setSlugTouched(true); updateForm("slug", slugify(event.target.value)); }} style={control(Boolean(editingId))} /></div>
            <div><label style={{ display: "block", fontWeight: 700, marginBottom: 5 }}>Sort order</label><input type="number" min="0" max="1000000" value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} style={control()} /></div>
          </div>
        </details>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || !selectedAttribute} onClick={() => void requestAi("name_suggestions")}>{aiBusy === "names" ? "Thinking…" : "Suggest Values with AI"}</button>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || !selectedAttribute || !form.value.trim()} onClick={() => void requestAi("description")}>{aiBusy === "description" ? "Drafting…" : "Draft description with AI"}</button>
          <button type="button" style={button(true)} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Review and save changes" : "Review and create Value"}</button>
          {editingId ? <button type="button" style={button()} disabled={saving} onClick={beginCreate}>Cancel edit</button> : null}
        </div>
        {aiMessage ? <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#eff6ff", color: "#1e40af" }}>{aiMessage}</div> : null}
        {aiSuggestions.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{aiSuggestions.map((suggestion) => <button key={suggestion} type="button" style={button()} onClick={() => { updateForm("value", suggestion); if (!slugTouched && !editingId) updateForm("slug", slugify(suggestion)); }}>{suggestion}</button>)}</div> : null}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div><h3 style={{ margin: 0 }}>Step 4 — Existing controlled Values</h3><p style={{ color: "#64748b", margin: "5px 0 12px" }}>Choose an Attribute and scope above to narrow this list.</p></div>
          <label style={{ color: "#475569" }}><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Show inactive</label>
        </div>
        {loading ? <p>Loading Materials Values…</p> : !visibleValues.length ? <EmptyState message="No controlled Values are available in this selection." /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {visibleValues.map((row) => {
              const attribute = attributes.find((item) => item.id === row.attribute_id);
              const group = productGroups.find((item) => item.id === row.product_group_id);
              return <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, opacity: row.is_active ? 1 : .68 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><strong>{row.value}</strong><Badge>{row.is_active ? "Active" : "Inactive"}</Badge><Badge>{group ? group.name : "Global"}</Badge></div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>{attribute?.name || "Unknown Attribute"} · {row.slug} · sort {row.sort_order}</div>
                    {row.description ? <p style={{ margin: "7px 0 0", color: "#334155" }}>{row.description}</p> : null}
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 7 }}>Historical answers {row.historical_answer_count}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><button type="button" style={button()} disabled={saving} onClick={() => beginEdit(row)}>Edit</button><button type="button" style={button(false, row.is_active)} disabled={saving} onClick={() => void toggle(row)}>{row.is_active ? "Deactivate" : "Reactivate"}</button></div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section style={{ padding: 14, borderRadius: 14, background: "#eff6ff", marginTop: 14 }}>
        <strong>Human First. AI Second. Precision Always.</strong>
        <div style={{ color: "#475569", marginTop: 5 }}>AI suggestions never save automatically. Permanent keys, parent Attributes and Product Group scopes lock after creation. Deactivation preserves history. Controlled Values are catalogue answers—not prices, stock, availability, measurements or certification claims.</div>
      </section>
    </Container>
  );
}
