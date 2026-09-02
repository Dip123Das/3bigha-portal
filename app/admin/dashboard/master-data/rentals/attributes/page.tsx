"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type InputType =
  | "text"
  | "number"
  | "boolean"
  | "single_select"
  | "multi_select";

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: InputType;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  value_count: number;
  mapping_count: number;
  listing_answer_count: number;
};

type AiAttributeSuggestion = {
  name: string;
  input_type: InputType;
  unit: string | null;
  reason: string;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  input_type: InputType;
  unit: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  input_type: "text",
  unit: "",
  sort_order: "1000",
  is_active: true,
};

const inputTypeLabels: Record<InputType, string> = {
  text: "Text — free typing",
  number: "Number — numeric answer",
  boolean: "Yes / No",
  single_select: "Single select — choose one value",
  multi_select: "Multi select — choose multiple values",
};

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function controlStyle(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.14)",
    padding: "10px 12px",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#6b7280" : "inherit",
  };
}

function FieldLabel(props: {
  title: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontWeight: 900 }}>
        {props.title}
        {props.required ? " *" : ""}
      </span>

      {props.hint ? (
        <span style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
          {props.hint}
        </span>
      ) : null}
    </label>
  );
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    throw new Error(
      body?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return body;
}

export default function RentalAttributesMasterPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<
    "suggestions" | "description" | null
  >(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<
    AiAttributeSuggestion[]
  >([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const editingAttribute = useMemo(
    () =>
      attributes.find((attribute) => attribute.id === editingId) ??
      null,
    [attributes, editingId]
  );

  const connectedCount = editingAttribute
    ? editingAttribute.value_count +
      editingAttribute.mapping_count +
      editingAttribute.listing_answer_count
    : 0;

  const inputTypeLocked = mode === "edit";

  const unitLocked = false;

  async function loadAttributes() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/rental-attributes", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        window.location.assign("/admin/dashboard");
        return;
      }

      const body = await readJson(response);
      setAttributes(body.attributes ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load rental attributes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttributes();
  }, []);

  useEffect(() => {
    if (!editorOpen) return;

    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [editorOpen, editingId, mode]);

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAdd() {
    setError(null);
    setMessage(null);
    setMode("add");
    setEditingId(null);
    setForm({ ...emptyForm });
    setAiMessage(null);
    setAiSuggestions([]);
    setEditorOpen(true);
  }

  function openEdit(attribute: AttributeRow) {
    setError(null);
    setMessage(null);
    setMode("edit");
    setEditingId(attribute.id);
    setAiMessage(null);
    setAiSuggestions([]);
    setForm({
      name: attribute.name,
      slug: attribute.slug,
      description: attribute.description ?? "",
      input_type: attribute.input_type,
      unit: attribute.unit ?? "",
      sort_order: String(attribute.sort_order ?? 1000),
      is_active: attribute.is_active,
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setMode("add");
    setForm({ ...emptyForm });
  }

  async function requestAi(
    task: "attribute_suggestions" | "description"
  ) {
    setError(null);
    setAiMessage(null);

    const name = form.name.trim();
    if (name.length < 2) {
      setError(
        "Enter a short attribute idea or display name before using AI."
      );
      return;
    }

    setAiBusy(
      task === "attribute_suggestions"
        ? "suggestions"
        : "description"
    );

    try {
      const response = await fetch(
        "/api/admin/master-description",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "rental_attribute",
            task,
            context: {
              name,
              key: form.slug,
              inputType: form.input_type,
              unit: form.unit,
            },
            existingNames: attributes.map(
              (attribute) => attribute.name
            ),
            existing: form.description,
          }),
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(
          body?.error || "AI assistance could not complete the request."
        );
      }

      if (body?.needs_clarification) {
        setAiMessage(
          body.question ||
            "Please make the attribute idea more specific."
        );
        return;
      }

      if (task === "attribute_suggestions") {
        const suggestions = Array.isArray(body?.suggestions)
          ? body.suggestions
          : [];

        setAiSuggestions(suggestions);
        setAiMessage(
          "AI suggestions are advisory. Select one only after reviewing its name, answer type and unit."
        );
        return;
      }

      if (typeof body?.description !== "string") {
        throw new Error("AI returned an invalid description.");
      }

      updateForm(
        "description",
        body.description.trim().slice(0, 600)
      );
      setAiMessage(
        "AI draft inserted. Review and edit it before saving."
      );
    } catch (aiError) {
      setError(
        aiError instanceof Error
          ? aiError.message
          : "AI assistance could not complete the request."
      );
    } finally {
      setAiBusy(null);
    }
  }

  function applyAiSuggestion(
    suggestion: AiAttributeSuggestion
  ) {
    setForm((current) => ({
      ...current,
      name: suggestion.name,
      slug:
        mode === "add"
          ? slugify(suggestion.name)
          : current.slug,
      input_type: suggestion.input_type,
      unit:
        suggestion.input_type === "number"
          ? suggestion.unit ?? ""
          : "",
    }));

    setAiMessage(
      "AI suggestion applied to the editable form. Review every field before saving."
    );
  }

  function validateForm() {
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    const sortOrder = Number(form.sort_order);

    if (name.length < 2 || name.length > 120) {
      return "Display name must contain 2 to 120 characters.";
    }

    if (slug.length < 2 || slug.length > 120) {
      return "A valid permanent key is required.";
    }

    if (form.description.trim().length > 600) {
      return "Administrator description must not exceed 600 characters.";
    }

    if (form.unit.trim().length > 30) {
      return "Unit must not exceed 30 characters.";
    }

    if (form.input_type !== "number" && form.unit.trim()) {
      return "Only number attributes may have a unit.";
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 1000000
    ) {
      return "Sort order must be a whole number from 0 to 1000000.";
    }

    return null;
  }

  async function saveAttribute() {
    setError(null);
    setMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (mode === "edit" && !editingId) {
      setError("The attribute selected for editing is missing.");
      return;
    }

    const name = form.name.trim();
    const permanentKey =
      mode === "edit"
        ? form.slug
        : slugify(form.slug || name);

    const confirmed = window.confirm(
      [
        mode === "add"
          ? "Create this rental attribute?"
          : "Save these rental attribute changes?",
        "",
        `Name: ${name}`,
        `Permanent key: ${permanentKey}`,
        `Input type: ${inputTypeLabels[form.input_type]}`,
        `Status: ${form.is_active ? "Active" : "Inactive"}`,
        "",
        "Review all fields before continuing.",
      ].join("\n")
    );

    if (!confirmed) return;

    const payload: Record<string, unknown> = {
      name,
      description: form.description.trim() || null,
      input_type: form.input_type,
      unit:
        form.input_type === "number"
          ? form.unit.trim() || null
          : null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };

    if (mode === "add") {
      payload.slug = permanentKey;
    } else {
      payload.id = editingId;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/rental-attributes",
        {
          method: mode === "add" ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const body = await readJson(response);

      setMessage(
        body.action === "created"
          ? `Attribute “${body.data.name}” was created.`
          : `Attribute “${body.data.name}” was updated.`
      );

      setEditorOpen(false);
      setEditingId(null);
      setMode("add");
      setForm({ ...emptyForm });
      await loadAttributes();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The attribute could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(attribute: AttributeRow) {
    setError(null);
    setMessage(null);

    const nextStatus = !attribute.is_active;
    const action = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `${action === "activate" ? "Activate" : "Deactivate"} ` +
        `attribute “${attribute.name}”?\n\n` +
        (nextStatus
          ? "It may again become available to future rental listing workflows."
          : "Existing values and mappings will be preserved. No rental listing-answer consumer currently exists.")
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/rental-attributes",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: attribute.id,
            name: attribute.name,
            description: attribute.description,
            input_type: attribute.input_type,
            unit: attribute.unit,
            sort_order: attribute.sort_order,
            is_active: nextStatus,
          }),
        }
      );

      await readJson(response);
      setMessage(
        `Attribute “${attribute.name}” was ${action}d.`
      );
      await loadAttributes();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "The status could not be changed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container>
      <SectionHeader
        title="Rental · Attributes"
        subtitle="Control reusable rental questions, answer formats and units used by subtype mappings and listing forms."
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          position: "relative",
          zIndex: 20,
        }}
      >
        <ActionButton
          href="/admin/dashboard/master-data"
          variant="secondary"
        >
          ← Back
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rental/taxonomy"
          variant="secondary"
        >
          Taxonomy →
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rental/values"
          variant="secondary"
        >
          Values →
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rental/mapping"
          variant="secondary"
        >
          Mapping →
        </ActionButton>
      </div>

      <div
        style={{
          border: "1px solid #dbeafe",
          background: "#f8fbff",
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          How Rental Attributes work
        </div>

        <p style={{ margin: "8px 0" }}>
          An <b>attribute</b> is a reusable question, such as
          “Bedrooms”, “Built-up Area” or “Furnishing Status”.
          Attributes are mapped to the relevant rental subtypes.
          Select attributes receive their allowed choices from the
          Values page.
        </p>

        <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
          <li>
            Do not recreate core listing fields such as price,
            ownership, possession, facing or electricity.
          </li>
          <li>
            Permanent keys are created once and locked during editing.
          </li>
          <li>
            Input type becomes locked after values, mappings or listing
            answers exist.
          </li>
          <li>
            Deactivate unused attributes instead of deleting history.
          </li>
          <li>
            Use a unit only for numeric attributes—for example
            <b> sq ft</b>, <b>ft</b>, <b>years</b> or <b>INR</b>.
          </li>
        </ul>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <ActionButton
          variant="secondary"
          onClick={() => {
            setEditorOpen(false);
            setEditingId(null);
          }}
        >
          Browse Attributes
        </ActionButton>

        <ActionButton variant="primary" onClick={openAdd}>
          + Add Attribute
        </ActionButton>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            marginBottom: 12,
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 10,
            padding: 12,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 10,
            padding: 12,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      {editorOpen ? (
        <div
          ref={editorRef}
          style={{
            border: "2px solid #2563eb",
            borderRadius: 16,
            background: "#fff",
            padding: 16,
            marginBottom: 18,
            scrollMarginTop: 20,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {mode === "add"
              ? "Add Rental Attribute"
              : `Edit Rental Attribute · ${form.name}`}
          </div>

          <p style={{ margin: "6px 0 16px", opacity: 0.76 }}>
            Review every field before saving. This editor never deletes
            connected rental history.
          </p>

          <div style={{ display: "grid", gap: 15 }}>
            <div>
              <FieldLabel
                title="Display name"
                required
                hint='Use a clear question label. Example: “Carpet Area”, “Bedrooms” or “Parking Type”.'
              />
              <input
                value={form.name}
                maxLength={120}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name: value,
                    slug:
                      mode === "add"
                        ? slugify(value)
                        : current.slug,
                  }));
                }}
                style={controlStyle()}
                placeholder="Example: Built-up Area"
              />

              <div
                style={{
                  display: "flex",
                  gap: 9,
                  flexWrap: "wrap",
                  marginTop: 9,
                }}
              >
                <ActionButton
                  variant="secondary"
                  onClick={() =>
                    void requestAi("attribute_suggestions")
                  }
                  disabled={Boolean(aiBusy) || saving}
                >
                  {aiBusy === "suggestions"
                    ? "Generating suggestions…"
                    : "Suggest Attribute Setup with AI"}
                </ActionButton>
              </div>

              {aiSuggestions.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {aiSuggestions.map((suggestion) => (
                    <button
                      key={
                        suggestion.name +
                        suggestion.input_type
                      }
                      type="button"
                      onClick={() =>
                        applyAiSuggestion(suggestion)
                      }
                      style={{
                        textAlign: "left",
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        borderRadius: 10,
                        padding: 10,
                        cursor: "pointer",
                      }}
                    >
                      <b>{suggestion.name}</b>
                      {" · "}
                      {inputTypeLabels[suggestion.input_type]}
                      {suggestion.unit
                        ? ` · Unit: ${suggestion.unit}`
                        : ""}
                      <br />
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.76,
                        }}
                      >
                        {suggestion.reason}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <FieldLabel
                title="Permanent key"
                required
                hint={
                  mode === "edit"
                    ? "Locked because listing forms and saved answers may depend on it."
                    : "Generated from the display name. Use lowercase letters, numbers and hyphens."
                }
              />
              <input
                value={form.slug}
                disabled={mode === "edit"}
                maxLength={120}
                onChange={(event) =>
                  updateForm("slug", slugify(event.target.value))
                }
                style={controlStyle(mode === "edit")}
                placeholder="Example: built-up-area"
              />
            </div>

            <div>
              <FieldLabel
                title="Administrator description"
                hint="Explain what the attribute records and how administrators should use it. Maximum 600 characters."
              />
              <textarea
                value={form.description}
                maxLength={600}
                rows={4}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                style={{
                  ...controlStyle(),
                  resize: "vertical",
                }}
                placeholder="Example: Records the total constructed floor area, including walls and covered spaces."
              />
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.72,
                  marginTop: 5,
                }}
              >
                {form.description.length}/600 characters. Human review
                is required.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 9,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: 9,
                }}
              >
                <ActionButton
                  variant="secondary"
                  onClick={() =>
                    void requestAi("description")
                  }
                  disabled={Boolean(aiBusy) || saving}
                >
                  {aiBusy === "description"
                    ? "Drafting description…"
                    : form.description.trim()
                      ? "Improve Description with AI"
                      : "Draft Description with AI"}
                </ActionButton>

                {aiMessage ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#1d4ed8",
                    }}
                  >
                    {aiMessage}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <FieldLabel
                  title="Input type"
                  required
                  hint={
                    inputTypeLocked
                      ? "Locked because this attribute is already connected."
                      : "Choose how a rental lister will answer."
                  }
                />
                <select
                  value={form.input_type}
                  disabled={inputTypeLocked}
                  onChange={(event) => {
                    const nextType =
                      event.target.value as InputType;
                    setForm((current) => ({
                      ...current,
                      input_type: nextType,
                      unit:
                        nextType === "number"
                          ? current.unit
                          : "",
                    }));
                  }}
                  style={controlStyle(inputTypeLocked)}
                >
                  {Object.entries(inputTypeLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <FieldLabel
                  title="Unit"
                  hint={
                    unitLocked
                      ? "Locked because existing listing answers depend on it."
                      : form.input_type === "number"
                        ? "Optional. Examples: sq ft, ft, years or INR."
                        : "Units apply only to number attributes."
                  }
                />
                <input
                  value={form.unit}
                  disabled={
                    form.input_type !== "number" || unitLocked
                  }
                  maxLength={30}
                  onChange={(event) =>
                    updateForm("unit", event.target.value)
                  }
                  style={controlStyle(
                    form.input_type !== "number" || unitLocked
                  )}
                  placeholder="Example: sq ft"
                />
              </div>

              <div>
                <FieldLabel
                  title="Sort order"
                  required
                  hint="Lower numbers appear first. Leave gaps for future additions."
                />
                <input
                  value={form.sort_order}
                  type="number"
                  min={0}
                  max={1000000}
                  step={1}
                  onChange={(event) =>
                    updateForm("sort_order", event.target.value)
                  }
                  style={controlStyle()}
                />
              </div>
            </div>

            {mode === "edit" && editingAttribute ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Badge>
                  {editingAttribute.value_count} values
                </Badge>
                <Badge>
                  {editingAttribute.mapping_count} mappings
                </Badge>
                <Badge>
                  {editingAttribute.listing_answer_count} listing
                  answers
                </Badge>
              </div>
            ) : null}

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm("is_active", event.target.checked)
                }
                style={{ marginTop: 3 }}
              />
              <span>
                <b>Active</b>
                <br />
                <span style={{ fontSize: 13, opacity: 0.75 }}>
                  Active attributes may be mapped into future listing
                  workflows. Inactive attributes remain available for
                  historical records and administration.
                </span>
              </span>
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <ActionButton
                variant="secondary"
                onClick={closeEditor}
                disabled={saving}
              >
                Cancel
              </ActionButton>

              <ActionButton
                variant="primary"
                onClick={saveAttribute}
                disabled={saving}
              >
                {saving ? "Saving…" : "Review and Save"}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <EmptyState message="Loading rental attributes…" />
      ) : attributes.length === 0 ? (
        <EmptyState message="No rental attributes are available." />
      ) : (
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.09)",
            borderRadius: 14,
            background: "#fff",
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                Rental Attributes
              </div>
              <div style={{ opacity: 0.7, marginTop: 3 }}>
                Review usage before changing a name, type, unit or
                lifecycle status.
              </div>
            </div>
            <Badge>{attributes.length}</Badge>
          </div>

          <div style={{ display: "grid", gap: 11 }}>
            {attributes.map((attribute) => (
              <div
                key={attribute.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 12,
                  padding: 13,
                  background: attribute.is_active
                    ? "#fff"
                    : "#f9fafb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 240, flex: "1 1 520px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      <Badge>
                        {attribute.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge>Key: {attribute.slug}</Badge>
                      <Badge>
                        Type: {attribute.input_type}
                      </Badge>
                      {attribute.unit ? (
                        <Badge>Unit: {attribute.unit}</Badge>
                      ) : null}
                      <Badge>Order: {attribute.sort_order}</Badge>
                      <Badge>{attribute.value_count} values</Badge>
                      <Badge>
                        {attribute.mapping_count} mappings
                      </Badge>
                      <Badge>
                        {attribute.listing_answer_count} answers
                      </Badge>
                    </div>

                    <div style={{ fontSize: 17, fontWeight: 900 }}>
                      {attribute.name}
                    </div>

                    <div
                      style={{
                        opacity: 0.76,
                        marginTop: 5,
                        lineHeight: 1.45,
                      }}
                    >
                      {attribute.description ||
                        "No administrator description yet."}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 9,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <ActionButton
                      variant="secondary"
                      onClick={() => openEdit(attribute)}
                      disabled={saving}
                    >
                      Edit
                    </ActionButton>

                    <ActionButton
                      variant={
                        attribute.is_active ? "danger" : "secondary"
                      }
                      onClick={() => void changeStatus(attribute)}
                      disabled={saving}
                    >
                      {attribute.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </ActionButton>

                    {(attribute.input_type === "single_select" ||
                      attribute.input_type === "multi_select") ? (
                      <ActionButton
                        href="/admin/dashboard/master-data/rental/values"
                        variant="secondary"
                      >
                        Manage Values →
                      </ActionButton>
                    ) : null}

                    <ActionButton
                      href="/admin/dashboard/master-data/rental/mapping"
                      variant="secondary"
                    >
                      Manage Mapping →
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
