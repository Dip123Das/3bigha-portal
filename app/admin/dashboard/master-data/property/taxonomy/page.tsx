"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type TypeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  listing_count: number;
  subtype_count: number;
};

type SubtypeRow = {
  id: string;
  type_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  listing_count: number;
  mapping_count: number;
};

type Kind = "type" | "subtype";
type Mode = "browse" | "add" | "edit";

type FormState = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const panel: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
};

const field: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  border: "1px solid rgba(15,23,42,0.16)",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fff",
};

export default function PropertyTaxonomyMasterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [mode, setMode] = useState<Mode>("browse");
  const [kind, setKind] = useState<Kind>("type");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permanentSlug, setPermanentSlug] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState<"names" | "description" | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const selectedType =
    types.find((row) => row.id === selectedTypeId) || null;

  const selectedSubtypes = subtypes.filter(
    (row) => row.type_id === selectedTypeId
  );

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function requestApi(
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>
  ) {
    const token = await accessToken();

    if (!token) {
      router.replace("/admin/dashboard");
      throw new Error("Please sign in again.");
    }

    const response = await fetch("/api/admin/property-taxonomy", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        router.replace("/admin/dashboard");
      }
      throw new Error(result.error || "Property taxonomy request failed.");
    }

    return result;
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await requestApi("GET");
      const nextTypes = (result.types || []) as TypeRow[];
      const nextSubtypes = (result.subtypes || []) as SubtypeRow[];

      setTypes(nextTypes);
      setSubtypes(nextSubtypes);
      setSelectedTypeId((current) => {
        if (nextTypes.some((row) => row.id === current)) return current;
        return nextTypes.find((row) => row.is_active)?.id || nextTypes[0]?.id || "";
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load taxonomy.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 0);
  }

  function openAdd(nextKind: Kind) {
    setError("");
    setMessage("");
    setAiMessage("");
    setAiSuggestions([]);
    setAiBusy(null);
    setMode("add");
    setKind(nextKind);
    setEditingId(null);
    setPermanentSlug("");
    setForm(emptyForm);
    showEditor();
  }

  function openEdit(nextKind: Kind, row: TypeRow | SubtypeRow) {
    setError("");
    setMessage("");
    setAiMessage("");
    setAiSuggestions([]);
    setAiBusy(null);
    setMode("edit");
    setKind(nextKind);
    setEditingId(row.id);
    setPermanentSlug(row.slug);
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description || "",
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });

    if (nextKind === "subtype") {
      setSelectedTypeId((row as SubtypeRow).type_id);
    }

    showEditor();
  }

  function cancelEditor() {
    setMode("browse");
    setEditingId(null);
    setPermanentSlug("");
    setForm(emptyForm);
    setError("");
    setMessage("");
    setAiMessage("");
    setAiSuggestions([]);
    setAiBusy(null);
  }

  async function requestAi(task: "name_suggestions" | "description") {
    if (aiBusy) return;

    if (task === "description" && form.name.trim().length < 3) {
      setAiMessage("Enter or select a clear display name first.");
      return;
    }

    if (kind === "subtype" && !selectedTypeId) {
      setAiMessage("Select the parent property type first.");
      return;
    }

    setAiBusy(task === "name_suggestions" ? "names" : "description");
    setAiMessage("");
    if (task === "name_suggestions") setAiSuggestions([]);

    try {
      const token = await accessToken();
      if (!token) {
        router.replace("/admin/dashboard");
        throw new Error("Please sign in again.");
      }

      const existingNames =
        kind === "type"
          ? types.map((row) => row.name)
          : selectedSubtypes.map((row) => row.name);

      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task,
          kind: kind === "type" ? "property_type" : "property_subtype",
          context: {
            name: form.name.trim(),
            family: kind === "subtype" ? selectedType?.name || "" : "",
            key: mode === "edit" ? permanentSlug : form.slug,
          },
          existing: form.description,
          existingNames,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "AI assistance is unavailable.");
      }

      if (result.needs_clarification) {
        setAiMessage(
          result.question || "Please make the classification more specific."
        );
        return;
      }

      if (task === "name_suggestions") {
        const suggestions = Array.isArray(result.suggestions)
          ? result.suggestions
              .filter((value: unknown): value is string =>
                typeof value === "string"
              )
              .map((value: string) => value.trim())
              .filter(Boolean)
              .slice(0, 5)
          : [];

        if (!suggestions.length) {
          throw new Error("AI did not return usable name suggestions.");
        }

        setAiSuggestions(suggestions);
        setAiMessage(
          "AI suggestions are advisory. Select one or enter your own name."
        );
      } else if (typeof result.description === "string") {
        setForm((current) => ({
          ...current,
          description: result.description.slice(0, 600),
        }));
        setAiMessage(
          "AI draft inserted. Review and edit it before saving."
        );
      } else {
        throw new Error("AI did not return a usable description.");
      }
    } catch (caught) {
      setAiMessage(
        caught instanceof Error
          ? caught.message
          : "AI assistance is unavailable."
      );
    } finally {
      setAiBusy(null);
    }
  }

  function applyAiSuggestion(name: string) {
    setForm((current) => ({
      ...current,
      name,
      ...(mode === "add" ? { slug: slugify(name) } : {}),
    }));
    setAiSuggestions([]);
    setAiMessage(
      "Suggestion selected. Review the name and permanent key before saving."
    );
  }

  async function save() {
    if (saving) return;

    const name = form.name.trim();
    if (name.length < 2) {
      setError("Enter a clear name containing at least two characters.");
      return;
    }

    if (kind === "subtype" && !selectedTypeId) {
      setError("Select the parent property type.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const common = {
        kind,
        name,
        description: form.description.trim(),
        sort_order: form.sort_order,
        is_active: form.is_active,
      };

      if (mode === "add") {
        await requestApi("POST", {
          ...common,
          slug: form.slug.trim() || slugify(name),
          ...(kind === "subtype" ? { type_id: selectedTypeId } : {}),
        });
        setMessage(`${kind === "type" ? "Property type" : "Subtype"} created.`);
      } else {
        await requestApi("PATCH", {
          ...common,
          id: editingId,
        });
        setMessage(`${kind === "type" ? "Property type" : "Subtype"} updated.`);
      }

      await load();
      setMode("browse");
      setEditingId(null);
      setPermanentSlug("");
      setForm(emptyForm);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(kindToChange: Kind, row: TypeRow | SubtypeRow) {
    const action = row.is_active ? "deactivate" : "activate";
    const impact =
      kindToChange === "type"
        ? `${(row as TypeRow).listing_count} listing(s) and ${(row as TypeRow).subtype_count} subtype(s)`
        : `${(row as SubtypeRow).listing_count} listing(s) and ${(row as SubtypeRow).mapping_count} attribute mapping(s)`;

    if (
      !window.confirm(
        `${action === "deactivate" ? "Deactivate" : "Activate"} "${row.name}"?\n\nCurrent impact: ${impact}.\n\nExisting records will be preserved.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await requestApi("PATCH", {
        kind: kindToChange,
        id: row.id,
        name: row.name,
        description: row.description || "",
        sort_order: row.sort_order,
        is_active: !row.is_active,
      });

      setMessage(`"${row.name}" is now ${row.is_active ? "inactive" : "active"}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status change failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container>
      <SectionHeader
        title="Property · Taxonomy"
        subtitle="Control the property types and subtypes used by listings, filters and attribute mappings."
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <ActionButton href="/admin/dashboard/master-data" variant="secondary">
          ← Back
        </ActionButton>
        <ActionButton href="/admin/dashboard/master-data/property/attributes" variant="secondary">
          Attributes →
        </ActionButton>
        <ActionButton href="/admin/dashboard/master-data/property/mapping" variant="secondary">
          Mapping →
        </ActionButton>
        <ActionButton href="/admin/dashboard/master-data/property/values" variant="secondary">
          Values →
        </ActionButton>
      </div>

      <div
        style={{
          ...panel,
          marginBottom: 14,
          background: "linear-gradient(135deg, #eff6ff, #ffffff)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          How Property Taxonomy works
        </div>
        <div style={{ lineHeight: 1.65, color: "#334155" }}>
          <b>Type</b> is the broad classification, such as “Land / Plot” or
          “House(s)”. <b>Subtype</b> is the specific property, such as
          “Residential”, “Flat / Apartment” or “Office Space”. Subtypes connect
          to Attributes, Mapping and Values, which control the questions shown
          while listing a property.
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.65 }}>
          <li>Permanent keys are created once and locked during editing.</li>
          <li>Deactivate an entry to stop future use without deleting history.</li>
          <li>Review listing and mapping counts before changing a name or status.</li>
          <li>Use clear singular classifications and avoid duplicate meanings.</li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <ActionButton
          variant={mode === "browse" ? "primary" : "secondary"}
          onClick={cancelEditor}
        >
          Browse Taxonomy
        </ActionButton>
        <ActionButton variant="primary" onClick={() => openAdd("type")}>
          + Add Type
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={() => openAdd("subtype")}
          disabled={!selectedTypeId}
        >
          + Add Subtype
        </ActionButton>
      </div>

      {error ? (
        <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {message ? (
        <div style={{ color: "#166534", fontWeight: 800, marginBottom: 12 }}>
          {message}
        </div>
      ) : null}

      {loading ? (
        <EmptyState message="Loading property taxonomy…" />
      ) : mode === "browse" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <section style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Property Types</div>
                <div style={{ color: "#64748b", marginTop: 3 }}>
                  Select a type to inspect its subtypes.
                </div>
              </div>
              <Badge>{types.length}</Badge>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {types.map((row) => {
                const selected = row.id === selectedTypeId;

                return (
                  <article
                    key={row.id}
                    onClick={() => setSelectedTypeId(row.id)}
                    style={{
                      border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "pointer",
                      background: selected ? "#eff6ff" : "#fff",
                      opacity: row.is_active ? 1 : 0.72,
                    }}
                  >
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <Badge>{row.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge>Key: {row.slug}</Badge>
                      <Badge>Order: {row.sort_order}</Badge>
                      <Badge>{row.listing_count} listings</Badge>
                      <Badge>{row.subtype_count} subtypes</Badge>
                    </div>

                    <div style={{ fontWeight: 900, fontSize: 17, marginTop: 9 }}>
                      {row.name}
                    </div>

                    <div style={{ color: "#475569", marginTop: 5, lineHeight: 1.5 }}>
                      {row.description || "No administrator description yet."}
                    </div>

                    <div
                      style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ActionButton variant="secondary" onClick={() => openEdit("type", row)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        variant={row.is_active ? "danger" : "secondary"}
                        onClick={() => void toggleStatus("type", row)}
                        disabled={saving}
                      >
                        {row.is_active ? "Deactivate" : "Activate"}
                      </ActionButton>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Subtypes</div>
                <div style={{ color: "#64748b", marginTop: 3 }}>
                  {selectedType
                    ? `Specific classifications under ${selectedType.name}.`
                    : "Select a property type."}
                </div>
              </div>
              <Badge>{selectedSubtypes.length}</Badge>
            </div>

            {!selectedType ? (
              <EmptyState message="Select a property type to inspect its subtypes." />
            ) : selectedSubtypes.length === 0 ? (
              <div style={{ marginTop: 14 }}>
                <EmptyState message="This type has no subtypes. Keep it inactive until valid subtypes are added." />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {selectedSubtypes.map((row) => (
                  <article
                    key={row.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 12,
                      opacity: row.is_active ? 1 : 0.72,
                    }}
                  >
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <Badge>{row.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge>Key: {row.slug}</Badge>
                      <Badge>Order: {row.sort_order}</Badge>
                      <Badge>{row.listing_count} listings</Badge>
                      <Badge>{row.mapping_count} mappings</Badge>
                    </div>

                    <div style={{ fontWeight: 900, fontSize: 16, marginTop: 9 }}>
                      {row.name}
                    </div>

                    <div style={{ color: "#475569", marginTop: 5, lineHeight: 1.5 }}>
                      {row.description || "No administrator description yet."}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <ActionButton variant="secondary" onClick={() => openEdit("subtype", row)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        variant={row.is_active ? "danger" : "secondary"}
                        onClick={() => void toggleStatus("subtype", row)}
                        disabled={saving}
                      >
                        {row.is_active ? "Deactivate" : "Activate"}
                      </ActionButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section ref={editorRef} style={{ ...panel, border: "2px solid #2563eb" }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {mode === "add" ? "Add" : "Edit"}{" "}
            {kind === "type" ? "Property Type" : "Property Subtype"}
          </div>

          <div style={{ color: "#475569", marginTop: 5, lineHeight: 1.5 }}>
            AI may suggest names and draft descriptions, but it never saves or
            changes taxonomy records. Review every field before saving.
          </div>

          {kind === "subtype" ? (
            <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
              <b>Parent property type</b>
              <select
                value={selectedTypeId}
                onChange={(event) => setSelectedTypeId(event.target.value)}
                disabled={mode === "edit"}
                style={field}
              >
                <option value="">— Select type —</option>
                {types.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.is_active ? "" : "(Inactive)"}
                  </option>
                ))}
              </select>
              <small>
                The parent is locked during editing to prevent accidental remapping.
              </small>
            </label>
          ) : null}

          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <b>Display name</b>
            <input
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                  ...(mode === "add"
                    ? { slug: slugify(event.target.value) }
                    : {}),
                }));
                setAiSuggestions([]);
                setAiMessage("");
              }}
              placeholder={kind === "type" ? "Example: Land / Plot" : "Example: Flat / Apartment"}
              style={field}
              maxLength={120}
            />
          </label>

          {mode === "add" ? (
            <div style={{ marginTop: 10 }}>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => void requestAi("name_suggestions")}
                disabled={Boolean(aiBusy)}
              >
                {aiBusy === "names"
                  ? "AI is suggesting…"
                  : `Suggest ${kind === "type" ? "Type" : "Subtype"} Names with AI`}
              </ActionButton>

              {aiSuggestions.length ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {aiSuggestions.map((suggestion) => (
                    <ActionButton
                      key={suggestion}
                      variant="secondary"
                      size="sm"
                      onClick={() => applyAiSuggestion(suggestion)}
                      disabled={Boolean(aiBusy)}
                    >
                      Use “{suggestion}”
                    </ActionButton>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <b>Permanent key</b>
            <input
              value={mode === "edit" ? permanentSlug : form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
              disabled={mode === "edit"}
              placeholder="Generated from the display name"
              style={{ ...field, background: mode === "edit" ? "#f1f5f9" : "#fff" }}
              maxLength={120}
            />
            <small>
              {mode === "edit"
                ? "Locked permanently because listings and integrations may depend on it."
                : "Use lowercase letters, numbers and hyphens. It becomes locked after creation."}
            </small>
          </label>

          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <b>Administrator description</b>
            <textarea
              value={form.description}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }));
                setAiMessage("");
              }}
              placeholder="Explain what belongs in this classification and how it differs from nearby choices."
              style={{ ...field, minHeight: 110, resize: "vertical" }}
              maxLength={600}
            />
            <small>{form.description.length}/600 characters. Human review is required.</small>
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => void requestAi("description")}
              disabled={Boolean(aiBusy) || form.name.trim().length < 3}
            >
              {aiBusy === "description"
                ? "AI is drafting…"
                : form.description.trim()
                  ? "Improve Description with AI"
                  : "Draft Description with AI"}
            </ActionButton>

            {aiMessage ? (
              <small
                style={{
                  color: aiMessage.toLowerCase().includes("unavailable")
                    ? "#b91c1c"
                    : "#475569",
                  fontWeight: 700,
                }}
              >
                {aiMessage}
              </small>
            ) : null}
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
            <b>Sort order</b>
            <input
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: event.target.value }))
              }
              inputMode="numeric"
              placeholder="Example: 100"
              style={field}
            />
            <small>Lower numbers appear first. Leave space between groups for future additions.</small>
          </label>

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 16,
              padding: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 10,
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            <span>
              <b>Active</b>
              <br />
              <small>
                Active entries may be offered in listing workflows. Inactive entries
                remain available for historical records and administration.
              </small>
            </span>
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <ActionButton variant="secondary" onClick={cancelEditor} disabled={saving}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Review and Save"}
            </ActionButton>
          </div>
        </section>
      )}
    </Container>
  );
}
