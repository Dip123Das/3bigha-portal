// app/admin/dashboard/master-data/rentals/mapping/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Kind = "type" | "category" | "subcategory" | "product_group";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  sort_order: number | null;
  is_active: boolean;
  source: string | null;
};

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType | string;
  unit: string | null;
  sort_order: number | null;
  is_active?: boolean | null;
};

type PgAttrMapRow = {
  id: string;
  product_group_id: string;
  attribute_id: string;
  sort_order: number | null;
  is_required: boolean | null;
  is_active?: boolean | null;
};

const API_URL = "/api/admin/rental-mapping";
const MAP_TABLE = "rental_product_group_attributes";

type ApiPayload = {
  ok?: boolean;
  error?: string;
  role?: string | null;
  email?: string | null;
  taxons?: TaxonRow[];
  attributes?: AttrRow[];
  mappings?: PgAttrMapRow[];
  data?: PgAttrMapRow;
  action?: string;
};

async function apiRequest(
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
) {
  const response = await fetch(API_URL, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload =
    (await response.json().catch(() => ({}))) as ApiPayload;

  if (!response.ok) {
    const error = new Error(
      payload.error || "Rental Mapping request failed."
    ) as Error & { status?: number };

    error.status = response.status;
    throw error;
  }

  return payload;
}

function activeChildren(
  taxons: TaxonRow[],
  kind: Kind,
  parentId: string | null
) {
  return taxons.filter(
    (row) =>
      row.kind === kind &&
      row.parent_id === parentId &&
      row.is_active
  );
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mtx-card">
      <div className="mtx-cardHead">
        <div>
          <div className="mtx-title">{props.title}</div>
          {props.subtitle ? <div className="mtx-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="mtx-right">{props.right}</div> : null}
      </div>
      <div className="mtx-cardBody">{props.children}</div>
    </section>
  );
}

export default function RentalsMappingAdmin() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [taxons, setTaxons] = useState<TaxonRow[]>([]);
  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [mappings, setMappings] = useState<PgAttrMapRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");

  const [mapAttrId, setMapAttrId] = useState("");
  const [mapSort, setMapSort] = useState(1000);
  const [mapRequired, setMapRequired] = useState(false);

  const types = useMemo(
    () => activeChildren(taxons, "type", null),
    [taxons]
  );

  const categories = useMemo(
    () => activeChildren(taxons, "category", typeId || null),
    [taxons, typeId]
  );

  const subcategories = useMemo(
    () =>
      activeChildren(
        taxons,
        "subcategory",
        categoryId || null
      ),
    [taxons, categoryId]
  );

  const productGroups = useMemo(
    () =>
      activeChildren(
        taxons,
        "product_group",
        subcategoryId || null
      ),
    [taxons, subcategoryId]
  );

  const pgAttrMap = useMemo(
    () =>
      mappings.filter(
        (row) => row.product_group_id === productGroupId
      ),
    [mappings, productGroupId]
  );

  const mappedAttrIds = useMemo(
    () =>
      new Set(
        pgAttrMap
          .filter((row) => row.is_active !== false)
          .map((row) => row.attribute_id)
      ),
    [pgAttrMap]
  );

  const selectedType =
    types.find((row) => row.id === typeId) || null;
  const selectedCategory =
    categories.find((row) => row.id === categoryId) || null;
  const selectedSubcategory =
    subcategories.find((row) => row.id === subcategoryId) || null;
  const selectedPG =
    productGroups.find((row) => row.id === productGroupId) || null;

  const mappingSupported = true;

  async function loadData(showLoading = false) {
    if (showLoading) setLoading(true);

    try {
      const payload = await apiRequest("GET");

      setAllowed(true);
      setRole(payload.role || null);
      setEmail(payload.email || null);
      setTaxons(payload.taxons || []);
      setAttributes(payload.attributes || []);
      setMappings(payload.mappings || []);
    } catch (error) {
      const problem = error as Error & { status?: number };

      if (
        problem.status === 401 ||
        problem.status === 403
      ) {
        setAllowed(false);
      }

      throw problem;
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setMsg(null);
        await loadData(true);
      } catch (error) {
        if (!alive) return;

        const problem = error as Error;
        setMsg(
          problem.message ||
            "Failed to load Rental Mapping."
        );
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setCategoryId("");
    setSubcategoryId("");
    setProductGroupId("");
    setMapAttrId("");
  }, [typeId]);

  useEffect(() => {
    setSubcategoryId("");
    setProductGroupId("");
    setMapAttrId("");
  }, [categoryId]);

  useEffect(() => {
    setProductGroupId("");
    setMapAttrId("");
  }, [subcategoryId]);

  useEffect(() => {
    setMapAttrId("");
  }, [productGroupId]);

  async function onMap() {
    setMsg(null);

    if (!productGroupId) {
      setMsg("Select a Product Group first.");
      return;
    }

    if (!mapAttrId) {
      setMsg("Select a Rental Attribute.");
      return;
    }

    if (mappedAttrIds.has(mapAttrId)) {
      setMsg(
        "This Rental Attribute is already actively mapped."
      );
      return;
    }

    setBusy(true);

    try {
      const payload = await apiRequest("POST", {
        product_group_id: productGroupId,
        attribute_id: mapAttrId,
        sort_order: mapSort,
        is_required: mapRequired,
      });

      await loadData();

      setMapAttrId("");
      setMapSort(1000);
      setMapRequired(false);

      setMsg(
        payload.action === "reactivated"
          ? "Rental Mapping activated."
          : "Rental Mapping created."
      );
    } catch (error) {
      const problem = error as Error;
      setMsg(
        problem.message ||
          "Rental Mapping could not be saved."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onEditMapping(
    row: PgAttrMapRow
  ) {
    setMsg(null);

    const sortText = window.prompt(
      "Enter the Rental Mapping sort order (0 to 1000000).",
      String(row.sort_order ?? 1000)
    );

    if (sortText === null) return;

    const sortOrder = Number(sortText);

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 1000000
    ) {
      setMsg(
        "Sort order must be a whole number from 0 to 1000000."
      );
      return;
    }

    const requirementText = window.prompt(
      "Enter required or optional.",
      row.is_required ? "required" : "optional"
    );

    if (requirementText === null) return;

    const requirement =
      requirementText.trim().toLowerCase();

    if (
      requirement !== "required" &&
      requirement !== "optional"
    ) {
      setMsg('Enter either "required" or "optional".');
      return;
    }

    setBusy(true);

    try {
      await apiRequest("PATCH", {
        id: row.id,
        sort_order: sortOrder,
        is_required: requirement === "required",
      });

      await loadData();
      setMsg("Rental Mapping settings updated.");
    } catch (error) {
      const problem = error as Error;
      setMsg(
        problem.message ||
          "Rental Mapping could not be updated."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onToggleMapping(
    row: PgAttrMapRow
  ) {
    setMsg(null);

    const activating = row.is_active === false;

    if (!activating) {
      const confirmed = window.confirm(
        "Deactivate this Rental Mapping? No historical mapping record will be deleted."
      );

      if (!confirmed) return;
    }

    setBusy(true);

    try {
      await apiRequest("PATCH", {
        id: row.id,
        is_active: activating,
        confirm: activating ? undefined : true,
      });

      await loadData();

      setMsg(
        activating
          ? "Rental Mapping activated."
          : "Rental Mapping deactivated. History was preserved."
      );
    } catch (error) {
      const problem = error as Error;
      setMsg(
        problem.message ||
          "Rental Mapping lifecycle could not be updated."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Rentals → Mapping" subtitle="Loading..." />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Rentals → Mapping" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Rentals → Mapping"
          subtitle={`Map Attributes to Product Groups (role: ${role ?? "—"})`}
        />

        <div className="mtx-topbar">
          <div className="mtx-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>

            <ActionButton href="/admin/dashboard/master-data/rentals/taxonomy" variant="secondary">
              Taxonomy
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/mapping" variant="secondary">
              Mapping
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/attributes" variant="secondary">
              Attributes
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/rentals/values" variant="secondary">
              Values
            </ActionButton>
          </div>

          <div className="mtx-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mtx-grid2">
          <CardBox
            title="Select Product Group"
            subtitle="Pick Type → Category → Subcategory → Product Group"
            right={
              <div className="mtx-chipCol">
                <span className="mtx-chip">{email ?? "—"}</span>
                <span className="mtx-chip subtle">role: {role ?? "—"}</span>
              </div>
            }
          >
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Type</span>
                <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                  <option value="">— Select Type —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Category</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!typeId}>
                  <option value="">{typeId ? "— Select Category —" : "Select a Type first"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Subcategory</span>
                <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
                  <option value="">{categoryId ? "— Select Subcategory —" : "Select a Category first"}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label className="mtx-field">
                <span>Product Group</span>
                <select value={productGroupId} onChange={(e) => setProductGroupId(e.target.value)} disabled={!subcategoryId}>
                  <option value="">{subcategoryId ? "— Select Product Group —" : "Select a Subcategory first"}</option>
                  {productGroups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mtx-selection">
                <div className="mtx-selectionHead">Current selection</div>
                <div className="mtx-pillRow">
                  <span className="mtx-pill">{selectedType ? `Type: ${selectedType.slug}` : "Type: —"}</span>
                  <span className="mtx-pill">{selectedCategory ? `Category: ${selectedCategory.slug}` : "Category: —"}</span>
                  <span className="mtx-pill">
                    {selectedSubcategory ? `Subcategory: ${selectedSubcategory.slug}` : "Subcategory: —"}
                  </span>
                  <span className="mtx-pill">{selectedPG ? `PG: ${selectedPG.slug}` : "PG: —"}</span>
                </div>
              </div>

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                Mapping table:{" "}
                <b>{mappingSupported === null ? "Select PG to check…" : mappingSupported ? "Detected ✅" : "Not found ⚠️"}</b>
              </div>
            </div>
          </CardBox>

          <CardBox title="Map Attribute → Product Group" subtitle={`Create rows in ${MAP_TABLE}`} right={<Badge>{MAP_TABLE}</Badge>}>
            {!productGroupId ? (
              <div className="mtx-empty">Select a Product Group first.</div>
            ) : !mappingSupported ? (
              <div className="mtx-empty">
                Mapping is disabled. Create/allow access to <b>{MAP_TABLE}</b> (and RLS) then refresh.
              </div>
            ) : (
              <div className="mtx-form">
                <label className="mtx-field">
                  <span>Attribute</span>
                  <select value={mapAttrId} onChange={(e) => setMapAttrId(e.target.value)} disabled={!productGroupId}>
                    <option value="">— Select Attribute —</option>
                    {attributes.filter((a) => a.is_active !== false).map((a) => (
                      <option key={a.id} value={a.id} disabled={mappedAttrIds.has(a.id)}>
                        {a.name} ({a.input_type}){mappedAttrIds.has(a.id) ? " — mapped" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mtx-twoCol">
                  <label className="mtx-field">
                    <span>Sort</span>
                    <input
                      type="number"
                      value={mapSort}
                      onChange={(e) => setMapSort(parseInt(e.target.value || "1", 10))}
                      disabled={!productGroupId}
                    />
                  </label>

                  <label className="mtx-checkRow">
                    <input
                      type="checkbox"
                      checked={mapRequired}
                      onChange={(e) => setMapRequired(e.target.checked)}
                      disabled={!productGroupId}
                    />
                    <span>Required</span>
                  </label>
                </div>

                <button className="mtx-primaryBtn" type="button" onClick={onMap} disabled={busy || !mapAttrId || !productGroupId}>
                  {busy ? "Saving..." : "Review and Map"}
                </button>

                <div className="mtx-divider" />

                <div className="mtx-title" style={{ fontSize: 14 }}>
                  Rental Attribute mappings (selected Product Group)
                </div>

                {pgAttrMap.length === 0 ? (
                  <div className="mtx-empty">No attributes mapped yet.</div>
                ) : (
                  <div className="mtx-list">
                    {pgAttrMap.slice(0, 120).map((r) => {
                      const a = attributes.find((x) => x.id === r.attribute_id) || null;
                      return (
                        <div key={r.id} className="mtx-row">
                          <div className="mtx-rowText">
                            <div className="mtx-rowName">{a ? a.name : r.attribute_id}</div>
                            <div className="mtx-rowSlug">
                              status: {r.is_active === false ? "inactive" : "active"} • sort: {r.sort_order ?? "-"} • required: {r.is_required ? "yes" : "no"}
                              {a ? ` • type: ${a.input_type}` : ""}
                            </div>
                          </div>
                          <div className="mtx-right">
                            <button
                              className="mtx-ghostBtn"
                              type="button"
                              onClick={() => onEditMapping(r)}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              className="mtx-ghostBtn"
                              type="button"
                              onClick={() => onToggleMapping(r)}
                              disabled={busy}
                            >
                              {r.is_active === false
                                ? "Activate"
                                : "Deactivate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Deactivation preserves the historical Rental Mapping. Product Group and Rental Attribute relationships remain permanently locked after creation.
                </div>
              </div>
            )}
          </CardBox>
        </div>
      </div>

      {/* SAME CSS */}
      <style jsx>{`
        .mtx-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin: 12px 0 16px;
        }
        .mtx-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mtx-status {
          display: flex;
          justify-content: flex-end;
          min-height: 24px;
        }
        .mtx-grid2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 980px) {
          .mtx-grid2 {
            grid-template-columns: 1fr 1fr;
          }
        }

        .mtx-card {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .mtx-cardHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 14px 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .mtx-cardBody {
          padding: 14px;
        }

        .mtx-title {
          font-size: 15px;
          font-weight: 800;
        }
        .mtx-subtitle {
          margin-top: 4px;
          font-size: 13px;
          opacity: 0.75;
          line-height: 1.35;
        }
        .mtx-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
        }

        .mtx-chipCol {
          display: grid;
          gap: 6px;
          justify-items: end;
        }
        .mtx-chip {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          white-space: nowrap;
        }
        .mtx-chip.subtle {
          opacity: 0.7;
        }

        .mtx-form {
          display: grid;
          gap: 12px;
        }

        .mtx-field {
          display: grid;
          gap: 6px;
        }
        .mtx-field > span {
          font-size: 12px;
          opacity: 0.75;
        }

        .mtx-field select,
        .mtx-field input {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 42px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          font-size: 14px;
          outline: none;
        }
        .mtx-field select:disabled,
        .mtx-field input:disabled {
          background: rgba(0, 0, 0, 0.03);
          opacity: 0.7;
        }
        .mtx-field select:focus,
        .mtx-field input:focus {
          border-color: rgba(0, 0, 0, 0.35);
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
        }

        .mtx-twoCol {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 760px) {
          .mtx-twoCol {
            grid-template-columns: 1fr 1fr;
          }
        }

        .mtx-checkRow {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 42px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
        }
        .mtx-checkRow input {
          width: 16px;
          height: 16px;
        }
        .mtx-checkRow span {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.9;
        }

        .mtx-primaryBtn {
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #111;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }
        .mtx-primaryBtn:disabled {
          background: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.35);
          cursor: not-allowed;
        }

        .mtx-ghostBtn {
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          background: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .mtx-ghostBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mtx-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 4px 0;
        }

        .mtx-list {
          display: grid;
          gap: 10px;
        }
        .mtx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.01);
        }
        .mtx-rowText {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .mtx-rowName {
          font-weight: 900;
          font-size: 13px;
          word-break: break-word;
        }
        .mtx-rowSlug {
          font-size: 12px;
          opacity: 0.75;
          word-break: break-word;
        }

        .mtx-empty {
          font-size: 13px;
          opacity: 0.7;
          padding: 4px 0;
        }

        .mtx-selection {
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.01);
        }
        .mtx-selectionHead {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.7;
          margin-bottom: 8px;
        }
        .mtx-pillRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .mtx-pill {
          font-size: 12px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          white-space: nowrap;
        }

        .mtx-footnote {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.7;
          text-align: right;
        }
      `}</style>
    </Container>
  );
}
