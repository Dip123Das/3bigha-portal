"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";

type Kind = "category" | "subcategory" | "service";

type Taxon = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  source: string;
  child_count: number;
  active_child_count: number;
  descendant_count: number;
  provider_service_count: number;
  attribute_mapping_count: number;
  attribute_value_count: number;
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
  kind: "category",
  parent_id: "",
  name: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

const levels: Array<{
  kind: Kind;
  title: string;
  purpose: string;
  example: string;
}> = [
  {
    kind: "category",
    title: "Services Category",
    purpose: "The broadest family used to organise professional, skilled and legal services.",
    example: "Professional / Skilled Services or Legal Services",
  },
  {
    kind: "subcategory",
    title: "Services Subcategory",
    purpose: "A narrower work or professional discipline belonging to one Category.",
    example: "Surveying, Masonry, Electrical, Documentation or Advisory",
  },
  {
    kind: "service",
    title: "Service",
    purpose: "The specific skill or professional service that a provider can select while listing.",
    example: "Land Surveyor, Brick Mason, Electrician or Property Verification Lawyer",
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

export default function ServicesTaxonomyPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [taxons, setTaxons] = useState<Taxon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [aiBusy, setAiBusy] = useState<"names" | "description" | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const activeLevel = levels.find((level) => level.kind === form.kind) || levels[0];
  const categories = useMemo(() => taxons.filter((row) => row.kind === "category"), [taxons]);
  const subcategories = useMemo(() => taxons.filter((row) => row.kind === "subcategory"), [taxons]);
  const services = useMemo(() => taxons.filter((row) => row.kind === "service"), [taxons]);
  const visibleSubcategories = useMemo(
    () => subcategories.filter((row) => row.parent_id === serviceCategoryId),
    [subcategories, serviceCategoryId]
  );
  const visibleRows = useMemo(() => taxons.filter((row) => row.kind === form.kind), [taxons, form.kind]);
  const taxonById = useMemo(() => new Map(taxons.map((row) => [row.id, row])), [taxons]);

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
  }

  async function api(method: "GET" | "POST" | "PATCH", body?: unknown) {
    const token = await accessToken();
    const response = await fetch("/api/admin/service-taxonomy", {
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
      setError(caught instanceof Error ? caught.message : "Failed to load Services Taxonomy.");
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
    setServiceCategoryId("");
    resetAssistance();
    setForm({ ...emptyForm, kind });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginEdit(row: Taxon) {
    setEditingId(row.id);
    setSlugTouched(true);
    resetAssistance();
    if (row.kind === "service" && row.parent_id) {
      setServiceCategoryId(taxonById.get(row.parent_id)?.parent_id || "");
    } else {
      setServiceCategoryId("");
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
    if ((form.kind === "subcategory" || form.kind === "service") && !form.parent_id) {
      return setError(form.kind === "subcategory" ? "Select the Services Category." : "Select the Services Subcategory.");
    }
    const parent = taxonById.get(form.parent_id);
    const confirmed = window.confirm(
      [
        editingId ? `Save changes to “${name}”?` : `Create ${activeLevel.title} “${name}”?`,
        parent ? `Parent: ${parent.name}` : "Parent: None (top-level)",
        `Permanent key: ${permanentKey}`,
        editingId
          ? "The permanent key, level and parent will remain locked."
          : "Check the name, parent and description before confirming.",
      ].join("\n")
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = editingId
        ? {
            id: editingId,
            name,
            description: form.description,
            sort_order: form.sort_order,
            is_active: form.is_active,
          }
        : {
            kind: form.kind,
            parent_id: form.kind === "category" ? null : form.parent_id,
            name,
            slug: permanentKey,
            description: form.description,
            sort_order: form.sort_order,
            is_active: form.is_active,
          };
      await api(editingId ? "PATCH" : "POST", payload);
      setMessage(editingId ? "Services Taxonomy entry updated." : "Services Taxonomy entry created.");
      setEditingId(null);
      setSlugTouched(false);
      setForm({ ...emptyForm, kind: form.kind });
      setServiceCategoryId("");
      setAiSuggestions([]);
      setAiMessage("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save Services Taxonomy.");
    } finally {
      setSaving(false);
    }
  }

  async function ai(task: "name_suggestions" | "description") {
    setAiBusy(task === "name_suggestions" ? "names" : "description");
    setAiMessage("");
    try {
      const token = await accessToken();
      const parent = taxonById.get(form.parent_id);
      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind === "service" ? "service" : `service_${form.kind}`,
          task,
          context: {
            name: form.name,
            key: form.slug,
            family: parent?.name || "Top-level Services Category",
          },
          existing: form.description,
          existingNames: visibleRows.map((row) => row.name),
        }),
      });
      const result = await readJson(response);
      if (result.needs_clarification) {
        setAiMessage(result.question || "Please provide more specific Services context.");
      } else if (task === "name_suggestions") {
        setAiSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
        setAiMessage("Review a suggestion before placing it in the form. Nothing was saved.");
      } else if (typeof result.description === "string") {
        updateForm("description", result.description);
        setAiMessage("Draft placed in the editable description field. Review it before saving.");
      }
    } catch (caught) {
      setAiMessage(caught instanceof Error ? caught.message : "AI assistance is unavailable.");
    } finally {
      setAiBusy(null);
    }
  }

  const parentOptions = form.kind === "subcategory" ? categories : form.kind === "service" ? visibleSubcategories : [];

  return (
    <Container>
      <SectionHeader
        eyebrow="Admin / Master Data / Services"
        title="Services Taxonomy"
        subtitle="Govern Categories, Subcategories and individual Services without deleting permanent catalogue identities."
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <ActionButton href="/admin/dashboard/master-data/services/attributes" variant="secondary">Attributes</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/services/mapping" variant="secondary">Mapping</ActionButton>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">Master Data</ActionButton>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ padding: 18, border: "1px solid #dbe3ee", borderRadius: 14, background: "#f8fafc" }}>
          <strong>How to classify a Service</strong>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div><b>1. Category:</b> broadest family, such as Professional / Skilled Services.</div>
            <div><b>2. Subcategory:</b> discipline under that family, such as Surveying or Masonry.</div>
            <div><b>3. Service:</b> selectable work, such as Land Surveyor or Brick Mason.</div>
          </div>
          <p style={{ marginBottom: 0 }}>
            Names and descriptions may be improved later. Permanent keys, hierarchy levels and parent relationships lock after creation. Deactivate unused entries instead of deleting them.
          </p>
        </section>

        <section style={{ padding: 18, border: "1px solid #dbe3ee", borderRadius: 14, background: "#fff" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {levels.map((level) => (
              <button key={level.kind} type="button" style={button(form.kind === level.kind)} onClick={() => chooseLevel(level.kind)}>
                {level.title}
              </button>
            ))}
          </div>

          <h2 style={{ margin: "0 0 4px" }}>{editingId ? `Edit ${activeLevel.title}` : `Add ${activeLevel.title}`}</h2>
          <p style={{ marginTop: 0, color: "#475569" }}>{activeLevel.purpose} Example: {activeLevel.example}.</p>

          {form.kind === "service" ? (
            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span>Services Category used to filter Subcategories</span>
              <select
                style={control(Boolean(editingId))}
                value={serviceCategoryId}
                disabled={Boolean(editingId)}
                onChange={(event) => {
                  setServiceCategoryId(event.target.value);
                  updateForm("parent_id", "");
                }}
              >
                <option value="">Select Category</option>
                {categories.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
          ) : null}

          {form.kind !== "category" ? (
            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span>Permanent parent</span>
              <select
                style={control(Boolean(editingId))}
                value={form.parent_id}
                disabled={Boolean(editingId)}
                onChange={(event) => updateForm("parent_id", event.target.value)}
              >
                <option value="">Select {form.kind === "subcategory" ? "Category" : "Subcategory"}</option>
                {parentOptions.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Display name</span>
              <input
                style={control()}
                value={form.name}
                maxLength={120}
                onChange={(event) => {
                  const name = event.target.value;
                  updateForm("name", name);
                  if (!editingId && !slugTouched) updateForm("slug", slugify(name));
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Permanent key</span>
              <input
                style={control(Boolean(editingId))}
                value={form.slug}
                disabled={Boolean(editingId)}
                maxLength={120}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateForm("slug", slugify(event.target.value));
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Sort order</span>
              <input style={control()} type="number" min={0} max={1000000} value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
            <span>Administrator description</span>
            <textarea style={{ ...control(), minHeight: 100 }} maxLength={600} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <input type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
            Active and selectable
          </label>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#f8fafc" }}>
            <strong>Optional AI assistance</strong>
            <p style={{ margin: "6px 0 10px", color: "#475569" }}>AI only suggests wording. It cannot create, update or activate a catalogue record.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={button()} disabled={Boolean(aiBusy) || Boolean(editingId)} onClick={() => void ai("name_suggestions")}>
                {aiBusy === "names" ? "Suggesting…" : "Suggest names"}
              </button>
              <button type="button" style={button()} disabled={Boolean(aiBusy) || form.name.trim().length < 3} onClick={() => void ai("description")}>
                {aiBusy === "description" ? "Drafting…" : "Draft description"}
              </button>
            </div>
            {aiSuggestions.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {aiSuggestions.map((suggestion) => (
                  <button key={suggestion} type="button" style={button()} onClick={() => {
                    updateForm("name", suggestion);
                    if (!slugTouched) updateForm("slug", slugify(suggestion));
                  }}>{suggestion}</button>
                ))}
              </div>
            ) : null}
            {aiMessage ? <div style={{ marginTop: 8 }}>{aiMessage}</div> : null}
          </div>

          {error ? <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>{error}</div> : null}
          {message ? <div style={{ marginTop: 12, color: "#166534", fontWeight: 700 }}>{message}</div> : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button type="button" style={button(true)} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Review and save" : "Review and create"}</button>
            {editingId ? <button type="button" style={button()} disabled={saving} onClick={cancelEdit}>Cancel editing</button> : null}
          </div>
        </section>

        <section style={{ padding: 18, border: "1px solid #dbe3ee", borderRadius: 14, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>{labels[form.kind]} catalogue</h2>
              <div style={{ color: "#64748b" }}>{visibleRows.length} record(s), including inactive history.</div>
            </div>
            <button type="button" style={button()} disabled={loading} onClick={() => void load()}>{loading ? "Loading…" : "Refresh"}</button>
          </div>

          {loading ? <p>Loading protected Services Taxonomy…</p> : visibleRows.length === 0 ? <p>No records at this level.</p> : (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {visibleRows.map((row) => {
                const parent = row.parent_id ? taxonById.get(row.parent_id) : null;
                return (
                  <article key={row.id} style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, opacity: row.is_active ? 1 : 0.68 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 850 }}>{row.name}</div>
                        <div style={{ color: "#64748b", fontSize: 13 }}>
                          {parent ? `Parent: ${parent.name} · ` : ""}Key: {row.slug} · Sort: {row.sort_order}
                        </div>
                      </div>
                      <span style={{ fontWeight: 750, color: row.is_active ? "#166534" : "#9f1239" }}>{row.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <p style={{ margin: "8px 0", color: "#334155" }}>{row.description || "No administrator description yet."}</p>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      Children: {row.child_count} · Descendants: {row.descendant_count} · Providers: {row.provider_service_count} · Attribute mappings: {row.attribute_mapping_count} · Historical values: {row.attribute_value_count}
                    </div>
                    <button type="button" style={{ ...button(false, !row.is_active), marginTop: 10 }} onClick={() => beginEdit(row)}>Edit and manage lifecycle</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ padding: 16, border: "1px solid #fed7aa", borderRadius: 14, background: "#fff7ed" }}>
          <strong>Governance reminder</strong>
          <p style={{ marginBottom: 0 }}>Do not create spelling-only duplicates. Keep familiar local professional terms when they help users, but use respectful display names. Review AI wording before the separate save action. Human First. AI Second. Precision Always.</p>
        </section>

        <div style={{ color: "#64748b", fontSize: 13 }}>
          Current totals: {categories.length} Categories · {subcategories.length} Subcategories · {services.length} Services
        </div>
      </div>
    </Container>
  );
}
