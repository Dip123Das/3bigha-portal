"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type InputType = "text" | "number" | "boolean" | "single_select" | "multi_select";
type Scope = "global" | "product_specific";

type Attribute = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: InputType;
  unit: string | null;
  scope: Scope;
  sort_order: number;
  is_active: boolean;
  direct_mapping_count: number;
  product_group_mapping_count: number;
  mapping_count: number;
  value_count: number;
  active_value_count: number;
  historical_answer_count: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  input_type: InputType;
  unit: string;
  scope: Scope;
  sort_order: number;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  input_type: "single_select",
  unit: "",
  scope: "global",
  sort_order: 1000,
};

const inputTypeLabels: Record<InputType, string> = {
  single_select: "One controlled choice",
  multi_select: "Multiple controlled choices",
  number: "Measured number",
  boolean: "Yes or No",
  text: "Short written specification",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function control(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    padding: "9px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: disabled ? "#f1f5f9" : "#fff",
    color: "#0f172a",
  };
}

function button(primary = false, danger = false): React.CSSProperties {
  return {
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 10,
    border: danger ? "1px solid #fecaca" : "1px solid rgba(15,23,42,.16)",
    background: danger ? "#fff1f2" : primary ? "#0f172a" : "#fff",
    color: danger ? "#be123c" : primary ? "#fff" : "#0f172a",
    fontWeight: 750,
    cursor: "pointer",
  };
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }
  return body;
}

