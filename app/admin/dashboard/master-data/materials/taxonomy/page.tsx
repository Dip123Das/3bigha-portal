"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Kind = "type" | "category" | "subcategory" | "product_group";
type Taxon = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  child_count: number;
  descendant_count: number;
  listing_count: number;
  subcategory_mapping_count: number;
  product_group_usage_count: number;
  attribute_mapping_count: number;
  controlled_value_count: number;
};
type FormState = {
  kind: Kind;
  parent_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  kind: "type",
  parent_id: "",
  name: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

const levels: Array<{
  kind: Kind;
  short: string;
  title: string;
  purpose: string;
  example: string;
}> = [
  {
    kind: "type",
    short: "1. Type",
    title: "Material Type",
    purpose: "The broadest family of construction materials.",
    example: "Basic Building Materials, Plumbing Materials or Flooring",
  },
  {
    kind: "category",
    short: "2. Category",
    title: "Material Category",
    purpose: "A material family placed under one Material Type.",
    example: "Cement under Basic Building Materials",
  },
  {
    kind: "subcategory",
    short: "3. Subcategory",
    title: "Material Subcategory",
    purpose: "A narrower classification placed under one Material Category.",
    example: "OPC 43 under Cement or CPVC Pipes under Pipes",
  },
  {
    kind: "product_group",
    short: "4. Product Group",
    title: "Reusable Product Group",
    purpose: "A reusable group later connected to Subcategories on the Mapping page.",
    example: "Cement, Reinforcement Steel, Plumbing Pipes or Floor Tiles",
  },
];

const labels = Object.fromEntries(levels.map((level) => [level.kind, level.title])) as Record<Kind, string>;

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
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid rgba(15,23,42,.18)",
    borderRadius: 10,
    background: disabled ? "#f1f5f9" : "#fff",
    color: "#0f172a",
  };
}

function button(primary = false, danger = false): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "9px 13px",
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

