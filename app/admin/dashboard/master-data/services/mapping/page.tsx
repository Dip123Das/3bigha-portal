"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: "category" | "subcategory" | "service";
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  provider_service_count?: number;
};

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: string;
  unit: string | null;
  scope: string;
  is_active: boolean;
  sort_order: number;
};

type MappingRow = {
  id: string;
  service_taxon_id: string;
  attribute_id: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
  historical_answer_count: number;
};

type MappingResponse = {
  ok: boolean;
  error?: string;
  categories: TaxonRow[];
  subcategories: TaxonRow[];
  services: TaxonRow[];
  attributes: AttributeRow[];
  mappings: MappingRow[];
  summary: {
    category_count: number;
    subcategory_count: number;
    service_count: number;
    attribute_count: number;
    mapping_count: number;
    active_mapping_count: number;
    inactive_mapping_count: number;
    provider_service_count: number;
    historical_answer_count: number;
    legacy_product_group_mapping_supported: boolean;
  };
};

type EditState = {
  id: string;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
};

const emptySummary: MappingResponse["summary"] = {
  category_count: 0,
  subcategory_count: 0,
  service_count: 0,
  attribute_count: 0,
  mapping_count: 0,
  active_mapping_count: 0,
  inactive_mapping_count: 0,
  provider_service_count: 0,
  historical_answer_count: 0,
  legacy_product_group_mapping_supported: false,
};

function inputTypeLabel(value: string) {
  const labels: Record<string, string> = {
    text: "Short written answer",
    number: "Number",
    boolean: "Yes or No",
    single_select: "One choice",
    multi_select: "Multiple choices",
  };
  return labels[value] || value.replace(/_/g, " ");
}

function scopeLabel(value: string) {
  return value === "global" ? "Global reusable" : "Specialised";
}