export default function ServicesAttributesPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
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
    const response = await fetch("/api/admin/service-attributes", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Services Attributes could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !editingId && !slugTouched) {
        next.slug = slugify(String(value));
      }
      if (key === "input_type" && value !== "number") next.unit = "";
      return next;
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setAiSuggestions([]);
    setAiMessage("");
    setError("");
    setMessage("");
  }

  function beginEdit(row: Attribute) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description || "",
      input_type: row.input_type,
      unit: row.unit || "",
      scope: row.scope,
      sort_order: row.sort_order,
    });
    setSlugTouched(true);
    setAiSuggestions([]);
    setAiMessage("");
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.name.trim()) return setError("Enter the Services Attribute name.");
    if (!editingId && form.input_type === "number" && !form.unit.trim()) {
      return setError("Enter the accurate unit for this measured number.");
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editingId) {
        const current = attributes.find((row) => row.id === editingId);
        await api("PATCH", {
          id: editingId,
          name: form.name,
          description: form.description,
          sort_order: form.sort_order,
          is_active: current?.is_active !== false,
        });
        setMessage("Services Attribute changes saved after administrator review.");
      } else {
        await api("POST", {
          name: form.name,
          slug: form.slug,
          description: form.description,
          input_type: form.input_type,
          unit: form.input_type === "number" ? form.unit : null,
          scope: form.scope,
          sort_order: form.sort_order,
        });
        setMessage("Services Attribute created after administrator review.");
      }
      setEditingId(null);
      setForm(emptyForm);
      setSlugTouched(false);
      setAiSuggestions([]);
      setAiMessage("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The Services Attribute could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: Attribute) {
    const nextActive = !row.is_active;
    const action = nextActive ? "reactivate" : "deactivate";
    const actionLabel = nextActive ? "Reactivate" : "Deactivate";
    if (!window.confirm(`${actionLabel} ${row.name}?\n\nThe record and its history will remain preserved.`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("PATCH", {
        id: row.id,
        name: row.name,
        description: row.description || "",
        sort_order: row.sort_order,
        is_active: nextActive,
      });
      setMessage(`${row.name} ${nextActive ? "reactivated" : "deactivated"}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `The attribute could not be ${action}d.`);
    } finally {
      setSaving(false);
    }
  }

  async function requestAi(task: "name_suggestions" | "description") {
    setAiBusy(task === "name_suggestions" ? "names" : "description");
    setAiMessage("");
    if (task === "name_suggestions") setAiSuggestions([]);
    try {
      const token = await accessToken();
      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          kind: "service_attribute",
          name: form.name,
          context: {
            name: form.name,
            key: editingId ? form.slug : form.slug || slugify(form.name),
            inputType: form.input_type,
            unit: form.input_type === "number" ? form.unit : "",
            scope: form.scope,
          },
        }),
      });
      const result = await readJson(response);
      if (task === "name_suggestions") {
        const suggestions = Array.isArray(result.suggestions)
          ? result.suggestions.filter((value: unknown): value is string => typeof value === "string").slice(0, 8)
          : [];
        if (!suggestions.length) throw new Error("AI did not return usable Services Attribute suggestions.");
        setAiSuggestions(suggestions);
        setAiMessage("AI suggestions are advisory. Choose one only after checking it is a genuine reusable service question.");
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

  const visibleAttributes = attributes.filter((row) => showInactive || row.is_active);

  return (
    <Container>
      <div style={{ display: "grid", gap: 14, paddingBottom: 36 }}>
        <SectionHeader
          title="Services → Attributes"
        subtitle="Create reusable questions that describe how a professional or skilled service will be delivered."
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/taxonomy" variant="secondary">Taxonomy →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/values" variant="secondary">Values →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/mapping" variant="secondary">Mapping →</ActionButton>
        </div>

        <section className="ma-note">
          <strong>How to use this page</strong>
          <div>Create only a reusable service question such as Experience, Service Mode, Response Time, Warranty Offered, Work Team Size or Languages Supported.</div>
          <div>Controlled choices belong on the separate Values page. Service and Product Group relationships belong on the separate Mapping page.</div>
        </section>

        <section className="ma-card">
          <h2>Step 1 — {editingId ? "Edit Services Attribute" : "Add Services Attribute"}</h2>
          <p>Choose the answer type carefully. The permanent key, answer type and unit lock after creation.</p>

          <div className="ma-grid">
            <label>
              <span>Attribute name</span>
              <small>Example: Experience, Service Mode, Response Time, Warranty Offered or Languages Supported.</small>
              <input style={control()} maxLength={120} value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            </label>
            <label>
              <span>Answer type</span>
              <small>Select how a provider must answer this reusable service question.</small>
              <select style={control(Boolean(editingId))} disabled={Boolean(editingId)} value={form.input_type} onChange={(event) => updateForm("input_type", event.target.value as InputType)}>
                {(Object.keys(inputTypeLabels) as InputType[]).map((type) => <option key={type} value={type}>{inputTypeLabels[type]}</option>)}
              </select>
            </label>
          </div>

          {form.input_type === "number" ? (
            <label style={{ display: "block", marginTop: 12 }}>
              <span>Measurement unit</span>
              <small>Required. Use an accurate unit such as years, hours, minutes, persons, visits or kilometres.</small>
              <input style={control(Boolean(editingId))} disabled={Boolean(editingId)} maxLength={30} value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} />
            </label>
          ) : (
            <div className="ma-hint">No unit is allowed for this answer type.</div>
          )}

          <label style={{ display: "block", marginTop: 12 }}>
            <span>Reuse scope</span>
            <small>Global applies wherever mapped. Product-specific is reserved for a specialised reusable Service Product Group.</small>
            <select style={control(Boolean(editingId))} disabled={Boolean(editingId)} value={form.scope} onChange={(event) => updateForm("scope", event.target.value as Scope)}>
              <option value="global">Global reusable question</option>
              <option value="product_specific">Product Group-specific question</option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            <span>Administrator-reviewed description</span>
            <small>Explain what the provider should answer. Do not claim qualifications, licences, availability, prices or service quality.</small>
            <textarea style={{ ...control(), minHeight: 100, resize: "vertical" }} maxLength={600} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </label>

          <details style={{ marginTop: 12 }}>
            <summary><strong>Advanced details — normally no change is needed</strong></summary>
            <div className="ma-grid" style={{ marginTop: 10 }}>
              <label>
                <span>Permanent key</span>
                <small>Generated from the name and locked after creation.</small>
                <input style={control(Boolean(editingId))} disabled={Boolean(editingId)} value={form.slug} onChange={(event) => { setSlugTouched(true); updateForm("slug", slugify(event.target.value)); }} />
              </label>
              <label>
                <span>Sort order</span>
                <small>Lower numbers appear first.</small>
                <input style={control()} type="number" min={0} max={1000000} value={form.sort_order} onChange={(event) => updateForm("sort_order", Number(event.target.value))} />
              </label>
            </div>
          </details>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" style={button()} disabled={Boolean(aiBusy) || saving} onClick={() => void requestAi("name_suggestions")}>{aiBusy === "names" ? "Generating…" : "Suggest attributes with AI"}</button>
            <button type="button" style={button()} disabled={Boolean(aiBusy) || saving || !form.name.trim()} onClick={() => void requestAi("description")}>{aiBusy === "description" ? "Drafting…" : "Draft description with AI"}</button>
            <button type="button" style={button(true)} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Review and save changes" : "Review and create Services Attribute"}</button>
            {editingId ? <button type="button" style={button()} disabled={saving} onClick={resetForm}>Cancel edit</button> : null}
          </div>

          {aiMessage ? <div className="ma-ai">{aiMessage}</div> : null}
          {aiSuggestions.length ? (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
              {aiSuggestions.map((suggestion) => <button key={suggestion} type="button" style={button()} onClick={() => updateForm("name", suggestion)}>{suggestion}</button>)}
            </div>
          ) : null}
          {error ? <div className="ma-error">{error}</div> : null}
          {message ? <div className="ma-success">{message}</div> : null}
        </section>

        <section className="ma-card">
          <div className="ma-heading">
            <div>
              <h2>Step 2 — Existing Services Attributes</h2>
              <p>{attributes.length} preserved record(s). Values and Product Group mappings are managed separately.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
              Show inactive
            </label>
          </div>

          {loading ? <div className="ma-hint">Loading Services Attributes…</div> : null}
          {!loading && !visibleAttributes.length ? <EmptyState message="No Services Attributes are available in this selection." /> : null}
          {!loading ? (
            <div style={{ display: "grid", gap: 9 }}>
              {visibleAttributes.map((row) => (
                <article key={row.id} className="ma-row" style={{ opacity: row.is_active ? 1 : 0.68 }}>
                  <div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                      <strong>{row.name}</strong>
                      <Badge>{row.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge>{inputTypeLabels[row.input_type]}</Badge>
                      <Badge>{row.scope === "global" ? "Global" : "Product-specific"}</Badge>
                      {row.unit ? <Badge>{row.unit}</Badge> : null}
                    </div>
                    <div className="ma-meta">{row.slug} · Direct mappings {row.direct_mapping_count} · Product Group mappings {row.product_group_mapping_count} · Values {row.value_count} · Historical answers {row.historical_answer_count}</div>
                    {row.description ? <p>{row.description}</p> : null}
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button type="button" style={button()} disabled={saving} onClick={() => beginEdit(row)}>Edit</button>
                    <button type="button" style={button(false, row.is_active)} disabled={saving} onClick={() => void toggle(row)}>{row.is_active ? "Deactivate" : "Reactivate"}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="ma-note">
          <strong>Human First. AI Second. Precision Always.</strong>
          <div>AI suggestions never save automatically. An administrator must review every suggestion before using the separate save action.</div>
          <div>Do not create prices, availability, provider identity, addresses, contacts, listing answers, qualifications or licences as Services Attributes.</div>
        </section>
      </div>

      <style jsx>{`
        .ma-card,.ma-note{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fff}.ma-note{background:#eff6ff;color:#1e3a5f;display:grid;gap:5px;font-size:14px}.ma-card h2{font-size:18px;margin:0}.ma-card>p,.ma-heading p{color:#64748b;font-size:13px;margin:5px 0 12px}.ma-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ma-card label span{display:block;font-weight:750;font-size:14px;margin-bottom:3px}.ma-card label small{display:block;color:#64748b;font-size:12px;margin-bottom:6px}.ma-hint,.ma-ai,.ma-error,.ma-success{margin-top:10px;border-radius:9px;padding:9px 11px;font-size:13px}.ma-hint{background:#f8fafc;color:#475569}.ma-ai{background:#eff6ff;color:#1d4ed8}.ma-error{background:#fff1f2;color:#be123c}.ma-success{background:#ecfdf5;color:#047857}.ma-heading,.ma-row{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ma-row{border:1px solid #e2e8f0;border-radius:12px;padding:12px}.ma-row p{font-size:14px;color:#334155;margin:7px 0 0}.ma-meta{font-size:12px;color:#64748b;margin-top:6px}@media(max-width:720px){.ma-grid{grid-template-columns:1fr}}
      `}</style>
    </Container>
  );
}
