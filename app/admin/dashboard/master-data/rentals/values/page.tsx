"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

type Attribute = {
  id: string;
  name: string;
  slug: string;
  input_type: "single_select" | "multi_select";
  is_active: boolean;
  sort_order: number;
  value_count: number;
  active_value_count: number;
};

type RentalValue = {
  id: string;
  attribute_id: string;
  value: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  mapping_count: number;
  listing_answer_count: number;
  dependency_count: number;
};

type Totals = {
  attributes: number;
  values: number;
  active_values: number;
  inactive_values: number;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  requires_confirmation?: boolean;
  attributes?: Attribute[];
  values?: RentalValue[];
  totals?: Totals;
  suggestions?: unknown[];
  description?: string;
  data?: RentalValue;
};

type EditorState = {
  id: string | null;
  attributeId: string;
  value: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyEditor: EditorState = {
  id: null,
  attributeId: "",
  value: "",
  slug: "",
  description: "",
  sortOrder: 1000,
  isActive: true,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function readResponse(response: Response): Promise<ApiPayload> {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload;

  if (!response.ok) {
    throw new Error(
      payload.error || `Request failed with status ${response.status}.`
    );
  }

  return payload;
}

function Metric(props: { label: string; value: number }) {
  return (
    <article style={styles.metric}>
      <span style={styles.metricLabel}>{props.label}</span>
      <strong style={styles.metricValue}>{props.value}</strong>
    </article>
  );
}

function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type={props.type || "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...styles.button,
        ...(props.primary ? styles.primaryButton : {}),
        ...(props.danger ? styles.dangerButton : {}),
        ...(props.disabled ? styles.disabledButton : {}),
      }}
    >
      {props.children}
    </button>
  );
}