export default function ServicesMappingPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [services, setServices] = useState<TaxonRow[]>([]);
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [summary, setSummary] = useState(emptySummary);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [attributeId, setAttributeId] = useState("");
  const [sortOrder, setSortOrder] = useState(1000);
  const [isRequired, setIsRequired] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  async function accessToken() {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = data.session?.access_token;
    if (!token) throw new Error("Your administrator session has expired. Sign in again.");
    return token;
  }

  async function apiRequest(method: "GET" | "POST" | "PATCH", body?: unknown) {
    const token = await accessToken();
    const response = await fetch("/api/admin/service-mapping", {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "The Services Mapping request failed.");
    }
    return payload;
  }

  async function loadData(quiet = false) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const payload = (await apiRequest("GET")) as MappingResponse;
      setCategories(payload.categories || []);
      setSubcategories(payload.subcategories || []);
      setServices(payload.services || []);
      setAttributes(payload.attributes || []);
      setMappings(payload.mappings || []);
      setSummary(payload.summary || emptySummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Services Mapping.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((row) => row.is_active),
    [categories]
  );
  const availableSubcategories = useMemo(
    () =>
      subcategories.filter(
        (row) => row.is_active && row.parent_id === categoryId
      ),
    [subcategories, categoryId]
  );
  const availableServices = useMemo(
    () =>
      services.filter(
        (row) => row.is_active && row.parent_id === subcategoryId
      ),
    [services, subcategoryId]
  );
  const selectedService = services.find((row) => row.id === serviceId) || null;
  const selectedSubcategory =
    subcategories.find((row) => row.id === subcategoryId) || null;
  const selectedCategory = categories.find((row) => row.id === categoryId) || null;

  const mappingByAttribute = useMemo(() => {
    const result = new Map<string, MappingRow>();
    for (const mapping of mappings) {
      if (mapping.service_taxon_id === serviceId) {
        result.set(mapping.attribute_id, mapping);
      }
    }
    return result;
  }, [mappings, serviceId]);

  const availableAttributes = useMemo(
    () =>
      attributes.filter(
        (attribute) =>
          attribute.is_active && !mappingByAttribute.has(attribute.id)
      ),
    [attributes, mappingByAttribute]
  );

  const visibleMappings = useMemo(
    () =>
      mappings
        .filter(
          (mapping) =>
            mapping.service_taxon_id === serviceId &&
            (showInactive || mapping.is_active)
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    [mappings, serviceId, showInactive]
  );

  const attributeById = useMemo(
    () => new Map(attributes.map((row) => [row.id, row])),
    [attributes]
  );

  function chooseCategory(nextId: string) {
    setCategoryId(nextId);
    setSubcategoryId("");
    setServiceId("");
    setAttributeId("");
    setEdit(null);
    setMessage("");
    setError("");
  }

  function chooseSubcategory(nextId: string) {
    setSubcategoryId(nextId);
    setServiceId("");
    setAttributeId("");
    setEdit(null);
    setMessage("");
    setError("");
  }

  function chooseService(nextId: string) {
    setServiceId(nextId);
    setAttributeId("");
    setEdit(null);
    setMessage("");
    setError("");
    const existing = mappings.filter(
      (mapping) => mapping.service_taxon_id === nextId
    );
    const maximum = existing.reduce(
      (current, mapping) => Math.max(current, mapping.sort_order),
      0
    );
    setSortOrder(maximum ? maximum + 10 : 1000);
  }

  async function createMapping() {
    if (!serviceId || !attributeId) {
      setError("Select an individual Service and an Attribute first.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await apiRequest("POST", {
        service_taxon_id: serviceId,
        attribute_id: attributeId,
        is_required: isRequired,
        sort_order: sortOrder,
      });
      await loadData(true);
      setAttributeId("");
      setIsRequired(false);
      setSortOrder((current) => current + 10);
      setMessage("Attribute mapped successfully. The permanent relationship is preserved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create mapping.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(mapping: MappingRow) {
    setEdit({
      id: mapping.id,
      sort_order: mapping.sort_order,
      is_required: mapping.is_required,
      is_active: mapping.is_active,
    });
    setMessage("");
    setError("");
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await apiRequest("PATCH", edit);
      await loadData(true);
      setEdit(null);
      setMessage(
        edit.is_active
          ? "Mapping settings updated successfully."
          : "Mapping deactivated without deleting its permanent identity or history."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update mapping.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Services → Mapping" subtitle="Loading protected mapping controls…" />
      </Container>
    );
  }

  return (
    <Container>
      <div className="smp-page">
        <SectionHeader
          title="Services → Mapping"
          subtitle="Connect reusable Services Attributes directly to the individual Services where providers must answer them."
        />

        <nav className="smp-nav" aria-label="Services master data navigation">
          <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/taxonomy" variant="secondary">Taxonomy →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/attributes" variant="secondary">Attributes →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/services/values" variant="secondary">Values →</ActionButton>
        </nav>

        <section className="smp-info">
          <strong>How to use this page</strong>
          <div>
            Choose Category → Subcategory → Individual Service, then attach each reusable Attribute that a provider must answer. Mark only genuinely mandatory questions as required. A mapping can be deactivated, but its permanent Service and Attribute relationship is never deleted or reassigned.
          </div>
        </section>

        <div className="smp-stats">
          <span>Services {summary.service_count}</span>
          <span>Attributes {summary.attribute_count}</span>
          <span>Mappings {summary.mapping_count}</span>
          <span>Active {summary.active_mapping_count}</span>
          <span>Inactive {summary.inactive_mapping_count}</span>
        </div>

        {error ? <div className="smp-alert smp-error" role="alert">{error}</div> : null}
        {message ? <div className="smp-alert smp-success" role="status">{message}</div> : null}

        <section className="smp-card">
          <div className="smp-cardHead">
            <div>
              <h2>Step 1 — Choose an individual Service</h2>
              <p>Mappings belong to individual Services—not Categories, Subcategories or legacy Product Groups.</p>
            </div>
          </div>

          <div className="smp-grid3">
            <label className="smp-field">
              <span>Services Category</span>
              <select value={categoryId} onChange={(event) => chooseCategory(event.target.value)}>
                <option value="">Select an active Category</option>
                {activeCategories.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>

            <label className="smp-field">
              <span>Services Subcategory</span>
              <select
                value={subcategoryId}
                onChange={(event) => chooseSubcategory(event.target.value)}
                disabled={!categoryId}
              >
                <option value="">{categoryId ? "Select an active Subcategory" : "Select Category first"}</option>
                {availableSubcategories.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>

            <label className="smp-field">
              <span>Individual Service</span>
              <select
                value={serviceId}
                onChange={(event) => chooseService(event.target.value)}
                disabled={!subcategoryId}
              >
                <option value="">{subcategoryId ? "Select an active individual Service" : "Select Subcategory first"}</option>
                {availableServices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}{row.provider_service_count ? ` — ${row.provider_service_count} provider record(s)` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="smp-context">
            <strong>Selected path:</strong>{" "}
            {selectedCategory?.name || "Category"} → {selectedSubcategory?.name || "Subcategory"} → {selectedService?.name || "Individual Service"}
          </div>
        </section>

        <section className="smp-card">
          <div className="smp-cardHead">
            <div>
              <h2>Step 2 — Map a Services Attribute</h2>
              <p>Select a reusable Attribute and decide whether the provider must answer it.</p>
            </div>
          </div>

          {!serviceId ? (
            <EmptyState message="Choose an individual Service in Step 1 before creating a mapping." />
          ) : attributes.length === 0 ? (
            <div className="smp-emptyHelp">
              <strong>No Services Attributes exist yet.</strong>
              <div>Create reusable questions on Services → Attributes before returning here.</div>
              <ActionButton href="/admin/dashboard/master-data/services/attributes" variant="secondary">Create Services Attribute →</ActionButton>
            </div>
          ) : (
            <div className="smp-form">
              <label className="smp-field">
                <span>Reusable Services Attribute</span>
                <select value={attributeId} onChange={(event) => setAttributeId(event.target.value)}>
                  <option value="">Select an active unmapped Attribute</option>
                  {availableAttributes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} — {inputTypeLabel(row.input_type)} — {scopeLabel(row.scope)}
                    </option>
                  ))}
                </select>
              </label>

              {attributeId ? (
                <div className="smp-attributeNote">
                  {attributeById.get(attributeId)?.description || "No administrator-reviewed description has been supplied."}
                </div>
              ) : null}

              <div className="smp-grid2">
                <label className="smp-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={sortOrder}
                    onChange={(event) => setSortOrder(Number(event.target.value))}
                  />
                  <small>Controls the order of questions for this individual Service.</small>
                </label>

                <label className="smp-check">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(event) => setIsRequired(event.target.checked)}
                  />
                  <span>
                    <strong>Provider answer required</strong>
                    <small>Enable only when a listing cannot be complete without this answer.</small>
                  </span>
                </label>
              </div>

              <button
                type="button"
                className="smp-primary"
                onClick={createMapping}
                disabled={busy || !attributeId}
              >
                {busy ? "Saving…" : "Review and create Mapping"}
              </button>
            </div>
          )}
        </section>

        <section className="smp-card">
          <div className="smp-cardHead smp-cardHeadRow">
            <div>
              <h2>Step 3 — Existing Attribute mappings</h2>
              <p>Review question order, requirement status, lifecycle and preserved answer usage.</p>
            </div>
            <label className="smp-showInactive">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
              />
              Show inactive
            </label>
          </div>

          {!serviceId ? (
            <EmptyState message="Choose an individual Service to see its Attribute mappings." />
          ) : visibleMappings.length === 0 ? (
            <EmptyState message="No Attribute mappings are available for this individual Service." />
          ) : (
            <div className="smp-list">
              {visibleMappings.map((mapping) => {
                const attribute = attributeById.get(mapping.attribute_id);
                const editing = edit?.id === mapping.id;
                return (
                  <article key={mapping.id} className="smp-row">
                    <div className="smp-rowMain">
                      <div className="smp-rowTitle">
                        {attribute?.name || mapping.attribute_id}
                        <span className={mapping.is_active ? "smp-active" : "smp-inactive"}>
                          {mapping.is_active ? "Active" : "Inactive"}
                        </span>
                        {mapping.is_required ? <span className="smp-required">Required</span> : null}
                      </div>
                      <div className="smp-rowMeta">
                        {attribute ? inputTypeLabel(attribute.input_type) : "Unknown answer type"}
                        {attribute?.unit ? ` • Unit: ${attribute.unit}` : ""}
                        {attribute ? ` • ${scopeLabel(attribute.scope)}` : ""}
                        {` • Sort ${mapping.sort_order}`}
                        {` • Historical answers ${mapping.historical_answer_count}`}
                      </div>
                      <div className="smp-key">Permanent Attribute key: {attribute?.slug || mapping.attribute_id}</div>

                      {editing && edit ? (
                        <div className="smp-editGrid">
                          <label className="smp-field">
                            <span>Sort order</span>
                            <input
                              type="number"
                              min={0}
                              max={1000000}
                              value={edit.sort_order}
                              onChange={(event) => setEdit({ ...edit, sort_order: Number(event.target.value) })}
                            />
                          </label>
                          <label className="smp-check smp-compactCheck">
                            <input
                              type="checkbox"
                              checked={edit.is_required}
                              onChange={(event) => setEdit({ ...edit, is_required: event.target.checked })}
                            />
                            <span><strong>Required</strong></span>
                          </label>
                          <label className="smp-check smp-compactCheck">
                            <input
                              type="checkbox"
                              checked={edit.is_active}
                              onChange={(event) => setEdit({ ...edit, is_active: event.target.checked })}
                            />
                            <span><strong>Active</strong></span>
                          </label>
                        </div>
                      ) : null}
                    </div>

                    <div className="smp-rowActions">
                      {editing ? (
                        <>
                          <button type="button" onClick={saveEdit} disabled={busy}>Save</button>
                          <button type="button" onClick={() => setEdit(null)} disabled={busy}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => beginEdit(mapping)} disabled={busy}>Edit lifecycle</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="smp-safety">
          <strong>Human First. AI Second. Precision Always.</strong>
          <div>Mapping determines which reusable questions apply to an individual Service. It does not create provider answers, qualifications, prices, availability, licences or quality claims.</div>
          <div>Mappings are never deleted or reassigned. Deactivation preserves their permanent identity and historical answers.</div>
        </section>

        <style jsx>{`
          .smp-page { padding: 8px 0 36px; color: #172033; }
          .smp-nav { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 16px; }
          .smp-info, .smp-safety { background: #edf6ff; border: 1px solid #dcecff; border-radius: 16px; padding: 16px; line-height: 1.65; }
          .smp-info strong, .smp-safety strong { display: block; margin-bottom: 4px; color: #16355c; }
          .smp-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
          .smp-stats span { background: #f5f7fa; border: 1px solid #e7ebf0; border-radius: 999px; padding: 5px 10px; font-size: 13px; color: #536174; }
          .smp-alert { margin: 12px 0; border-radius: 12px; padding: 12px 14px; font-weight: 600; }
          .smp-error { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
          .smp-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #166534; }
          .smp-card { background: white; border: 1px solid #e3e8ef; border-radius: 18px; padding: 18px; margin-top: 16px; box-shadow: 0 7px 24px rgba(15, 23, 42, 0.035); }
          .smp-cardHead h2 { margin: 0; font-size: 19px; font-weight: 750; }
          .smp-cardHead p { margin: 5px 0 16px; color: #667085; }
          .smp-cardHeadRow { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .smp-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
          .smp-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .smp-field { display: grid; gap: 6px; font-weight: 650; }
          .smp-field select, .smp-field input { width: 100%; min-height: 44px; border: 1px solid #d9e0e8; border-radius: 10px; background: white; padding: 9px 11px; color: #172033; font: inherit; }
          .smp-field select:disabled { background: #f5f7fa; color: #98a2b3; }
          .smp-field small, .smp-check small { display: block; color: #778398; font-weight: 400; line-height: 1.45; }
          .smp-context, .smp-attributeNote { margin-top: 14px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 12px; padding: 11px 13px; color: #536174; }
          .smp-form { display: grid; gap: 14px; }
          .smp-check { display: flex; gap: 10px; align-items: center; border: 1px solid #d9e0e8; border-radius: 12px; padding: 11px 13px; }
          .smp-check input { width: 18px; height: 18px; flex: 0 0 auto; }
          .smp-primary { justify-self: start; border: 0; border-radius: 10px; background: #111a2f; color: white; padding: 11px 16px; font-weight: 750; cursor: pointer; }
          .smp-primary:disabled, .smp-rowActions button:disabled { opacity: .55; cursor: not-allowed; }
          .smp-emptyHelp { display: grid; justify-items: start; gap: 10px; background: #f8fafc; border: 1px dashed #ccd5e1; border-radius: 14px; padding: 18px; color: #536174; }
          .smp-showInactive { white-space: nowrap; display: flex; gap: 7px; align-items: center; color: #536174; }
          .smp-list { display: grid; gap: 10px; }
          .smp-row { display: flex; justify-content: space-between; gap: 16px; border: 1px solid #e6ebf1; border-radius: 14px; padding: 14px; }
          .smp-rowMain { min-width: 0; flex: 1; }
          .smp-rowTitle { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; font-weight: 750; }
          .smp-rowTitle span { border-radius: 999px; padding: 3px 8px; font-size: 12px; }
          .smp-active { background: #dcfce7; color: #166534; }
          .smp-inactive { background: #f1f5f9; color: #64748b; }
          .smp-required { background: #fff7ed; color: #9a3412; }
          .smp-rowMeta, .smp-key { color: #6b778c; font-size: 13px; margin-top: 5px; overflow-wrap: anywhere; }
          .smp-key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
          .smp-rowActions { display: flex; gap: 7px; align-items: flex-start; flex-wrap: wrap; }
          .smp-rowActions button { border: 1px solid #d9e0e8; background: white; border-radius: 9px; padding: 8px 11px; font-weight: 700; cursor: pointer; }
          .smp-editGrid { display: grid; grid-template-columns: minmax(140px, 1fr) auto auto; gap: 10px; margin-top: 12px; align-items: end; }
          .smp-compactCheck { min-height: 44px; }
          .smp-safety { margin-top: 18px; }
          @media (max-width: 820px) {
            .smp-grid3, .smp-grid2 { grid-template-columns: 1fr; }
            .smp-cardHeadRow, .smp-row { flex-direction: column; }
            .smp-editGrid { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </Container>
  );
}