export default function MaterialsTaxonomyPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [taxons, setTaxons] = useState<Taxon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [subcategoryTypeId, setSubcategoryTypeId] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [aiBusy, setAiBusy] = useState<"names" | "description" | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const activeLevel = levels.find((level) => level.kind === form.kind) || levels[0];
  const types = useMemo(() => taxons.filter((row) => row.kind === "type"), [taxons]);
  const categories = useMemo(() => taxons.filter((row) => row.kind === "category"), [taxons]);
  const visibleCategories = useMemo(
    () => categories.filter((row) => row.parent_id === subcategoryTypeId),
    [categories, subcategoryTypeId]
  );
  const visibleRows = useMemo(
    () => taxons.filter((row) => row.kind === form.kind),
    [taxons, form.kind]
  );
  const taxonById = useMemo(() => new Map(taxons.map((row) => [row.id, row])), [taxons]);

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
  }

  async function api(method: "GET" | "POST" | "PATCH", body?: unknown) {
    const token = await accessToken();
    const response = await fetch("/api/admin/material-taxonomy", {
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
      setTaxons(Array.isArray(result.taxons) ? result.taxons : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load Materials Taxonomy.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetAssistance() {
    setAiSuggestions([]);
    setAiMessage("");
    setMessage("");
    setError("");
  }

  function chooseLevel(kind: Kind) {
    setEditingId(null);
    setSlugTouched(false);
    setSubcategoryTypeId("");
    resetAssistance();
    setForm({ ...emptyForm, kind });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginEdit(row: Taxon) {
    setEditingId(row.id);
    setSlugTouched(true);
    resetAssistance();
    if (row.kind === "subcategory" && row.parent_id) {
      setSubcategoryTypeId(taxonById.get(row.parent_id)?.parent_id || "");
    } else {
      setSubcategoryTypeId("");
    }
    setForm({
      kind: row.kind,
      parent_id: row.parent_id || "",
      name: row.name,
      slug: row.slug,
      description: row.description || "",
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    chooseLevel(form.kind);
  }

  async function save() {
    setError("");
    setMessage("");
    const name = form.name.trim();
    const permanentKey = (form.slug.trim() || slugify(name)).trim();
    if (name.length < 2) return setError(`Enter a clear ${activeLevel.title} name.`);
    if (permanentKey.length < 2) return setError("The generated permanent key is not valid.");
    if ((form.kind === "category" || form.kind === "subcategory") && !form.parent_id) {
      return setError(form.kind === "category" ? "Select the Material Type." : "Select the Material Category.");
    }
    const parent = taxonById.get(form.parent_id);
    const confirmed = window.confirm(
      [
        editingId ? `Save changes to “${name}”?` : `Create ${activeLevel.title} “${name}”?`,
        parent ? `Parent: ${parent.name}` : "Parent: None (global)",
        `Permanent key: ${permanentKey}`,
        editingId
          ? "The permanent key, level and parent will remain locked."
          : "Check the name, parent and description before confirming.",
      ].join("\n\n")
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      if (editingId) {
        await api("PATCH", {
          id: editingId,
          name,
          description: form.description,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
      } else {
        await api("POST", {
          kind: form.kind,
          parent_id: form.parent_id || null,
          name,
          slug: permanentKey,
          description: form.description,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
      }
      setMessage(editingId ? `“${name}” was updated.` : `“${name}” was created after your review.`);
      setEditingId(null);
      setSlugTouched(false);
      setSubcategoryTypeId("");
      setForm({ ...emptyForm, kind: form.kind });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTaxon(row: Taxon) {
    const next = !row.is_active;
    if (!window.confirm(`${next ? "Reactivate" : "Deactivate"} “${row.name}”?\n\nNo record will be deleted.`)) return;
    setSaving(true);
    setError("");
    try {
      await api("PATCH", {
        id: row.id,
        name: row.name,
        description: row.description || "",
        sort_order: row.sort_order,
        is_active: next,
      });
      setMessage(`“${row.name}” is now ${next ? "active" : "inactive"}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lifecycle change failed.");
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
      const parent = taxonById.get(form.parent_id);
      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          kind: `material_${form.kind}`,
          name: form.name,
          context: {
            name: form.name,
            key: editingId ? form.slug : form.slug || slugify(form.name),
            group: parent?.name || "",
          },
        }),
      });
      const result = await readJson(response);
      if (task === "name_suggestions") {
        const suggestions = Array.isArray(result.suggestions)
          ? result.suggestions.filter((value: unknown): value is string => typeof value === "string").slice(0, 8)
          : [];
        if (!suggestions.length) throw new Error("AI did not return usable Materials suggestions.");
        setAiSuggestions(suggestions);
        setAiMessage("AI suggestions are advisory. Choose one only after checking its Materials context.");
      } else {
        const description = typeof result.description === "string" ? result.description.trim() : "";
        if (!description) throw new Error("AI did not return a usable description.");
        updateForm("description", description);
        setAiMessage("AI placed a draft in the form. Review and correct it before saving.");
      }
    } catch (caught) {
      setAiMessage(caught instanceof Error ? caught.message : "AI assistance is unavailable.");
    } finally {
      setAiBusy(null);
    }
  }

  function parentPath(row: Taxon) {
    const parent = row.parent_id ? taxonById.get(row.parent_id) : null;
    const grandparent = parent?.parent_id ? taxonById.get(parent.parent_id) : null;
    return [grandparent?.name, parent?.name].filter(Boolean).join(" → ");
  }

  return (
    <Container>
      <SectionHeader
        title="Materials → Taxonomy"
        subtitle="Create and maintain the four classification levels used for building and construction materials."
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">Attributes →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/values" variant="secondary">Values →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/mapping" variant="secondary">Mapping →</ActionButton>
      </div>

      {error ? <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#fff1f2", color: "#be123c" }}>{error}</div> : null}
      {message ? <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>{message}</div> : null}

      <section style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 16, marginBottom: 16, background: "#eff6ff" }}>
        <strong>How to use this page</strong>
        <p style={{ margin: "7px 0 0", color: "#334155", lineHeight: 1.55 }}>
          Choose one classification level below. Fill only the fields shown for that level, review the result, and save.
          Product Group relationships belong on the separate Mapping page.
        </p>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <strong>Step 1 — Choose what you want to manage</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          {levels.map((level) => (
            <button
              key={level.kind}
              type="button"
              disabled={Boolean(editingId)}
              onClick={() => chooseLevel(level.kind)}
              style={{
                ...button(form.kind === level.kind),
                textAlign: "left",
                minHeight: 64,
                opacity: editingId && form.kind !== level.kind ? 0.5 : 1,
              }}
            >
              <span style={{ display: "block" }}>{level.short}</span>
              <span style={{ display: "block", marginTop: 3, fontSize: 12, fontWeight: 500 }}>{level.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Step 2 — {editingId ? `Edit ${activeLevel.title}` : `Add ${activeLevel.title}`}</h2>
          <p style={{ color: "#475569", margin: "6px 0 0" }}>{activeLevel.purpose}</p>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}><strong>Example:</strong> {activeLevel.example}</p>
        </div>

        {form.kind === "category" ? (
          <label style={{ display: "block", marginBottom: 12 }}>
            <strong>Select Material Type</strong>
            <span style={{ display: "block", color: "#64748b", fontSize: 13, margin: "3px 0 6px" }}>Choose the broad family that will contain this Category.</span>
            <select style={control(Boolean(editingId))} value={form.parent_id} disabled={Boolean(editingId)} onChange={(event) => updateForm("parent_id", event.target.value)}>
              <option value="">Choose a Material Type</option>
              {types.filter((row) => row.is_active || row.id === form.parent_id).map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}
            </select>
          </label>
        ) : null}

        {form.kind === "subcategory" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 12 }}>
            <label>
              <strong>First, select Material Type</strong>
              <span style={{ display: "block", color: "#64748b", fontSize: 13, margin: "3px 0 6px" }}>This narrows the Category list.</span>
              <select
                style={control(Boolean(editingId))}
                value={subcategoryTypeId}
                disabled={Boolean(editingId)}
                onChange={(event) => { setSubcategoryTypeId(event.target.value); updateForm("parent_id", ""); }}
              >
                <option value="">Choose a Material Type</option>
                {types.filter((row) => row.is_active || row.id === subcategoryTypeId).map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}
              </select>
            </label>
            <label>
              <strong>Then, select Material Category</strong>
              <span style={{ display: "block", color: "#64748b", fontSize: 13, margin: "3px 0 6px" }}>The new Subcategory will permanently belong here.</span>
              <select style={control(!subcategoryTypeId || Boolean(editingId))} value={form.parent_id} disabled={!subcategoryTypeId || Boolean(editingId)} onChange={(event) => updateForm("parent_id", event.target.value)}>
                <option value="">Choose a Material Category</option>
                {visibleCategories.filter((row) => row.is_active || row.id === form.parent_id).map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}
              </select>
            </label>
          </div>
        ) : null}

        {(form.kind === "type" || form.kind === "product_group") ? (
          <div style={{ padding: 11, borderRadius: 10, background: "#f8fafc", color: "#475569", marginBottom: 12 }}>
            {form.kind === "type"
              ? "A Material Type is a top-level classification, so no parent is required."
              : "A Product Group is reusable and global. Connect it to Subcategories later on the Mapping page."}
          </div>
        ) : null}

        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>{activeLevel.title} name</strong>
          <span style={{ display: "block", color: "#64748b", fontSize: 13, margin: "3px 0 6px" }}>Enter a clear construction-material classification, not a brand, price or listing answer.</span>
          <input
            style={control()}
            placeholder={`Example: ${activeLevel.example.split(",")[0]}`}
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              updateForm("name", name);
              if (!editingId && !slugTouched) updateForm("slug", slugify(name));
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <strong>Description</strong>
          <span style={{ display: "block", color: "#64748b", fontSize: 13, margin: "3px 0 6px" }}>Explain what belongs in this classification. Review every AI draft before saving.</span>
          <textarea style={{ ...control(), minHeight: 100, resize: "vertical" }} maxLength={600} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
        </label>

        <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Advanced details — normally no change is needed</summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 12 }}>
            <label>
              <span>Permanent key</span>
              <span style={{ display: "block", color: "#64748b", fontSize: 12, margin: "3px 0 6px" }}>Generated automatically from the name and locked after creation.</span>
              <input style={control(Boolean(editingId))} disabled={Boolean(editingId)} value={form.slug} onChange={(event) => { setSlugTouched(true); updateForm("slug", slugify(event.target.value)); }} />
            </label>
            <label>
              <span>Sort order</span>
              <span style={{ display: "block", color: "#64748b", fontSize: 12, margin: "3px 0 6px" }}>Lower numbers appear first. Keep 1000 unless a special order is required.</span>
              <input type="number" min={0} max={1000000} style={control()} value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} />
            </label>
          </div>
        </details>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || saving} onClick={() => void requestAi("name_suggestions")}>{aiBusy === "names" ? "Generating…" : "Suggest names with AI"}</button>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || saving} onClick={() => void requestAi("description")}>{aiBusy === "description" ? "Drafting…" : "Draft description with AI"}</button>
          <button type="button" style={button(true)} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Review and save changes" : `Review and create ${activeLevel.title}`}</button>
          {editingId ? <button type="button" style={button()} onClick={cancelEdit}>Cancel edit</button> : null}
        </div>
        {aiMessage ? <p style={{ color: "#475569" }}>{aiMessage}</p> : null}
        {aiSuggestions.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {aiSuggestions.map((suggestion) => (
              <button type="button" key={suggestion} style={button()} onClick={() => { updateForm("name", suggestion); if (!editingId) updateForm("slug", slugify(suggestion)); setAiMessage("Suggestion copied into the form. Review it before saving."); }}>{suggestion}</button>
            ))}
          </div>
        ) : null}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Step 3 — Existing {activeLevel.title} records</h2>
            <p style={{ color: "#64748b", margin: "5px 0 0" }}>Showing {visibleRows.length} records. Inactive records remain preserved.</p>
          </div>
          <button type="button" style={button(true)} onClick={() => chooseLevel(form.kind)}>+ Add new {activeLevel.title}</button>
        </div>

        {loading ? <EmptyState message="Loading Materials Taxonomy…" /> : !visibleRows.length ? <EmptyState message={`No ${activeLevel.title} records are available.`} /> : (
          <div style={{ display: "grid", gap: 10 }}>
            {visibleRows.map((row) => {
              const path = parentPath(row);
              return (
                <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, opacity: row.is_active ? 1 : 0.68 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <strong>{row.name}</strong>
                        <Badge>{row.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                      {path ? <div style={{ color: "#475569", fontSize: 13, marginTop: 5 }}>Under: {path}</div> : null}
                      {row.description ? <p style={{ margin: "7px 0 0", color: "#334155", fontSize: 14 }}>{row.description}</p> : null}
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 7 }}>
                        Listings {row.listing_count}
                        {row.kind === "type" || row.kind === "category" ? ` · Children ${row.child_count}` : ""}
                        {row.kind === "product_group" ? ` · Subcategories ${row.product_group_usage_count} · Attributes ${row.attribute_mapping_count} · Values ${row.controlled_value_count}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <button type="button" style={button()} disabled={saving} onClick={() => beginEdit(row)}>Edit</button>
                      <button type="button" style={button(false, row.is_active)} disabled={saving} onClick={() => void toggleTaxon(row)}>{row.is_active ? "Deactivate" : "Reactivate"}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginTop: 16, background: "#f8fafc" }}>
        <strong>Human First. AI Second. Precision Always.</strong>
        <p style={{ color: "#475569", margin: "7px 0 0", lineHeight: 1.55 }}>
          AI suggestions never save automatically. Permanent keys, hierarchy levels and parent relationships lock after creation.
          Deactivation preserves history. Do not enter prices, stock, availability, ownership, addresses, certifications or test claims here.
        </p>
      </section>
    </Container>
  );
}