export default function RentalValuesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [values, setValues] = useState<RentalValue[]>([]);
  const [totals, setTotals] = useState<Totals>({
    attributes: 0,
    values: 0,
    active_values: 0,
    inactive_values: 0,
  });

  const [selectedAttributeId, setSelectedAttributeId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/rental-values", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = await readResponse(response);
      const nextAttributes = payload.attributes || [];
      const nextValues = payload.values || [];

      setAttributes(nextAttributes);
      setValues(nextValues);
      setTotals(
        payload.totals || {
          attributes: nextAttributes.length,
          values: nextValues.length,
          active_values: nextValues.filter((row) => row.is_active).length,
          inactive_values: nextValues.filter((row) => !row.is_active).length,
        }
      );

      setSelectedAttributeId((current) => {
        if (current && nextAttributes.some((row) => row.id === current)) {
          return current;
        }

        return nextAttributes[0]?.id || "";
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Rental Values could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAttribute = useMemo(
    () =>
      attributes.find((row) => row.id === selectedAttributeId) || null,
    [attributes, selectedAttributeId]
  );

  const visibleValues = useMemo(
    () =>
      values.filter((row) => row.attribute_id === selectedAttributeId),
    [values, selectedAttributeId]
  );

  function resetEditor(attributeId = selectedAttributeId) {
    setEditor({
      ...emptyEditor,
      attributeId,
    });
    setSuggestions([]);
    setAiMessage(null);
    setReviewOpen(false);
  }

  function beginCreate() {
    if (!selectedAttribute) {
      setError(
        "Create an active single-select or multi-select Rental Attribute first."
      );
      return;
    }

    if (!selectedAttribute.is_active) {
      setError("Activate the parent Rental Attribute before adding values.");
      return;
    }

    setError(null);
    setMessage(null);
    resetEditor(selectedAttribute.id);
    setEditorOpen(true);
  }

  function beginEdit(row: RentalValue) {
    setError(null);
    setMessage(null);
    setSuggestions([]);
    setAiMessage(null);
    setReviewOpen(false);
    setEditorOpen(true);
    setSelectedAttributeId(row.attribute_id);
    setEditor({
      id: row.id,
      attributeId: row.attribute_id,
      value: row.value,
      slug: row.slug,
      description: row.description || "",
      sortOrder: row.sort_order,
      isActive: row.is_active,
    });
  }

  function requestReview(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const value = editor.value.trim();
    const slug = editor.id ? editor.slug : slugify(editor.slug || value);

    if (!editor.attributeId) {
      setError("Select the parent Rental Attribute.");
      return;
    }

    if (!value || value.length > 120) {
      setError("Value label must contain 1 to 120 characters.");
      return;
    }

    if (!slug || slug.length > 120) {
      setError("A valid permanent key is required.");
      return;
    }

    if (editor.description.trim().length > 600) {
      setError("Description must not exceed 600 characters.");
      return;
    }

    if (
      !Number.isInteger(editor.sortOrder) ||
      editor.sortOrder < 0 ||
      editor.sortOrder > 1000000
    ) {
      setError("Sort order must be a whole number from 0 to 1000000.");
      return;
    }

    setEditor((current) => ({
      ...current,
      value,
      slug,
      description: current.description.trim(),
    }));
    setReviewOpen(true);
  }

  async function saveValue() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const editing = Boolean(editor.id);
      const body: Record<string, unknown> = {
        value: editor.value,
        description: editor.description,
        sort_order: editor.sortOrder,
        is_active: editor.isActive,
      };

      if (editing) {
        body.id = editor.id;
      } else {
        body.attribute_id = editor.attributeId;
        body.slug = editor.slug;
      }

      const response = await fetch("/api/admin/rental-values", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await readResponse(response);

      setMessage(
        editing
          ? `Rental Value “${editor.value}” was updated.`
          : `Rental Value “${editor.value}” was created.`
      );
      setReviewOpen(false);
      setEditorOpen(false);
      resetEditor();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Rental Value could not be saved."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeLifecycle(row: RentalValue) {
    const nextActive = !row.is_active;
    const action = nextActive ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `${action === "activate" ? "Activate" : "Deactivate"} “${row.value}”?\n\n` +
        `Parent attribute: ${
          attributes.find((item) => item.id === row.attribute_id)?.name ||
          "Unknown"
        }\n` +
        `Mappings: ${row.mapping_count}\n` +
        `Listing answers: ${row.listing_answer_count}\n` +
        `Total dependencies: ${row.dependency_count}\n\n` +
        `No historical record will be deleted.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/rental-values", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          value: row.value,
          description: row.description || "",
          sort_order: row.sort_order,
          is_active: nextActive,
          confirm_lifecycle: true,
        }),
      });

      await readResponse(response);
      setMessage(
        `Rental Value “${row.value}” was ${
          nextActive ? "activated" : "deactivated"
        }.`
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Rental Value could not be ${action}d.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function suggestValues() {
    if (!selectedAttribute) {
      setError("Select a Rental Attribute first.");
      return;
    }

    setAiBusy(true);
    setError(null);
    setAiMessage(null);
    setSuggestions([]);

    try {
      const existingNames = visibleValues.map((row) => row.value);

      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "value_suggestions",
          kind: "rental_value",
          existingNames,
          context: {
            name: editor.value || selectedAttribute.name,
            parent_attribute: selectedAttribute.name,
            parent_attribute_key: selectedAttribute.slug,
            input_type: selectedAttribute.input_type,
            existing_values: existingNames,
            scope: "global reusable rental value",
          },
        }),
      });

      const payload = await readResponse(response);
      const nextSuggestions = (payload.suggestions || [])
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5);

      setSuggestions(nextSuggestions);
      setAiMessage(
        nextSuggestions.length
          ? "AI suggestions are advisory. Select one, review it and edit it before saving."
          : "AI did not return a suitable controlled value."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "AI suggestions could not be generated."
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function draftDescription() {
    if (!editor.value.trim() || !selectedAttribute) {
      setError("Enter a clear value label and select its parent attribute.");
      return;
    }

    setAiBusy(true);
    setError(null);
    setAiMessage(null);

    try {
      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "description",
          kind: "rental_value",
          existing: editor.description,
          context: {
            name: editor.value,
            parent_attribute: selectedAttribute.name,
            parent_attribute_key: selectedAttribute.slug,
            input_type: selectedAttribute.input_type,
            scope: "controlled rental option",
          },
        }),
      });

      const payload = await readResponse(response);

      if (!payload.description?.trim()) {
        throw new Error("AI did not return a usable description.");
      }

      setEditor((current) => ({
        ...current,
        description: payload.description!.trim().slice(0, 600),
      }));
      setAiMessage(
        "AI draft inserted. A master administrator must review and edit it before saving."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The AI description could not be drafted."
      );
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.heading}>Rental · Values</h1>
        <p style={styles.lead}>
          Control reusable choices for select-type rental-equipment
          specifications. Values remain global under their parent attribute;
          product-group applicability is controlled later through Rental
          Mapping.
        </p>
      </section>

      <nav style={styles.navigation}>
        <Link href="/admin/dashboard/master-data" style={styles.linkButton}>
          ← Back
        </Link>
        <Link
          href="/admin/dashboard/master-data/rentals/taxonomy"
          style={styles.linkButton}
        >
          Taxonomy →
        </Link>
        <Link
          href="/admin/dashboard/master-data/rentals/attributes"
          style={styles.linkButton}
        >
          Attributes →
        </Link>
        <Link
          href="/admin/dashboard/master-data/rentals/mapping"
          style={styles.linkButton}
        >
          Mapping →
        </Link>
      </nav>

      <section style={styles.metrics}>
        <Metric label="Select attributes" value={totals.attributes} />
        <Metric label="All values" value={totals.values} />
        <Metric label="Active" value={totals.active_values} />
        <Metric label="Inactive" value={totals.inactive_values} />
      </section>

      <section style={styles.info}>
        <h2 style={styles.subheading}>How Rental Values work</h2>
        <p>
          A value is one allowed answer under a single-select or multi-select
          Rental Attribute. For example, <strong>Power Source</strong> may use
          Diesel, Petrol, Electric or Battery; <strong>Operator
          Availability</strong> may use Included, Optional or Not Available.
        </p>
        <ul>
          <li>Values do not belong directly to a product group.</li>
          <li>The permanent key and parent attribute lock after creation.</li>
          <li>Descriptions and display labels remain administrator-reviewed.</li>
          <li>Deactivate unused values instead of deleting history.</li>
          <li>AI suggestions never save database records.</li>
        </ul>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}
      {message ? <div style={styles.success}>{message}</div> : null}

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.subheading}>Select parent Rental Attribute</h2>
            <p style={styles.muted}>
              Only single-select and multi-select attributes can have
              controlled values.
            </p>
          </div>

          <Button
            primary
            onClick={beginCreate}
            disabled={!selectedAttribute || busy}
          >
            + Add Value
          </Button>
        </div>

        <label style={styles.label}>
          Parent attribute
          <select
            value={selectedAttributeId}
            onChange={(event) => {
              setSelectedAttributeId(event.target.value);
              setEditorOpen(false);
              setReviewOpen(false);
              setSuggestions([]);
              setAiMessage(null);
              setError(null);
              setMessage(null);
            }}
            style={styles.input}
            disabled={loading || busy}
          >
            <option value="">— Select Rental Attribute —</option>
            {attributes.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.name} ·{" "}
                {attribute.input_type === "single_select"
                  ? "Single select"
                  : "Multiple select"}
                {!attribute.is_active ? " · Inactive" : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedAttribute ? (
          <div style={styles.attributeSummary}>
            <strong>{selectedAttribute.name}</strong>
            <span>Permanent key: {selectedAttribute.slug}</span>
            <span>
              Input type:{" "}
              {selectedAttribute.input_type === "single_select"
                ? "Single select"
                : "Multiple select"}
            </span>
            <span>
              Values: {selectedAttribute.value_count} · Active:{" "}
              {selectedAttribute.active_value_count}
            </span>
          </div>
        ) : (
          <p style={styles.empty}>
            No select-type Rental Attribute is available. Create Rental
            Attributes before creating controlled values.
          </p>
        )}
      </section>

      {editorOpen ? (
        <section style={styles.editor}>
          <h2 style={styles.subheading}>
            {editor.id ? "Edit Rental Value" : "Add Rental Value"}
          </h2>
          <p style={styles.muted}>
            Review every field before saving. This editor never deletes
            connected rental history.
          </p>

          <div style={styles.notice}>
            AI may suggest controlled rental options and draft descriptions,
            but it cannot save database records. A master administrator must
            review every save.
          </div>

          <form onSubmit={requestReview}>
            <label style={styles.label}>
              Parent Rental Attribute *
              <input
                value={selectedAttribute?.name || ""}
                readOnly
                style={styles.lockedInput}
              />
              <span style={styles.help}>
                Locked permanently after creation.
              </span>
            </label>

            <label style={styles.label}>
              Value label *
              <input
                value={editor.value}
                onChange={(event) => {
                  const value = event.target.value;
                  setEditor((current) => ({
                    ...current,
                    value,
                    slug: current.id ? current.slug : slugify(value),
                  }));
                }}
                placeholder='Example: "Diesel", "Electric" or "Operator Included"'
                maxLength={120}
                style={styles.input}
              />
            </label>

            <div style={styles.actions}>
              <Button
                onClick={() => void suggestValues()}
                disabled={aiBusy || busy}
              >
                {aiBusy ? "AI working…" : "Suggest Rental Values with AI"}
              </Button>
            </div>

            {suggestions.length ? (
              <div style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    style={styles.suggestion}
                    onClick={() =>
                      setEditor((current) => ({
                        ...current,
                        value: suggestion,
                        slug: current.id
                          ? current.slug
                          : slugify(suggestion),
                      }))
                    }
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <label style={styles.label}>
              Permanent key *
              <input
                value={editor.slug}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }
                readOnly={Boolean(editor.id)}
                style={editor.id ? styles.lockedInput : styles.input}
                maxLength={120}
              />
              <span style={styles.help}>
                {editor.id
                  ? "Locked permanently after creation."
                  : "Generated from the value label. Use lowercase letters, numbers and hyphens."}
              </span>
            </label>

            <label style={styles.label}>
              Administrator description
              <textarea
                value={editor.description}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
                maxLength={600}
                style={styles.textarea}
                placeholder="Explain what this controlled rental option means and when administrators should use it."
              />
              <span style={styles.help}>
                {editor.description.length}/600 characters. Human review is
                required.
              </span>
            </label>

            <div style={styles.actions}>
              <Button
                onClick={() => void draftDescription()}
                disabled={aiBusy || busy || !editor.value.trim()}
              >
                {editor.description
                  ? "Improve Description with AI"
                  : "Draft Description with AI"}
              </Button>
              {aiMessage ? <span style={styles.aiMessage}>{aiMessage}</span> : null}
            </div>

            <label style={styles.label}>
              Sort order *
              <input
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={editor.sortOrder}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
                style={styles.input}
              />
              <span style={styles.help}>
                Lower numbers appear first. Leave gaps for future additions.
              </span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={editor.isActive}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>Active</strong>
                <br />
                Active values may be used by future rental listing workflows.
                Inactive values remain available for history.
              </span>
            </label>

            <div style={styles.actionsRight}>
              <Button
                onClick={() => {
                  setEditorOpen(false);
                  resetEditor();
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" primary disabled={busy || aiBusy}>
                Review and Save
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {reviewOpen ? (
        <section style={styles.review}>
          <h2 style={styles.subheading}>Review Rental Value before saving</h2>
          <p>
            Confirm that this is a genuine controlled option for the selected
            Rental Attribute. AI has no authority to approve or save it.
          </p>

          <dl style={styles.reviewGrid}>
            <dt>Parent attribute</dt>
            <dd>{selectedAttribute?.name || "Unknown"}</dd>
            <dt>Value label</dt>
            <dd>{editor.value}</dd>
            <dt>Permanent key</dt>
            <dd>{editor.slug}</dd>
            <dt>Description</dt>
            <dd>{editor.description || "No description supplied"}</dd>
            <dt>Sort order</dt>
            <dd>{editor.sortOrder}</dd>
            <dt>Status</dt>
            <dd>{editor.isActive ? "Active" : "Inactive"}</dd>
          </dl>

          <div style={styles.actionsRight}>
            <Button onClick={() => setReviewOpen(false)} disabled={busy}>
              Return to editor
            </Button>
            <Button primary onClick={() => void saveValue()} disabled={busy}>
              {busy ? "Saving…" : "Confirm Human Review and Save"}
            </Button>
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.subheading}>
              {selectedAttribute
                ? `${selectedAttribute.name} Values`
                : "Rental Values"}
            </h2>
            <p style={styles.muted}>
              Active and inactive historical records are shown.
            </p>
          </div>
          <span style={styles.countBadge}>{visibleValues.length}</span>
        </div>

        {loading ? (
          <p style={styles.empty}>Loading Rental Values…</p>
        ) : visibleValues.length === 0 ? (
          <p style={styles.empty}>
            No controlled values exist for this Rental Attribute.
          </p>
        ) : (
          <div style={styles.list}>
            {visibleValues.map((row) => (
              <article key={row.id} style={styles.row}>
                <div style={styles.rowMain}>
                  <div style={styles.rowTitle}>
                    <strong>{row.value}</strong>
                    <span
                      style={
                        row.is_active
                          ? styles.activeBadge
                          : styles.inactiveBadge
                      }
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span style={styles.muted}>
                    Permanent key: {row.slug}
                  </span>
                  <p style={styles.description}>
                    {row.description || "No administrator description yet."}
                  </p>
                  <span style={styles.muted}>
                    Sort: {row.sort_order} · Mappings: {row.mapping_count} ·
                    Listing answers: {row.listing_answer_count} · Dependencies:{" "}
                    {row.dependency_count}
                  </span>
                </div>

                <div style={styles.actions}>
                  <Button onClick={() => beginEdit(row)} disabled={busy}>
                    Edit
                  </Button>
                  <Button
                    danger={row.is_active}
                    onClick={() => void changeLifecycle(row)}
                    disabled={busy}
                  >
                    {row.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "28px 20px 60px",
    color: "#172033",
  },
  hero: {
    padding: 24,
    border: "1px solid #dbe4ef",
    borderRadius: 18,
    background:
      "linear-gradient(100deg, rgba(219,234,254,.9), rgba(255,255,255,.95))",
  },
  heading: { margin: 0, fontSize: 30 },
  subheading: { margin: "0 0 8px", fontSize: 21 },
  lead: { margin: "8px 0 0", lineHeight: 1.55 },
  navigation: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "14px 0",
  },
  linkButton: {
    padding: "9px 13px",
    border: "1px solid #d8e0ea",
    borderRadius: 9,
    background: "#f8fafc",
    color: "#172033",
    textDecoration: "none",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
    gap: 10,
    marginBottom: 14,
  },
  metric: {
    padding: 16,
    border: "1px solid #dfe5ec",
    borderRadius: 12,
    background: "#fff",
  },
  metricLabel: { display: "block", color: "#64748b", fontSize: 13 },
  metricValue: { display: "block", fontSize: 27, marginTop: 5 },
  info: {
    padding: 20,
    border: "1px solid #dbe4ef",
    borderRadius: 14,
    background: "#f8fbff",
    lineHeight: 1.55,
    marginBottom: 14,
  },
  panel: {
    padding: 20,
    border: "1px solid #dfe5ec",
    borderRadius: 14,
    background: "#fff",
    marginBottom: 16,
  },
  editor: {
    padding: 20,
    border: "2px solid #2878d0",
    borderRadius: 14,
    background: "#fff",
    marginBottom: 16,
  },
  review: {
    padding: 20,
    border: "2px solid #15803d",
    borderRadius: 14,
    background: "#f0fdf4",
    marginBottom: 16,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  notice: {
    padding: 14,
    margin: "14px 0",
    background: "#fffbea",
    border: "1px solid #f1df93",
    borderRadius: 10,
  },
  label: {
    display: "grid",
    gap: 6,
    fontWeight: 700,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #cfd8e3",
    borderRadius: 9,
    background: "#fff",
    color: "#172033",
    font: "inherit",
  },
  lockedInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #cfd8e3",
    borderRadius: 9,
    background: "#eef2f7",
    color: "#475569",
    font: "inherit",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #cfd8e3",
    borderRadius: 9,
    resize: "vertical",
    font: "inherit",
  },
  help: { color: "#64748b", fontSize: 13, fontWeight: 400 },
  muted: { color: "#64748b", fontSize: 14, margin: 0 },
  attributeSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    padding: 13,
    borderRadius: 10,
    background: "#f8fafc",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
  },
  actionsRight: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  button: {
    padding: "9px 13px",
    border: "1px solid #cfd8e3",
    borderRadius: 9,
    background: "#fff",
    color: "#172033",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    background: "#0867c7",
    borderColor: "#0867c7",
    color: "#fff",
  },
  dangerButton: {
    background: "#fff5f5",
    borderColor: "#ef4444",
    color: "#b91c1c",
  },
  disabledButton: { opacity: 0.55, cursor: "not-allowed" },
  suggestions: { display: "grid", gap: 8, marginBottom: 16 },
  suggestion: {
    padding: 12,
    textAlign: "left",
    border: "1px solid #bfdbfe",
    borderRadius: 9,
    background: "#eff6ff",
    color: "#172033",
    cursor: "pointer",
  },
  aiMessage: { color: "#1d4ed8", fontSize: 13, fontWeight: 700 },
  checkboxRow: {
    display: "flex",
    gap: 10,
    padding: 13,
    border: "1px solid #dfe5ec",
    borderRadius: 10,
  },
  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(150px,220px) 1fr",
    gap: 10,
    margin: "18px 0",
  },
  list: { display: "grid", gap: 10 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 15,
    border: "1px solid #dfe5ec",
    borderRadius: 11,
  },
  rowMain: { flex: "1 1 600px" },
  rowTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 5,
  },
  description: { margin: "8px 0", lineHeight: 1.45 },
  activeBadge: {
    padding: "3px 7px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
  },
  inactiveBadge: {
    padding: "3px 7px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
  },
  countBadge: {
    minWidth: 30,
    padding: "5px 9px",
    borderRadius: 999,
    textAlign: "center",
    background: "#e2e8f0",
    fontWeight: 800,
  },
  empty: {
    padding: 22,
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    textAlign: "center",
    color: "#64748b",
  },
  error: {
    padding: 13,
    marginBottom: 14,
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#fef2f2",
    color: "#991b1b",
  },
  success: {
    padding: 13,
    marginBottom: 14,
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#166534",
  },
};
