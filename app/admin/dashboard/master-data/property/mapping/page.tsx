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

type TypeRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean | null;
};

type SubtypeRow = {
  id: string;
  type_id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean | null;
};

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: string;
  unit: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  active_value_count: number;
};

type MappingRow = {
  subtype_id: string;
  attribute_id: string;
  is_required: boolean;
  sort_order: number | null;
  is_filterable: boolean;
  group_name: string | null;
  created_at: string;
  listing_answer_count: number;
  restricted_value_count: number;
};

type FormState = {
  sort_order: string;
  group_name: string;
  is_required: boolean;
  is_filterable: boolean;
};

const emptyForm: FormState = {
  sort_order: "1000",
  group_name: "Basic",
  is_required: false,
  is_filterable: true,
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

const secondaryButton: React.CSSProperties = {
  border: "1px solid #dbe2ea",
  borderRadius: 9,
  background: "#f8fafc",
  color: "#172033",
  padding: "9px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButton: React.CSSProperties = {
  ...secondaryButton,
  borderColor: "#0866d9",
  background: "#0866d9",
  color: "#fff",
};

const dangerButton: React.CSSProperties = {
  ...secondaryButton,
  borderColor: "#fee2e2",
  background: "#fff7f7",
  color: "#a32929",
};

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

export default function PropertyMappingMasterPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeRow[]>([]);
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [subtypeId, setSubtypeId] = useState("");
  const [search, setSearch] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorAttributeId, setEditorAttributeId] =
    useState("");
  const [reviewing, setReviewing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const activeTypes = useMemo(
    () => types.filter((type) => type.is_active !== false),
    [types]
  );

  const subtypesForType = useMemo(
    () =>
      subtypes.filter(
        (subtype) =>
          subtype.type_id === typeId &&
          subtype.is_active !== false
      ),
    [subtypes, typeId]
  );

  const selectedSubtype = useMemo(
    () =>
      subtypes.find((subtype) => subtype.id === subtypeId) ||
      null,
    [subtypes, subtypeId]
  );

  const selectedAttribute = useMemo(
    () =>
      attributes.find(
        (attribute) => attribute.id === editorAttributeId
      ) || null,
    [attributes, editorAttributeId]
  );

  const mappingByAttribute = useMemo(() => {
    const index: Record<string, MappingRow> = {};

    for (const mapping of mappings) {
      index[mapping.attribute_id] = mapping;
    }

    return index;
  }, [mappings]);

  const normalizedSearch = search.trim().toLowerCase();

  const mappedAttributes = useMemo(
    () =>
      attributes
        .filter((attribute) => mappingByAttribute[attribute.id])
        .filter((attribute) => {
          if (!normalizedSearch) return true;

          return [
            attribute.name,
            attribute.slug,
            attribute.input_type,
            mappingByAttribute[attribute.id]?.group_name || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        })
        .sort((left, right) => {
          const leftMapping = mappingByAttribute[left.id];
          const rightMapping = mappingByAttribute[right.id];

          const orderDifference =
            (leftMapping.sort_order ?? 1000000) -
            (rightMapping.sort_order ?? 1000000);

          return (
            orderDifference ||
            left.name.localeCompare(right.name)
          );
        }),
    [attributes, mappingByAttribute, normalizedSearch]
  );

  const availableAttributes = useMemo(
    () =>
      attributes
        .filter(
          (attribute) =>
            attribute.is_active !== false &&
            !mappingByAttribute[attribute.id]
        )
        .filter((attribute) => {
          if (!normalizedSearch) return true;

          return [
            attribute.name,
            attribute.slug,
            attribute.input_type,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        })
        .sort((left, right) => {
          const orderDifference =
            (left.sort_order ?? 1000000) -
            (right.sort_order ?? 1000000);

          return (
            orderDifference ||
            left.name.localeCompare(right.name)
          );
        }),
    [attributes, mappingByAttribute, normalizedSearch]
  );

  const requiredCount = mappings.filter(
    (mapping) => mapping.is_required
  ).length;

  const filterableCount = mappings.filter(
    (mapping) => mapping.is_filterable
  ).length;

  const answerCount = mappings.reduce(
    (total, mapping) =>
      total + Number(mapping.listing_answer_count || 0),
    0
  );

  function scrollToEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function loadMappings(nextSubtypeId: string) {
    if (!nextSubtypeId) {
      setMappings([]);
      return;
    }

    setMappingLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/property-mapping?subtype_id=${encodeURIComponent(
          nextSubtypeId
        )}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }

      const body = await readJson(response);
      setMappings(Array.isArray(body.mappings) ? body.mappings : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load subtype mappings."
      );
    } finally {
      setMappingLoading(false);
    }
  }

  async function boot() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/property-mapping", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }

      const body = await readJson(response);
      const nextTypes = Array.isArray(body.types)
        ? body.types
        : [];
      const nextSubtypes = Array.isArray(body.subtypes)
        ? body.subtypes
        : [];
      const nextAttributes = Array.isArray(body.attributes)
        ? body.attributes
        : [];

      setTypes(nextTypes);
      setSubtypes(nextSubtypes);
      setAttributes(nextAttributes);

      const firstType = nextTypes.find(
        (type: TypeRow) => type.is_active !== false
      );

      const firstSubtype = nextSubtypes.find(
        (subtype: SubtypeRow) =>
          subtype.type_id === firstType?.id &&
          subtype.is_active !== false
      );

      setTypeId(firstType?.id || "");
      setSubtypeId(firstSubtype?.id || "");

      if (firstSubtype?.id) {
        await loadMappings(firstSubtype.id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Property Mapping."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void boot();
  }, []);

  function closeEditor() {
    setEditorOpen(false);
    setEditing(false);
    setEditorAttributeId("");
    setReviewing(false);
    setForm(emptyForm);
  }

  function selectType(nextTypeId: string) {
    setTypeId(nextTypeId);
    setMappings([]);
    closeEditor();
    setError(null);
    setNotice(null);

    const firstSubtype = subtypes.find(
      (subtype) =>
        subtype.type_id === nextTypeId &&
        subtype.is_active !== false
    );

    const nextSubtypeId = firstSubtype?.id || "";
    setSubtypeId(nextSubtypeId);

    if (nextSubtypeId) {
      void loadMappings(nextSubtypeId);
    }
  }

  function selectSubtype(nextSubtypeId: string) {
    setSubtypeId(nextSubtypeId);
    setMappings([]);
    closeEditor();
    setError(null);
    setNotice(null);

    if (nextSubtypeId) {
      void loadMappings(nextSubtypeId);
    }
  }

  function openAdd(attribute: AttributeRow) {
    if (!selectedSubtype) {
      setError("Select a subtype first.");
      return;
    }

    setEditing(false);
    setEditorAttributeId(attribute.id);
    setReviewing(false);
    setForm({
      sort_order:
        attribute.sort_order == null
          ? "1000"
          : String(attribute.sort_order),
      group_name: "Basic",
      is_required: false,
      is_filterable: true,
    });
    setEditorOpen(true);
    setError(null);
    setNotice(null);
    scrollToEditor();
  }

  function openEdit(
    attribute: AttributeRow,
    mapping: MappingRow
  ) {
    setEditing(true);
    setEditorAttributeId(attribute.id);
    setReviewing(false);
    setForm({
      sort_order:
        mapping.sort_order == null
          ? "1000"
          : String(mapping.sort_order),
      group_name: mapping.group_name || "",
      is_required: mapping.is_required,
      is_filterable: mapping.is_filterable,
    });
    setEditorOpen(true);
    setError(null);
    setNotice(null);
    scrollToEditor();
  }

  function validateForm() {
    const sortOrder = Number(form.sort_order);

    if (!selectedSubtype || !selectedAttribute) {
      return "Subtype and attribute are required.";
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 1000000
    ) {
      return "Sort order must be a whole number from 0 to 1000000.";
    }

    if (form.group_name.trim().length > 80) {
      return "Group name must not exceed 80 characters.";
    }

    return null;
  }

  function beginReview() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setReviewing(true);
    scrollToEditor();
  }

  async function saveMapping() {
    const validationError = validateForm();

    if (
      validationError ||
      !selectedSubtype ||
      !selectedAttribute
    ) {
      setError(
        validationError || "Subtype and attribute are required."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/property-mapping",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtype_id: selectedSubtype.id,
            attribute_id: selectedAttribute.id,
            sort_order: Number(form.sort_order),
            group_name: form.group_name.trim() || null,
            is_required: form.is_required,
            is_filterable: form.is_filterable,
          }),
        }
      );

      await readJson(response);
      const currentSubtypeId = selectedSubtype.id;

      closeEditor();
      await loadMappings(currentSubtypeId);
      setNotice(
        editing
          ? "Property mapping updated successfully."
          : "Attribute mapped to the subtype successfully."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The mapping could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMapping(
    attribute: AttributeRow,
    mapping: MappingRow
  ) {
    if (!selectedSubtype) return;

    const dependencyText = [
      `${mapping.listing_answer_count} listing answers`,
      `${mapping.restricted_value_count} value restrictions`,
    ].join(" · ");

    if (
      !window.confirm(
        `Remove "${attribute.name}" from "${selectedSubtype.name}"?\n\n${dependencyText}\n\nRemoval is blocked when connected data exists.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/property-mapping",
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtype_id: selectedSubtype.id,
            attribute_id: attribute.id,
          }),
        }
      );

      await readJson(response);
      await loadMappings(selectedSubtype.id);
      setNotice("Unused mapping removed successfully.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "The mapping could not be removed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container>
      <SectionHeader
        title="Property · Mapping"
        subtitle="Control which reusable attributes appear for each property subtype."
      />

      <div className="navRow">
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
          href="/admin/dashboard/master-data/property/values"
          variant="secondary"
        >
          Values →
        </ActionButton>
      </div>

      <section className="guide">
        <h2>How Property Mapping works</h2>
        <p>
          A mapping connects one reusable Property Attribute to one
          Property Subtype. The mapping controls where the question
          appears, its order, whether it is required and whether it
          may be used as a search filter.
        </p>
        <ul>
          <li>
            Subtype and attribute identities are locked after the
            mapping is created.
          </li>
          <li>
            Required fields affect listing validation. Enable them
            only after testing the complete listing workflow.
          </li>
          <li>
            Removal is blocked when listing answers or subtype value
            restrictions depend on the mapping.
          </li>
          <li>
            Core listing fields such as price, address, ownership,
            possession, facing and plot area are not recreated here.
          </li>
        </ul>
      </section>

      {error && <div className="errorBox">{error}</div>}
      {notice && <div className="noticeBox">{notice}</div>}

      {loading ? (
        <EmptyState message="Loading Property Mapping…" />
      ) : (
        <>
          <section className="selector">
            <div>
              <b>Property type</b>
              <select
                style={fieldStyle}
                value={typeId}
                onChange={(event) =>
                  selectType(event.target.value)
                }
              >
                {activeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <b>Property subtype</b>
              <select
                style={fieldStyle}
                value={subtypeId}
                onChange={(event) =>
                  selectSubtype(event.target.value)
                }
              >
                {subtypesForType.map((subtype) => (
                  <option key={subtype.id} value={subtype.id}>
                    {subtype.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="summaryRow">
            <Badge>{mappings.length} mapped</Badge>
            <Badge>{requiredCount} required</Badge>
            <Badge>{filterableCount} filterable</Badge>
            <Badge>{answerCount} listing answers</Badge>
            {mappingLoading && <Badge>Loading mapping…</Badge>}
          </div>

          <input
            style={fieldStyle}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search attributes by name, key, type or group…"
          />

          <div className="mappingGrid">
            <section className="panel">
              <div className="panelHeading">
                <div>
                  <h2>Mapped Attributes</h2>
                  <p>
                    Questions currently shown for{" "}
                    <b>{selectedSubtype?.name || "this subtype"}</b>.
                  </p>
                </div>
                <Badge>{mappedAttributes.length}</Badge>
              </div>

              {!selectedSubtype ? (
                <EmptyState message="Select a property subtype." />
              ) : mappedAttributes.length === 0 ? (
                <EmptyState message="No matching mapped attributes." />
              ) : (
                mappedAttributes.map((attribute) => {
                  const mapping =
                    mappingByAttribute[attribute.id];

                  return (
                    <article
                      className="attributeCard mapped"
                      key={attribute.id}
                    >
                      <div className="badgeRow">
                        <Badge>{attribute.input_type}</Badge>
                        <Badge>Key: {attribute.slug}</Badge>
                        <Badge>
                          Group: {mapping.group_name || "None"}
                        </Badge>
                        <Badge>
                          Order: {mapping.sort_order ?? 1000}
                        </Badge>
                        <Badge>
                          {mapping.is_required
                            ? "Required"
                            : "Optional"}
                        </Badge>
                        <Badge>
                          {mapping.is_filterable
                            ? "Filterable"
                            : "Not filterable"}
                        </Badge>
                        <Badge>
                          {mapping.listing_answer_count} answers
                        </Badge>
                        <Badge>
                          {mapping.restricted_value_count} restrictions
                        </Badge>
                      </div>

                      <h3>{attribute.name}</h3>
                      <p>
                        {attribute.description ||
                          "No administrator description yet."}
                      </p>

                      <div className="actionRow">
                        <button
                          type="button"
                          style={secondaryButton}
                          disabled={saving}
                          onClick={() =>
                            openEdit(attribute, mapping)
                          }
                        >
                          Edit Mapping
                        </button>
                        <button
                          type="button"
                          style={dangerButton}
                          disabled={saving}
                          onClick={() =>
                            void removeMapping(attribute, mapping)
                          }
                        >
                          Remove Mapping
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            <section className="panel">
              <div className="panelHeading">
                <div>
                  <h2>Available Attributes</h2>
                  <p>
                    Active attributes that can be added to the
                    selected subtype.
                  </p>
                </div>
                <Badge>{availableAttributes.length}</Badge>
              </div>

              {!selectedSubtype ? (
                <EmptyState message="Select a property subtype." />
              ) : availableAttributes.length === 0 ? (
                <EmptyState message="No matching available attributes." />
              ) : (
                availableAttributes.map((attribute) => (
                  <article
                    className="attributeCard"
                    key={attribute.id}
                  >
                    <div className="badgeRow">
                      <Badge>{attribute.input_type}</Badge>
                      <Badge>Key: {attribute.slug}</Badge>
                      {attribute.unit && (
                        <Badge>Unit: {attribute.unit}</Badge>
                      )}
                      <Badge>
                        {attribute.active_value_count} active values
                      </Badge>
                    </div>

                    <h3>{attribute.name}</h3>
                    <p>
                      {attribute.description ||
                        "No administrator description yet."}
                    </p>

                    <button
                      type="button"
                      style={primaryButton}
                      disabled={saving}
                      onClick={() => openAdd(attribute)}
                    >
                      + Add Mapping
                    </button>
                  </article>
                ))
              )}
            </section>
          </div>

          {editorOpen &&
            selectedSubtype &&
            selectedAttribute && (
              <section className="editor" ref={editorRef}>
                <h2>
                  {editing
                    ? "Edit Property Mapping"
                    : "Add Property Mapping"}
                </h2>
                <p>
                  Review how this attribute will behave in the Add
                  Property form before saving.
                </p>

                <div className="lockedGrid">
                  <label className="field">
                    <b>Property subtype</b>
                    <input
                      style={{
                        ...fieldStyle,
                        background: "#f3f6fa",
                      }}
                      value={selectedSubtype.name}
                      disabled
                    />
                    <small>
                      The subtype is permanently locked for this
                      mapping.
                    </small>
                  </label>

                  <label className="field">
                    <b>Property attribute</b>
                    <input
                      style={{
                        ...fieldStyle,
                        background: "#f3f6fa",
                      }}
                      value={selectedAttribute.name}
                      disabled
                    />
                    <small>
                      The attribute is permanently locked for this
                      mapping.
                    </small>
                  </label>
                </div>

                <div className="editorGrid">
                  <label className="field">
                    <b>Group name</b>
                    <input
                      style={fieldStyle}
                      maxLength={80}
                      value={form.group_name}
                      placeholder="Example: Configuration"
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          group_name: event.target.value,
                        }));
                        setReviewing(false);
                      }}
                    />
                    <small>
                      Groups organize related questions in the
                      listing form.
                    </small>
                  </label>

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
                    <small>Lower numbers appear first.</small>
                  </label>
                </div>

                <div className="controlGrid">
                  <label className="controlBox">
                    <input
                      type="checkbox"
                      checked={form.is_required}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          is_required: event.target.checked,
                        }));
                        setReviewing(false);
                      }}
                    />
                    <span>
                      <b>Required</b>
                      <small>
                        Listings must answer this question before
                        submission.
                      </small>
                    </span>
                  </label>

                  <label className="controlBox">
                    <input
                      type="checkbox"
                      checked={form.is_filterable}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          is_filterable: event.target.checked,
                        }));
                        setReviewing(false);
                      }}
                    />
                    <span>
                      <b>Filterable</b>
                      <small>
                        The attribute may be offered as a marketplace
                        search filter.
                      </small>
                    </span>
                  </label>
                </div>

                {editing && (
                  <div className="dependencyBox">
                    <b>Connected usage</b>
                    <span>
                      {
                        mappingByAttribute[selectedAttribute.id]
                          ?.listing_answer_count
                      }{" "}
                      listing answers ·{" "}
                      {
                        mappingByAttribute[selectedAttribute.id]
                          ?.restricted_value_count
                      }{" "}
                      subtype value restrictions
                    </span>
                  </div>
                )}

                {reviewing && (
                  <div className="reviewBox">
                    <h3>Review before saving</h3>
                    <p>
                      <b>Subtype:</b> {selectedSubtype.name}
                    </p>
                    <p>
                      <b>Attribute:</b> {selectedAttribute.name}
                    </p>
                    <p>
                      <b>Group:</b>{" "}
                      {form.group_name.trim() || "None"}
                    </p>
                    <p>
                      <b>Sort order:</b> {form.sort_order}
                    </p>
                    <p>
                      <b>Required:</b>{" "}
                      {form.is_required ? "Yes" : "No"}
                    </p>
                    <p>
                      <b>Filterable:</b>{" "}
                      {form.is_filterable ? "Yes" : "No"}
                    </p>
                  </div>
                )}

                <div className="editorActions">
                  <button
                    type="button"
                    style={secondaryButton}
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  {reviewing ? (
                    <>
                      <button
                        type="button"
                        style={secondaryButton}
                        onClick={() => setReviewing(false)}
                        disabled={saving}
                      >
                        Back to Edit
                      </button>
                      <button
                        type="button"
                        style={primaryButton}
                        onClick={() => void saveMapping()}
                        disabled={saving}
                      >
                        {saving
                          ? "Saving…"
                          : "Confirm and Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      style={primaryButton}
                      onClick={beginReview}
                      disabled={saving}
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
        .navRow,
        .summaryRow,
        .badgeRow,
        .actionRow,
        .editorActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .navRow {
          margin-bottom: 14px;
        }

        .guide,
        .selector,
        .panel,
        .editor {
          border: 1px solid #e3e8ef;
          border-radius: 16px;
          background: #fff;
        }

        .guide {
          margin-bottom: 14px;
          padding: 16px;
          background: #f7fbff;
        }

        .guide h2,
        .panel h2,
        .editor h2,
        .attributeCard h3,
        .reviewBox h3 {
          margin: 0;
        }

        .guide p,
        .guide li,
        .panel p,
        .editor > p,
        .attributeCard p {
          color: #4b5563;
          line-height: 1.55;
        }

        .guide ul {
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

        .selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .selector > div {
          display: grid;
          gap: 7px;
        }

        .summaryRow {
          margin: 12px 0;
        }

        .mappingGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: start;
          margin-top: 14px;
        }

        .panel,
        .editor {
          padding: 16px;
        }

        .panelHeading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .panelHeading p {
          margin: 5px 0 0;
        }

        .attributeCard {
          margin-top: 10px;
          padding: 14px;
          border: 1px solid #e3e8ef;
          border-radius: 12px;
        }

        .attributeCard.mapped {
          background: #f1f7ff;
          border-color: #bdd9fa;
        }

        .attributeCard h3 {
          margin-top: 10px;
        }

        .attributeCard p {
          margin: 7px 0 11px;
        }

        .editor {
          margin-top: 16px;
          border: 2px solid #1473df;
          scroll-margin-top: 20px;
        }

        .lockedGrid,
        .editorGrid,
        .controlGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field {
          display: grid;
          gap: 7px;
          margin-top: 16px;
        }

        .field small,
        .controlBox small {
          color: #657184;
          line-height: 1.45;
        }

        .controlBox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 16px;
          padding: 14px;
          border: 1px solid #e3e8ef;
          border-radius: 10px;
        }

        .controlBox span {
          display: grid;
          gap: 5px;
        }

        .dependencyBox,
        .reviewBox {
          display: grid;
          gap: 6px;
          margin-top: 16px;
          padding: 13px;
          border-radius: 10px;
        }

        .dependencyBox {
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

        @media (max-width: 900px) {
          .selector,
          .mappingGrid,
          .lockedGrid,
          .editorGrid,
          .controlGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Container>
  );
}
