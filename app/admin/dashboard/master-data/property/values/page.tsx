"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: "single_select" | "multi_select";
  sort_order: number | null;
  is_active: boolean | null;
};

type ValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  subtype_mapping_count: number;
  listing_answer_count: number;
};

type ValuesResponse = {
  ok?: boolean;
  error?: string;
  attributes?: AttributeRow[];
  values?: ValueRow[];
};

type FormState = {
  value: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  value: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  padding: "10px 12px",
  border: "1px solid #dbe2ea",
  borderRadius: 10,
  background: "#fff",
  color: "#111827",
  font: "inherit",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #dbe2ea",
  borderRadius: 9,
  background: "#f8fafc",
  color: "#172033",
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  borderColor: "#0866d9",
  background: "#0866d9",
  color: "#fff",
};

const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  borderColor: "#fee2e2",
  background: "#fff7f7",
  color: "#a32929",
};

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed."
    );
  }

  return body;
}

export default function PropertyValuesMasterPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<
    "suggestions" | "description" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [values, setValues] = useState<ValueRow[]>([]);
  const [selectedAttributeId, setSelectedAttributeId] =
    useState<string>("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ValueRow | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const selectedAttribute = useMemo(
    () =>
      attributes.find(
        (attribute) => attribute.id === selectedAttributeId
      ) || null,
    [attributes, selectedAttributeId]
  );

  const selectedValues = useMemo(
    () =>
      values.filter(
        (value) => value.attribute_id === selectedAttributeId
      ),
    [values, selectedAttributeId]
  );

  const totalMappings = useMemo(
    () =>
      selectedValues.reduce(
        (total, value) =>
          total + Number(value.subtype_mapping_count || 0),
        0
      ),
    [selectedValues]
  );

  const totalAnswers = useMemo(
    () =>
      selectedValues.reduce(
        (total, value) =>
          total + Number(value.listing_answer_count || 0),
        0
      ),
    [selectedValues]
  );

  function scrollToEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function load(preferredAttributeId?: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/property-values", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }

      const body = (await readJson(response)) as ValuesResponse;
      const nextAttributes = body.attributes || [];
      const nextValues = body.values || [];

      setAttributes(nextAttributes);
      setValues(nextValues);

      setSelectedAttributeId((current) => {
        const preferred =
          preferredAttributeId || current;

        if (
          preferred &&
          nextAttributes.some(
            (attribute) => attribute.id === preferred
          )
        ) {
          return preferred;
        }

        return nextAttributes[0]?.id || "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load property values."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setReviewing(false);
    setSuggestions([]);
    setForm(emptyForm);
    setError(null);
    setNotice(null);
  }

  function openAdd() {
    if (!selectedAttribute) return;

    setEditing(null);
    setReviewing(false);
    setSuggestions([]);
    setForm(emptyForm);
    setEditorOpen(true);
    setError(null);
    setNotice(null);
    scrollToEditor();
  }

  function openEdit(value: ValueRow) {
    setSelectedAttributeId(value.attribute_id);
    setEditing(value);
    setReviewing(false);
    setSuggestions([]);
    setForm({
      value: value.value,
      slug: value.slug,
      description: value.description || "",
      sort_order:
        value.sort_order == null
          ? "1000"
          : String(value.sort_order),
      is_active: value.is_active !== false,
    });
    setEditorOpen(true);
    setError(null);
    setNotice(null);
    scrollToEditor();
  }

  function changeAttribute(attributeId: string) {
    setSelectedAttributeId(attributeId);
    closeEditor();
  }

  function validateForm() {
    const value = form.value.trim();
    const permanentKey = editing
      ? editing.slug
      : form.slug.trim() || slugify(value);
    const sortOrder = Number(form.sort_order);

    if (!selectedAttribute) {
      return "Select a parent attribute.";
    }

    if (value.length < 1 || value.length > 120) {
      return "Value label must contain 1 to 120 characters.";
    }

    if (!permanentKey || permanentKey.length > 120) {
      return "A valid permanent key is required.";
    }

    if (form.description.trim().length > 600) {
      return "Administrator description must not exceed 600 characters.";
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

  function beginReview() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setReviewing(false);
      return;
    }

    setError(null);
    setReviewing(true);
    scrollToEditor();
  }

  async function save() {
    const validationError = validateForm();

    if (validationError || !selectedAttribute) {
      setError(validationError || "Select a parent attribute.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const method = editing ? "PATCH" : "POST";
    const body = editing
      ? {
          id: editing.id,
          value: form.value.trim(),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order),
          is_active: form.is_active,
        }
      : {
          attribute_id: selectedAttribute.id,
          value: form.value.trim(),
          slug: form.slug.trim() || slugify(form.value),
          description: form.description.trim() || null,
          sort_order: Number(form.sort_order),
          is_active: form.is_active,
        };

    try {
      const response = await fetch("/api/admin/property-values", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await readJson(response);
      const parentId = selectedAttribute.id;

      closeEditor();
      await load(parentId);
      setNotice(
        editing
          ? "Property value updated successfully."
          : "Property value created successfully."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The property value could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeActiveState(
    value: ValueRow,
    isActive: boolean
  ) {
    const action = isActive ? "activate" : "deactivate";

    if (
      !window.confirm(
        `${action === "activate" ? "Activate" : "Deactivate"} "${value.value}"?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/property-values", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: value.id,
          value: value.value,
          description: value.description,
          sort_order: value.sort_order ?? 1000,
          is_active: isActive,
        }),
      });

      await readJson(response);
      await load(value.attribute_id);
      setNotice(
        `Property value ${isActive ? "activated" : "deactivated"}.`
      );
    } catch (stateError) {
      setError(
        stateError instanceof Error
          ? stateError.message
          : `The value could not be ${action}d.`
      );
    } finally {
      setSaving(false);
    }
  }

  async function suggestValues() {
    if (!selectedAttribute) return;

    setAiBusy("suggestions");
    setError(null);
    setNotice(null);
    setSuggestions([]);

    try {
      const response = await fetch(
        "/api/admin/master-description",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "property_value",
            task: "value_suggestions",
            context: {
              name: form.value.trim(),
              parentAttribute: selectedAttribute.name,
              inputType: selectedAttribute.input_type,
            },
            existingNames: selectedValues.map(
              (value) => value.value
            ),
          }),
        }
      );

      const body = await readJson(response);

      if (body.needs_clarification) {
        setNotice(
          body.question ||
            "Please make the requested option more specific."
        );
        return;
      }

      const nextSuggestions = Array.isArray(body.suggestions)
        ? body.suggestions.filter(
            (value: unknown): value is string =>
              typeof value === "string"
          )
        : [];

      setSuggestions(nextSuggestions);

      if (nextSuggestions.length === 0) {
        setNotice("AI returned no new value suggestions.");
      }
    } catch (aiError) {
      setError(
        aiError instanceof Error
          ? aiError.message
          : "AI suggestions could not be generated."
      );
    } finally {
      setAiBusy(null);
    }
  }

  async function improveDescription() {
    if (!selectedAttribute || !form.value.trim()) {
      setError("Enter a clear value label first.");
      return;
    }

    setAiBusy("description");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/master-description",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "property_value",
            task: "description",
            context: {
              name: form.value.trim(),
              key:
                editing?.slug ||
                form.slug.trim() ||
                slugify(form.value),
              parentAttribute: selectedAttribute.name,
              inputType: selectedAttribute.input_type,
            },
            existing: form.description,
          }),
        }
      );

      const body = await readJson(response);

      if (body.needs_clarification) {
        setNotice(
          body.question ||
            "Please make the value label more specific."
        );
        return;
      }

      if (typeof body.description !== "string") {
        throw new Error("AI returned an invalid description.");
      }

      setForm((current) => ({
        ...current,
        description: body.description.slice(0, 600),
      }));
      setNotice(
        "AI draft inserted. Review and edit it before saving."
      );
    } catch (aiError) {
      setError(
        aiError instanceof Error
          ? aiError.message
          : "AI description assistance failed."
      );
    } finally {
      setAiBusy(null);
    }
  }

  function chooseSuggestion(suggestion: string) {
    setForm((current) => ({
      ...current,
      value: suggestion,
      slug: editing ? current.slug : slugify(suggestion),
    }));
    setSuggestions([]);
    setReviewing(false);
  }

  return (
    <Container>
      <SectionHeader
        title="Property · Values"
        subtitle="Control the allowed options used by select-type property attributes."
      />

      <div className="valuesNav">
        <ActionButton
          href="/admin/dashboard/master-data"
          variant="secondary"
        >
          ← Back
        </ActionButton>
        <ActionButton
          href="/admin/dashboard/master-data/property/taxonomy"
          variant="secondary"
        >
          Taxonomy →
        </ActionButton>
        <ActionButton
          href="/admin/dashboard/master-data/property/attributes"
          variant="secondary"
        >
          Attributes →
        </ActionButton>
        <ActionButton
          href="/admin/dashboard/master-data/property/mapping"
          variant="secondary"
        >
          Mapping →
        </ActionButton>
      </div>

      <section className="guideCard">
        <h2>How Property Values work</h2>
        <p>
          Values are the controlled choices for a{" "}
          <b>single-select</b> or <b>multi-select</b> attribute.
          For example, “Fully Furnished” belongs to “Furnishing
          Status”, while “2 BHK” belongs to “BHK Configuration”.
        </p>
        <ul>
          <li>
            Parent attributes and permanent keys are locked after
            creation.
          </li>
          <li>
            Deactivate a value to stop future use without deleting
            listing or mapping history.
          </li>
          <li>
            Review subtype-mapping and listing-answer counts before
            changing a label or status.
          </li>
          <li>
            AI suggestions are advisory and never save database
            records.
          </li>
        </ul>
      </section>

      {error && <div className="errorBox">{error}</div>}
      {notice && <div className="noticeBox">{notice}</div>}

      {loading ? (
        <EmptyState message="Loading property values…" />
      ) : attributes.length === 0 ? (
        <EmptyState message="No select-type property attributes were found." />
      ) : (
        <>
          <div className="toolbar">
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={closeEditor}
            >
              Browse Values
            </button>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={openAdd}
              disabled={!selectedAttribute}
            >
              + Add Value
            </button>
          </div>

          <div className="valuesLayout">
            <section className="panel">
              <div className="panelHeading">
                <div>
                  <h2>Select Attribute</h2>
                  <p>Choose the controlled list to administer.</p>
                </div>
                <Badge>{attributes.length}</Badge>
              </div>

              {attributes.map((attribute) => {
                const count = values.filter(
                  (value) =>
                    value.attribute_id === attribute.id
                ).length;

                return (
                  <button
                    type="button"
                    key={attribute.id}
                    className={
                      attribute.id === selectedAttributeId
                        ? "attributeCard selected"
                        : "attributeCard"
                    }
                    onClick={() => changeAttribute(attribute.id)}
                  >
                    <div className="badgeRow">
                      <Badge>{attribute.input_type}</Badge>
                      <Badge>{count} values</Badge>
                      <Badge>
                        {attribute.is_active === false
                          ? "Inactive"
                          : "Active"}
                      </Badge>
                    </div>
                    <strong>{attribute.name}</strong>
                    <span>
                      Key: {attribute.slug}
                    </span>
                  </button>
                );
              })}
            </section>

            <section className="panel">
              <div className="panelHeading">
                <div>
                  <h2>
                    {selectedAttribute?.name || "Property Values"}
                  </h2>
                  <p>
                    {selectedValues.length} values · {totalMappings}{" "}
                    subtype mappings · {totalAnswers} listing answers
                  </p>
                </div>
                <Badge>{selectedValues.length}</Badge>
              </div>

              {selectedValues.length === 0 ? (
                <EmptyState message="No values exist for this attribute." />
              ) : (
                selectedValues.map((value) => (
                  <article className="valueCard" key={value.id}>
                    <div className="badgeRow">
                      <Badge>
                        {value.is_active === false
                          ? "Inactive"
                          : "Active"}
                      </Badge>
                      <Badge>Key: {value.slug}</Badge>
                      <Badge>
                        Order: {value.sort_order ?? 1000}
                      </Badge>
                      <Badge>
                        {value.subtype_mapping_count} mappings
                      </Badge>
                      <Badge>
                        {value.listing_answer_count} answers
                      </Badge>
                    </div>

                    <h3>{value.value}</h3>
                    <p>
                      {value.description ||
                        "No administrator description yet."}
                    </p>

                    <div className="cardActions">
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => openEdit(value)}
                        disabled={saving}
                      >
                        Edit
                      </button>

                      {value.is_active === false ? (
                        <button
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() =>
                            void changeActiveState(value, true)
                          }
                          disabled={saving}
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          type="button"
                          style={dangerButtonStyle}
                          onClick={() =>
                            void changeActiveState(value, false)
                          }
                          disabled={saving}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>

          {editorOpen && selectedAttribute && (
            <section className="editor" ref={editorRef}>
              <h2>
                {editing
                  ? "Edit Property Value"
                  : "Add Property Value"}
              </h2>
              <p>
                AI may suggest option labels and draft descriptions,
                but it never saves or changes Property Values.
                Review every field before saving.
              </p>

              <label className="field">
                <b>Parent select attribute</b>
                <input
                  style={{
                    ...fieldStyle,
                    background: "#f3f6fa",
                  }}
                  value={selectedAttribute.name}
                  disabled
                />
                <small>
                  The parent attribute is locked during editing to
                  prevent accidental remapping.
                </small>
              </label>

              <label className="field">
                <b>Value label *</b>
                <input
                  style={fieldStyle}
                  value={form.value}
                  maxLength={120}
                  placeholder="Example: Fully Furnished"
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      value,
                      slug: editing
                        ? current.slug
                        : slugify(value),
                    }));
                    setReviewing(false);
                  }}
                />
              </label>

              {!editing && (
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={aiBusy !== null}
                  onClick={() => void suggestValues()}
                >
                  {aiBusy === "suggestions"
                    ? "Generating suggestions…"
                    : "Suggest Value Labels with AI"}
                </button>
              )}

              {suggestions.length > 0 && (
                <div className="suggestionList">
                  {suggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => chooseSuggestion(suggestion)}
                    >
                      <b>{suggestion}</b>
                      <span>
                        Use this advisory suggestion and review all
                        fields before saving.
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <label className="field">
                <b>Permanent key *</b>
                <input
                  style={{
                    ...fieldStyle,
                    background: editing ? "#f3f6fa" : "#fff",
                  }}
                  value={form.slug}
                  maxLength={120}
                  disabled={Boolean(editing)}
                  placeholder="Generated from the value label"
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }));
                    setReviewing(false);
                  }}
                />
                <small>
                  Use lowercase letters, numbers and hyphens. It
                  becomes locked after creation.
                </small>
              </label>

              <label className="field">
                <b>Administrator description</b>
                <textarea
                  style={{
                    ...fieldStyle,
                    minHeight: 112,
                    resize: "vertical",
                  }}
                  value={form.description}
                  maxLength={600}
                  placeholder="Explain this option and how it differs from nearby choices."
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }));
                    setReviewing(false);
                  }}
                />
                <small>
                  {form.description.length}/600 characters. Human
                  review is required.
                </small>
              </label>

              <button
                type="button"
                style={secondaryButtonStyle}
                disabled={aiBusy !== null}
                onClick={() => void improveDescription()}
              >
                {aiBusy === "description"
                  ? "Drafting description…"
                  : "Improve Description with AI"}
              </button>

              <div className="editorGrid">
                <label className="field">
                  <b>Sort order *</b>
                  <input
                    style={fieldStyle}
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={form.sort_order}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        sort_order: event.target.value,
                      }));
                      setReviewing(false);
                    }}
                  />
                  <small>
                    Lower numbers appear first. Leave space for future
                    additions.
                  </small>
                </label>

                <label className="activeBox">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }));
                      setReviewing(false);
                    }}
                  />
                  <span>
                    <b>Active</b>
                    <small>
                      Active values may be offered in property listing
                      forms.
                    </small>
                  </span>
                </label>
              </div>

              {editing && (
                <div className="usageBox">
                  <b>Connected usage</b>
                  <span>
                    {editing.subtype_mapping_count} subtype mappings ·{" "}
                    {editing.listing_answer_count} listing answers
                  </span>
                </div>
              )}

              {reviewing && (
                <div className="reviewBox">
                  <h3>Review before saving</h3>
                  <p>
                    <b>Parent:</b> {selectedAttribute.name}
                  </p>
                  <p>
                    <b>Label:</b> {form.value.trim()}
                  </p>
                  <p>
                    <b>Permanent key:</b>{" "}
                    {editing?.slug ||
                      form.slug ||
                      slugify(form.value)}
                  </p>
                  <p>
                    <b>Status:</b>{" "}
                    {form.is_active ? "Active" : "Inactive"}
                  </p>
                  <p>
                    <b>Sort order:</b> {form.sort_order}
                  </p>
                  <p>
                    <b>Description:</b>{" "}
                    {form.description.trim() ||
                      "No administrator description"}
                  </p>
                </div>
              )}

              <div className="editorActions">
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                {reviewing ? (
                  <>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => setReviewing(false)}
                      disabled={saving}
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      style={primaryButtonStyle}
                      onClick={() => void save()}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Confirm and Save"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={beginReview}
                    disabled={saving || aiBusy !== null}
                  >
                    Review and Save
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      <style jsx>{`
        .valuesNav,
        .toolbar,
        .cardActions,
        .editorActions,
        .badgeRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .valuesNav {
          margin-bottom: 14px;
        }

        .guideCard,
        .panel,
        .editor {
          border: 1px solid #e3e8ef;
          border-radius: 16px;
          background: #fff;
        }

        .guideCard {
          margin-bottom: 14px;
          padding: 16px;
          background: #f7fbff;
        }

        .guideCard h2,
        .panel h2,
        .editor h2,
        .valueCard h3,
        .reviewBox h3 {
          margin: 0;
        }

        .guideCard p,
        .guideCard li,
        .panel p,
        .editor > p,
        .valueCard p {
          line-height: 1.55;
          color: #4b5563;
        }

        .guideCard ul {
          margin-bottom: 0;
        }

        .errorBox,
        .noticeBox {
          margin: 12px 0;
          padding: 12px 14px;
          border-radius: 10px;
          font-weight: 800;
        }

        .errorBox {
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #a61b1b;
        }

        .noticeBox {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #174a8b;
        }

        .toolbar {
          margin: 14px 0;
        }

        .valuesLayout {
          display: grid;
          grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
          gap: 14px;
          align-items: start;
        }

        .panel,
        .editor {
          padding: 16px;
        }

        .panelHeading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .panelHeading p {
          margin: 5px 0 0;
        }

        .attributeCard {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 13px;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }

        .attributeCard.selected {
          border: 2px solid #1473df;
          background: #eef6ff;
        }

        .attributeCard strong,
        .attributeCard span {
          display: block;
          margin-top: 7px;
        }

        .attributeCard span {
          color: #657184;
          font-size: 13px;
        }

        .valueCard {
          margin-top: 10px;
          padding: 14px;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
        }

        .valueCard h3 {
          margin-top: 10px;
        }

        .valueCard p {
          margin: 7px 0 11px;
        }

        .editor {
          margin-top: 16px;
          border: 2px solid #1473df;
          scroll-margin-top: 20px;
        }

        .field {
          display: grid;
          gap: 7px;
          margin-top: 16px;
        }

        .field small,
        .activeBox small {
          color: #657184;
          line-height: 1.45;
        }

        .suggestionList {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }

        .suggestionList button {
          display: grid;
          gap: 4px;
          padding: 11px;
          border: 1px solid #cfe1f8;
          border-radius: 10px;
          background: #eef6ff;
          text-align: left;
          cursor: pointer;
        }

        .suggestionList span {
          color: #53657a;
        }

        .editorGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(240px, 1fr);
          gap: 14px;
          align-items: stretch;
        }

        .activeBox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 16px;
          padding: 14px;
          border: 1px solid #e3e8ef;
          border-radius: 10px;
        }

        .activeBox span {
          display: grid;
          gap: 5px;
        }

        .usageBox,
        .reviewBox {
          display: grid;
          gap: 6px;
          margin-top: 16px;
          padding: 13px;
          border-radius: 10px;
        }

        .usageBox {
          border: 1px solid #dbe2ea;
          background: #f8fafc;
        }

        .reviewBox {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
        }

        .reviewBox p {
          margin: 0;
          line-height: 1.45;
        }

        .editorActions {
          justify-content: flex-end;
          margin-top: 18px;
        }

        @media (max-width: 850px) {
          .valuesLayout,
          .editorGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Container>
  );
}
