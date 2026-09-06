"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type TaxonKind = "type" | "category" | "subcategory" | "product_group";

type Taxon = {
  id: string;
  parent_id: string | null;
  kind: TaxonKind;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type Attribute = {
  id: string;
  name: string;
  slug: string;
  input_type: string;
  unit: string | null;
  scope: "global" | "product_specific";
  sort_order: number;
  is_active: boolean;
};

type SubcategoryMapping = {
  subcategory_id: string;
  product_group_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  listing_count: number;
};

type AttributeMapping = {
  product_group_id: string;
  attribute_id: string;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_group_listing_count: number;
};

type ApiData = {
  ok: boolean;
  error?: string;
  taxons: Taxon[];
  attributes: Attribute[];
  subcategory_product_groups: SubcategoryMapping[];
  product_group_attributes: AttributeMapping[];
  counts: {
    product_groups: number;
    active_product_groups: number;
    attributes: number;
    active_attributes: number;
    subcategory_mappings: number;
    active_subcategory_mappings: number;
    attribute_mappings: number;
    active_attribute_mappings: number;
    required_attribute_mappings: number;
    material_listings: number;
  };
};

const API = "/api/admin/material-mapping";

function inputTypeLabel(value: string) {
  if (value === "single_select") return "One controlled choice";
  if (value === "multi_select") return "Multiple controlled choices";
  if (value === "number") return "Measured number";
  if (value === "boolean") return "Yes or No";
  return "Text";
}

export default function MaterialsMappingPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");

  const [attributeId, setAttributeId] = useState("");
  const [sortOrder, setSortOrder] = useState(1000);
  const [isRequired, setIsRequired] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setError("");
    const response = await fetch(API, { cache: "no-store" });
    const result = (await response.json()) as ApiData;
    if (!response.ok || !result.ok) throw new Error(result.error || "Materials Mapping could not be loaded.");
    setData(result);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Materials Mapping could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const taxons = data?.taxons || [];
  const attributes = data?.attributes || [];
  const subcategoryMappings = data?.subcategory_product_groups || [];
  const attributeMappings = data?.product_group_attributes || [];

  const types = useMemo(
    () => taxons.filter((row) => row.kind === "type" && row.is_active),
    [taxons]
  );
  const categories = useMemo(
    () => taxons.filter((row) => row.kind === "category" && row.is_active && row.parent_id === typeId),
    [taxons, typeId]
  );
  const subcategories = useMemo(
    () => taxons.filter((row) => row.kind === "subcategory" && row.is_active && row.parent_id === categoryId),
    [taxons, categoryId]
  );
  const productGroups = useMemo(
    () => taxons.filter((row) => row.kind === "product_group" && row.is_active),
    [taxons]
  );

  const selectedSubcategoryMapping = subcategoryMappings.find(
    (row) => row.subcategory_id === subcategoryId
  );
  const effectiveProductGroupId =
    productGroupId ||
    (selectedSubcategoryMapping?.is_active ? selectedSubcategoryMapping.product_group_id : "");
  const effectiveProductGroup = taxons.find((row) => row.id === effectiveProductGroupId);

  const visibleAttributeMappings = attributeMappings.filter(
    (row) =>
      row.product_group_id === effectiveProductGroupId &&
      (showInactive || row.is_active)
  );
  const activeMappedAttributeIds = new Set(
    attributeMappings
      .filter((row) => row.product_group_id === effectiveProductGroupId && row.is_active)
      .map((row) => row.attribute_id)
  );
  const availableAttributes = attributes.filter(
    (row) => row.is_active && !activeMappedAttributeIds.has(row.id)
  );

  function taxonName(id: string) {
    return taxons.find((row) => row.id === id)?.name || "Unknown record";
  }
  function attributeName(id: string) {
    return attributes.find((row) => row.id === id)?.name || "Unknown Attribute";
  }

  async function send(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(API, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The Materials Mapping operation failed.");
      await load();
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function mapSubcategory() {
    if (!subcategoryId || !productGroupId) {
      setError("Choose both a Subcategory and a Product Group.");
      return;
    }
    try {
      const result = await send("POST", {
        action: "map_subcategory",
        subcategory_id: subcategoryId,
        product_group_id: productGroupId,
      });
      setNotice(result.action === "reactivated" ? "Relationship reactivated." : "Relationship created.");
      setProductGroupId("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Relationship could not be saved.");
    }
  }

  async function changeSubcategoryStatus(mapping: SubcategoryMapping) {
    const nextActive = !mapping.is_active;
    if (!nextActive) {
      const confirmed = window.confirm(
        `Deactivate the relationship from ${taxonName(mapping.subcategory_id)} to ${taxonName(mapping.product_group_id)}? No catalogue record will be deleted.`
      );
      if (!confirmed) return;
    }
    try {
      await send("PATCH", {
        action: "subcategory_status",
        subcategory_id: mapping.subcategory_id,
        is_active: nextActive,
        confirmed: !nextActive,
      });
      setNotice(nextActive ? "Relationship reactivated." : "Relationship deactivated and preserved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Relationship could not be changed.");
    }
  }

  async function mapAttribute() {
    if (!effectiveProductGroupId || !attributeId) {
      setError("Choose a Product Group and an Attribute.");
      return;
    }
    try {
      const result = await send("POST", {
        action: "map_attribute",
        product_group_id: effectiveProductGroupId,
        attribute_id: attributeId,
        sort_order: sortOrder,
        is_required: isRequired,
      });
      setNotice(result.action === "reactivated" ? "Attribute mapping reactivated." : "Attribute mapped.");
      setAttributeId("");
      setIsRequired(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Attribute could not be mapped.");
    }
  }

  async function changeAttributeMapping(
    mapping: AttributeMapping,
    changes: Record<string, unknown>
  ) {
    const deactivating = changes.is_active === false;
    if (deactivating) {
      const confirmed = window.confirm(
        `Deactivate ${attributeName(mapping.attribute_id)} for ${taxonName(mapping.product_group_id)}? It will be unavailable for new listing answers, but no record will be deleted.`
      );
      if (!confirmed) return;
    }
    try {
      await send("PATCH", {
        action: "attribute_mapping",
        product_group_id: mapping.product_group_id,
        attribute_id: mapping.attribute_id,
        ...changes,
        confirmed: deactivating,
      });
      setNotice(
        changes.is_active === false
          ? "Attribute mapping deactivated and preserved."
          : changes.is_active === true
            ? "Attribute mapping reactivated."
            : "Attribute mapping updated."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Attribute mapping could not be changed.");
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Materials → Mapping" subtitle="Loading controlled relationships…" />
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-5 py-6">
        <SectionHeader
          title="Materials → Mapping"
          subtitle="Connect catalogue structure and reusable specifications without deleting history."
        />

        <div className="flex flex-wrap gap-2">
          <ActionButton href="/admin/dashboard/master-data" variant="secondary">← Master Data</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/materials/taxonomy" variant="secondary">Taxonomy →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">Attributes →</ActionButton>
          <ActionButton href="/admin/dashboard/master-data/materials/values" variant="secondary">Values →</ActionButton>
        </div>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
          <h2 className="mb-1 font-semibold text-slate-900">How to use this page</h2>
          <p>
            Step 1 connects a detailed Materials Subcategory to one reusable Product Group. Step 2 chooses the active Product Group. Step 3 attaches reusable Materials Attributes and decides whether each answer is required on listings.
          </p>
        </section>

        {data ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>Product Groups {data.counts.product_groups}</Badge>
            <Badge>Subcategory relationships {data.counts.subcategory_mappings}</Badge>
            <Badge>Attribute mappings {data.counts.attribute_mappings}</Badge>
            <Badge>Required {data.counts.required_attribute_mappings}</Badge>
            <Badge>Listings {data.counts.material_listings}</Badge>
          </div>
        ) : null}

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div> : null}

        {!data ? (
          <EmptyState message="Materials Mapping could not be loaded." />
        ) : (
          <>
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Step 1 — Choose the Materials Subcategory</h2>
              <p className="mb-4 text-sm text-slate-600">Follow the catalogue hierarchy. Product Groups are reusable across suitable Subcategories.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm font-medium">
                  <span>Materials Type</span>
                  <select className="w-full rounded-lg border p-2" value={typeId} onChange={(event) => {
                    setTypeId(event.target.value);
                    setCategoryId("");
                    setSubcategoryId("");
                    setProductGroupId("");
                  }}>
                    <option value="">Select a Type</option>
                    {types.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Materials Category</span>
                  <select className="w-full rounded-lg border p-2" value={categoryId} disabled={!typeId} onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubcategoryId("");
                    setProductGroupId("");
                  }}>
                    <option value="">{typeId ? "Select a Category" : "Select a Type first"}</option>
                    {categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Materials Subcategory</span>
                  <select className="w-full rounded-lg border p-2" value={subcategoryId} disabled={!categoryId} onChange={(event) => {
                    setSubcategoryId(event.target.value);
                    setProductGroupId("");
                  }}>
                    <option value="">{categoryId ? "Select a Subcategory" : "Select a Category first"}</option>
                    {subcategories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </label>
              </div>

              {subcategoryId ? (
                <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                  {selectedSubcategoryMapping ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{taxonName(subcategoryId)} → {taxonName(selectedSubcategoryMapping.product_group_id)}</div>
                        <div className="text-sm text-slate-600">
                          {selectedSubcategoryMapping.is_active ? "Active permanent relationship" : "Inactive preserved relationship"} · Listings {selectedSubcategoryMapping.listing_count}
                        </div>
                      </div>
                      <button className="rounded-lg border px-3 py-2 text-sm font-semibold" disabled={busy} onClick={() => changeSubcategoryStatus(selectedSubcategoryMapping)}>
                        {selectedSubcategoryMapping.is_active ? "Deactivate relationship" : "Reactivate relationship"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <label className="space-y-1 text-sm font-medium">
                        <span>Reusable Product Group</span>
                        <select className="w-full rounded-lg border p-2" value={productGroupId} onChange={(event) => setProductGroupId(event.target.value)}>
                          <option value="">Select a Product Group</option>
                          {productGroups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                        </select>
                      </label>
                      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !productGroupId} onClick={mapSubcategory}>
                        Review and create relationship
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Step 2 — Choose the Product Group</h2>
              <p className="mb-4 text-sm text-slate-600">The Subcategory relationship selects its Product Group automatically. You may also inspect a Product Group directly.</p>
              <select className="w-full rounded-lg border p-2" value={effectiveProductGroupId} onChange={(event) => {
                setProductGroupId(event.target.value);
                setSubcategoryId("");
              }}>
                <option value="">Select or derive a Product Group</option>
                {productGroups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              {effectiveProductGroup ? <p className="mt-2 text-sm text-slate-600">Active Product Group: <strong>{effectiveProductGroup.name}</strong></p> : null}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Step 3 — Map a reusable Materials Attribute</h2>
              <p className="mb-4 text-sm text-slate-600">Map specifications such as Grade, Thickness, Weight, Colour or Finish. Required means a new listing must answer that specification.</p>
              {!effectiveProductGroupId ? (
                <EmptyState message="Choose a Product Group before mapping an Attribute." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium md:col-span-2">
                    <span>Materials Attribute</span>
                    <select className="w-full rounded-lg border p-2" value={attributeId} onChange={(event) => setAttributeId(event.target.value)}>
                      <option value="">Select an active reusable Attribute</option>
                      {availableAttributes.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} — {inputTypeLabel(row.input_type)}{row.unit ? ` (${row.unit})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium">
                    <span>Display order</span>
                    <input className="w-full rounded-lg border p-2" type="number" min={0} max={1000000} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
                    <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
                    Required on new Materials listings
                  </label>
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2" disabled={busy || !attributeId} onClick={mapAttribute}>
                    Review and create Attribute mapping
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Step 4 — Existing Attribute mappings</h2>
                  <p className="text-sm text-slate-600">Change display order, required status or lifecycle without changing permanent relationship identity.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
                  Show inactive
                </label>
              </div>

              {!effectiveProductGroupId || visibleAttributeMappings.length === 0 ? (
                <EmptyState message="No Attribute mappings are available for this Product Group selection." />
              ) : (
                <div className="space-y-3">
                  {visibleAttributeMappings.map((mapping) => {
                    const attribute = attributes.find((row) => row.id === mapping.attribute_id);
                    return (
                      <article key={`${mapping.product_group_id}:${mapping.attribute_id}`} className="rounded-xl border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{attribute?.name || "Unknown Attribute"}</div>
                            <div className="text-sm text-slate-600">
                              {inputTypeLabel(attribute?.input_type || "text")} · Order {mapping.sort_order} · {mapping.is_required ? "Required" : "Optional"} · Listings in group {mapping.product_group_listing_count}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{mapping.is_active ? "Active" : "Inactive and preserved"}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-lg border px-3 py-2 text-sm" disabled={busy || !mapping.is_active} onClick={() => changeAttributeMapping(mapping, { is_required: !mapping.is_required })}>
                              Make {mapping.is_required ? "optional" : "required"}
                            </button>
                            <button className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={() => changeAttributeMapping(mapping, { is_active: !mapping.is_active })}>
                              {mapping.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
          <h2 className="mb-1 font-semibold text-slate-900">Human First. AI Second. Precision Always.</h2>
          <p>Mapping is an administrator-reviewed structural decision. Product Group and Attribute identities lock after creation. Deactivation preserves history; no Mapping page action permanently deletes catalogue or listing records.</p>
        </section>
      </div>
    </Container>
  );
}
