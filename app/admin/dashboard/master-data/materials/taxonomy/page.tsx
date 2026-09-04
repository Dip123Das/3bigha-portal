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
  source: string;
  child_count: number;
  active_child_count: number;
  descendant_count: number;
  listing_count: number;
  subcategory_mapping_count: number;
  product_group_usage_count: number;
  attribute_mapping_count: number;
  controlled_value_count: number;
};
type Mapping = {
  subcategory_id: string;
  product_group_id: string;
  is_active: boolean;
};
type Summary = {
  total_taxons: number;
  active_taxons: number;
  inactive_taxons: number;
  type_count: number;
  category_count: number;
  subcategory_count: number;
  product_group_count: number;
  listing_count: number;
  unmapped_subcategory_count: number;
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

const labels: Record<Kind, string> = {
  type: "Material Type",
  category: "Material Category",
  subcategory: "Material Subcategory",
  product_group: "Reusable Product Group",
};

const examples: Record<Kind, string> = {
  type: "Basic Building Materials, Plumbing Materials, Flooring or Glass",
  category: "Cement, Steel, Pipes, Tiles or Wall Paints",
  subcategory: "OPC 43, TMT Bars, CPVC Pipes or Vitrified Floor Tiles",
  product_group: "Cement, Reinforcement Steel, Plumbing Pipes or Floor Tiles",
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
    border: "1px solid rgba(15,23,42,.18)",
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

export default function MaterialsTaxonomyPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [taxons, setTaxons] = useState<Taxon[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");
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
      setMappings(Array.isArray(result.subcategory_product_groups) ? result.subcategory_product_groups : []);
      setSummary(result.summary || null);
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

  const types = useMemo(() => taxons.filter((row) => row.kind === "type"), [taxons]);
  const categories = useMemo(
    () => taxons.filter((row) => row.kind === "category" && row.parent_id === typeId),
    [taxons, typeId]
  );
  const subcategories = useMemo(
    () => taxons.filter((row) => row.kind === "subcategory" && row.parent_id === categoryId),
    [taxons, categoryId]
  );
  const productGroups = useMemo(
    () => taxons.filter((row) => row.kind === "product_group"),
    [taxons]
  );
  const selectedMapping = mappings.find((row) => row.subcategory_id === subcategoryId) || null;

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function beginCreate(kind: Kind) {
    setEditingId(null);
    setSlugTouched(false);
    setAiSuggestions([]);
    setAiMessage("");
    setMessage("");
    setError("");
    setForm({
      ...emptyForm,
      kind,
      parent_id: kind === "category" ? typeId : kind === "subcategory" ? categoryId : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginEdit(row: Taxon) {
    setEditingId(row.id);
    setSlugTouched(true);
    setAiSuggestions([]);
    setAiMessage("");
    setMessage("");
    setError("");
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

  async function save() {
    setError("");
    setMessage("");
    const name = form.name.trim();
    const permanentKey = (form.slug.trim() || slugify(name)).trim();
    if (name.length < 2) return setError("Enter a clear material name.");
    if (permanentKey.length < 2) return setError("Enter a valid permanent key.");
    if ((form.kind === "category" || form.kind === "subcategory") && !form.parent_id) {
      return setError("Select the required active parent.");
    }
    const confirmed = window.confirm(
      [
        editingId ? "Save these Materials Taxonomy changes?" : "Create this Materials Taxonomy entry?",
        `Level: ${labels[form.kind]}`,
        `Name: ${name}`,
        `Permanent key: ${permanentKey}`,
        editingId ? "Permanent key, level and parent remain locked." : "Review all fields before saving.",
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
      setMessage(editingId ? "Materials Taxonomy entry updated." : "Materials Taxonomy entry created after human review.");
      setEditingId(null);
      setForm(emptyForm);
      setSlugTouched(false);
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

  async function saveMapping() {
    if (!subcategoryId || !productGroupId) return setError("Select a Subcategory and reusable Product Group.");
    if (!window.confirm("Create this permanent Subcategory → Product Group relationship?\n\nReview both identities carefully. The relationship cannot later be replaced.")) return;
    setSaving(true);
    setError("");
    try {
      await api("POST", { action: "map_product_group", subcategory_id: subcategoryId, product_group_id: productGroupId });
      setMessage("Materials Product Group relationship saved after human review.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Relationship save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMapping(mapping: Mapping) {
    const next = !mapping.is_active;
    if (!window.confirm(`${next ? "Reactivate" : "Deactivate"} this relationship?\n\nThe historical row will remain preserved.`)) return;
    setSaving(true);
    setError("");
    try {
      await api("PATCH", { action: "mapping_status", subcategory_id: mapping.subcategory_id, is_active: next });
      setMessage(`Relationship ${next ? "reactivated" : "deactivated"}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Relationship lifecycle change failed.");
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
      const parent = taxons.find((row) => row.id === form.parent_id);
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
          ? result.suggestions
              .filter((value: unknown): value is string => typeof value === "string")
              .slice(0, 8)
          : [];
        if (!suggestions.length) throw new Error("AI did not return usable Materials suggestions.");
        setAiSuggestions(suggestions);
        setAiMessage("AI suggestions are advisory. Select one only after checking its Materials hierarchy context.");
      } else {
        const description = typeof result.description === "string" ? result.description.trim() : "";
        if (!description) throw new Error("AI did not return a usable description.");
        updateForm("description", description);
        setAiMessage("AI draft placed in the editable form. Review and correct it before saving.");
      }
    } catch (caught) {
      setAiMessage(caught instanceof Error ? caught.message : "AI assistance is unavailable.");
    } finally {
      setAiBusy(null);
    }
  }

  function renderRows(rows: Taxon[]) {
    if (!rows.length) return <EmptyState message="No entries are available in this selection." />;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <article key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, opacity: row.is_active ? 1 : 0.68 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{row.name}</strong>
                  <Badge>{row.is_active ? "Active" : "Inactive"}</Badge>
                  <Badge>{labels[row.kind]}</Badge>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>{row.slug} · sort {row.sort_order}</div>
                {row.description ? <p style={{ margin: "7px 0 0", color: "#334155", fontSize: 14 }}>{row.description}</p> : null}
                <div style={{ color: "#475569", fontSize: 12, marginTop: 7 }}>
                  Children {row.child_count} · Descendants {row.descendant_count} · Listings {row.listing_count}
                  {row.kind === "product_group" ? ` · Subcategories ${row.product_group_usage_count} · Attributes ${row.attribute_mapping_count} · Values ${row.controlled_value_count}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <button type="button" style={button()} disabled={saving} onClick={() => beginEdit(row)}>Edit</button>
                <button type="button" style={button(false, row.is_active)} disabled={saving} onClick={() => void toggleTaxon(row)}>
                  {row.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  const parentOptions = form.kind === "category" ? types : form.kind === "subcategory" ? taxons.filter((row) => row.kind === "category") : [];

  return (
    <Container>
      <SectionHeader title="Materials → Taxonomy Manager" subtitle="Govern construction-material Types, Categories, Subcategories and reusable Product Groups through protected master-admin controls." />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">Attributes →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/values" variant="secondary">Values →</ActionButton>
        <ActionButton href="/admin/dashboard/master-data/materials/mapping" variant="secondary">Mapping →</ActionButton>
      </div>

      {error ? <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#fff1f2", color: "#be123c" }}>{error}</div> : null}
      {message ? <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>{message}</div> : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 16, background: "#f8fafc" }}>
        <strong>Human First. AI Second. Precision Always.</strong>
        <ul style={{ marginBottom: 0, lineHeight: 1.6 }}>
          <li>Use only genuine building and construction-material classifications.</li>
          <li>Permanent keys, hierarchy levels and parent relationships lock after creation.</li>
          <li>Deactivation preserves history; this page never permanently deletes records.</li>
          <li>AI may suggest names or draft descriptions, but it never saves anything automatically.</li>
          <li>Do not enter prices, stock, availability, addresses, ownership, certifications or test claims as taxonomy.</li>
        </ul>
      </section>

      {summary ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Total", summary.total_taxons], ["Active", summary.active_taxons], ["Inactive", summary.inactive_taxons],
            ["Types", summary.type_count], ["Categories", summary.category_count], ["Subcategories", summary.subcategory_count],
            ["Product Groups", summary.product_group_count], ["Listings", summary.listing_count], ["Unmapped", summary.unmapped_subcategory_count],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div><h2 style={{ margin: 0 }}>{editingId ? "Edit Materials Taxonomy entry" : "Create Materials Taxonomy entry"}</h2><p style={{ color: "#64748b" }}>Example: {examples[form.kind]}.</p></div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {VALID_KINDS.map((kind) => <button key={kind} type="button" style={button(form.kind === kind)} disabled={Boolean(editingId)} onClick={() => beginCreate(kind)}>{labels[kind]}</button>)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {(form.kind === "category" || form.kind === "subcategory") ? (
            <label><span>Permanent parent</span><select style={control(Boolean(editingId))} value={form.parent_id} disabled={Boolean(editingId)} onChange={(event) => updateForm("parent_id", event.target.value)}><option value="">Select parent</option>{parentOptions.filter((row) => row.is_active || row.id === form.parent_id).map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}</select></label>
          ) : <div><span>Parent</span><div style={control(true)}>Global — no parent</div></div>}
          <label><span>Name</span><input style={control()} value={form.name} onChange={(event) => { const name = event.target.value; updateForm("name", name); if (!editingId && !slugTouched) updateForm("slug", slugify(name)); }} /></label>
          <label><span>Permanent key</span><input style={control(Boolean(editingId))} disabled={Boolean(editingId)} value={form.slug} onChange={(event) => { setSlugTouched(true); updateForm("slug", slugify(event.target.value)); }} /></label>
          <label><span>Sort order</span><input type="number" min={0} max={1000000} style={control()} value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} /></label>
        </div>
        <label style={{ display: "block", marginTop: 12 }}><span>Administrator-reviewed description</span><textarea style={{ ...control(), minHeight: 100, resize: "vertical" }} maxLength={600} value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || saving} onClick={() => void requestAi("name_suggestions")}>{aiBusy === "names" ? "Generating…" : "AI name suggestions"}</button>
          <button type="button" style={button()} disabled={Boolean(aiBusy) || saving} onClick={() => void requestAi("description")}>{aiBusy === "description" ? "Drafting…" : "AI draft description"}</button>
          <button type="button" style={button(true)} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : editingId ? "Review and save changes" : "Review and create"}</button>
          {editingId ? <button type="button" style={button()} onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button> : null}
        </div>
        {aiMessage ? <p style={{ color: "#475569" }}>{aiMessage}</p> : null}
        {aiSuggestions.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{aiSuggestions.map((suggestion) => <button type="button" key={suggestion} style={button()} onClick={() => { updateForm("name", suggestion); if (!editingId) updateForm("slug", slugify(suggestion)); setAiMessage("Suggestion copied into the editable form. Review it before saving."); }}>{suggestion}</button>)}</div> : null}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Inspect hierarchy and Product Group relationship</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 }}>
          <select style={control()} value={typeId} onChange={(event) => { setTypeId(event.target.value); setCategoryId(""); setSubcategoryId(""); setProductGroupId(""); }}><option value="">Select Material Type</option>{types.map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}</select>
          <select style={control(!typeId)} disabled={!typeId} value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSubcategoryId(""); setProductGroupId(""); }}><option value="">Select Category</option>{categories.map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}</select>
          <select style={control(!categoryId)} disabled={!categoryId} value={subcategoryId} onChange={(event) => { setSubcategoryId(event.target.value); const found = mappings.find((row) => row.subcategory_id === event.target.value); setProductGroupId(found?.product_group_id || ""); }}><option value="">Select Subcategory</option>{subcategories.map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}</select>
          <select style={control(!subcategoryId || Boolean(selectedMapping))} disabled={!subcategoryId || Boolean(selectedMapping)} value={productGroupId} onChange={(event) => setProductGroupId(event.target.value)}><option value="">Select reusable Product Group</option>{productGroups.filter((row) => row.is_active || row.id === productGroupId).map((row) => <option key={row.id} value={row.id}>{row.name}{row.is_active ? "" : " (Inactive)"}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {!selectedMapping ? <button type="button" style={button(true)} disabled={!subcategoryId || !productGroupId || saving} onClick={() => void saveMapping()}>Review and save permanent relationship</button> : <><Badge>{selectedMapping.is_active ? "Active relationship" : "Inactive relationship"}</Badge><button type="button" style={button(false, selectedMapping.is_active)} disabled={saving} onClick={() => void toggleMapping(selectedMapping)}>{selectedMapping.is_active ? "Deactivate relationship" : "Reactivate relationship"}</button></>}
        </div>
      </section>

      {loading ? <EmptyState message="Loading Materials Taxonomy…" /> : (
        <div style={{ display: "grid", gap: 16 }}>
          <section><div style={{ display: "flex", justifyContent: "space-between" }}><h2>Material Types</h2><button style={button()} onClick={() => beginCreate("type")}>Add Type</button></div>{renderRows(types)}</section>
          <section><div style={{ display: "flex", justifyContent: "space-between" }}><h2>Categories {typeId ? "under selected Type" : "— select a Type above"}</h2><button style={button()} disabled={!typeId} onClick={() => beginCreate("category")}>Add Category</button></div>{typeId ? renderRows(categories) : null}</section>
          <section><div style={{ display: "flex", justifyContent: "space-between" }}><h2>Subcategories {categoryId ? "under selected Category" : "— select a Category above"}</h2><button style={button()} disabled={!categoryId} onClick={() => beginCreate("subcategory")}>Add Subcategory</button></div>{categoryId ? renderRows(subcategories) : null}</section>
          <section><div style={{ display: "flex", justifyContent: "space-between" }}><h2>Global reusable Product Groups</h2><button style={button()} onClick={() => beginCreate("product_group")}>Add Product Group</button></div>{renderRows(productGroups)}</section>
        </div>
      )}
    </Container>
  );
}

const VALID_KINDS: Kind[] = ["type", "category", "subcategory", "product_group"];
