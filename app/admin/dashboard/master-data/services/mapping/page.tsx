// app/admin/dashboard/master-data/services/mapping/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

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
  source?: string | null;
};

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean";
type Scope = "global" | "product_specific";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  scope: Scope;
};

type JoinedAttr =
  | Pick<AttrRow, "id" | "name" | "slug" | "input_type" | "unit">
  | Pick<AttrRow, "id" | "name" | "slug" | "input_type" | "unit">[]
  | null
  | undefined;

type PgAttrMapRow = {
  product_group_id: string;
  attribute_id: string;
  sort_order: number;
  is_required: boolean;
  service_attributes?: JoinedAttr; // hydrated client-side
};

type SubcatPgMapRow = {
  subcategory_id: string;
  product_group_id: string;
};

/** ✅ Change these only if your table names differ */
const TAXON_TABLE = "service_taxons" as const;
const ATTR_TABLE = "service_attributes" as const;
const PG_ATTR_TABLE = "service_product_group_attributes" as const;
const SC_PG_TABLE = "service_subcategory_product_groups" as const;
const ADMIN_ROLE = "services_admin" as const;

function normalizeJoinedAttr(
  j: JoinedAttr
): Pick<AttrRow, "id" | "name" | "slug" | "input_type" | "unit"> | null {
  if (!j) return null;
  if (Array.isArray(j)) return j[0] ?? null;
  return j;
}

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}
function isModuleAdmin(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

function formatSbError(e: any) {
  const msg = e?.message || "Unknown error";
  const code = e?.code ? ` (code: ${e.code})` : "";
  const details = e?.details ? ` • ${e.details}` : "";
  const hint = e?.hint ? ` • hint: ${e.hint}` : "";
  return `${msg}${code}${details}${hint}`;
}

async function requireModuleAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null };

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profErr) throw profErr;

  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isModuleAdmin(role);
  return { ok, role };
}

async function fetchChildren(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  kind: Kind,
  parentId: string | null
) {
  const q = supabase
    .from(TAXON_TABLE)
    .select("id,parent_id,kind,name,slug,sort_order,is_active,source")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (parentId === null) q.is("parent_id", null);
  else q.eq("parent_id", parentId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function fetchAllByKind(supabase: ReturnType<typeof getSupabaseBrowser>, kind: Kind) {
  const { data, error } = await supabase
    .from(TAXON_TABLE)
    .select("id,parent_id,kind,name,slug,sort_order,is_active,source")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data, error } = await supabase
    .from(ATTR_TABLE)
    .select("id,name,slug,input_type,unit,sort_order,is_active,scope")
    .eq("is_active", true)
    .eq("scope", "global") // ✅ mapping dropdown shows only GLOBAL attributes (same as Materials)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as AttrRow[];
}

async function fetchMappedAttributesRaw(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  productGroupId: string
) {
  const { data, error } = await supabase
    .from(PG_ATTR_TABLE)
    .select("product_group_id,attribute_id,sort_order,is_required")
    .eq("product_group_id", productGroupId)
    .order("sort_order", { ascending: true })
    .order("attribute_id", { ascending: true });

  if (error) throw error;
  return (data || []) as PgAttrMapRow[];
}

async function fetchSubcatPgMappings(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  subcategoryIds: string[]
): Promise<SubcatPgMapRow[]> {
  if (!subcategoryIds.length) return [];
  const { data, error } = await supabase
    .from(SC_PG_TABLE)
    .select("subcategory_id,product_group_id")
    .in("subcategory_id", subcategoryIds);

  if (error) throw error;
  return (data || []) as SubcatPgMapRow[];
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sxm-card">
      <div className="sxm-cardHead">
        <div>
          <div className="sxm-title">{props.title}</div>
          {props.subtitle ? <div className="sxm-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="sxm-right">{props.right}</div> : null}
      </div>
      <div className="sxm-cardBody">{props.children}</div>
    </section>
  );
}

export default function ServicesMappingAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [allProductGroups, setAllProductGroups] = useState<TaxonRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  // Advanced override (direct product group select)
  const [productGroupId, setProductGroupId] = useState("");

  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [mapped, setMapped] = useState<PgAttrMapRow[]>([]);

  const [mapAttrId, setMapAttrId] = useState("");
  const [mapSort, setMapSort] = useState<number>(1);
  const [mapRequired, setMapRequired] = useState<boolean>(false);

  // inline edit
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editSort, setEditSort] = useState<number>(1);
  const [editRequired, setEditRequired] = useState<boolean>(false);

  // Step B mapping controls
  const [scMapSubcategoryId, setScMapSubcategoryId] = useState("");
  const [scMapProductGroupId, setScMapProductGroupId] = useState("");
  const [scMappings, setScMappings] = useState<SubcatPgMapRow[]>([]);

  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId) || null;
  const selectedProductGroup = allProductGroups.find((p) => p.id === productGroupId) || null;

  const scLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of scMappings) m.set(row.subcategory_id, row.product_group_id);
    return m;
  }, [scMappings]);

  const mappedPgForSelectedSubcategory = useMemo(() => {
    if (!subcategoryId) return "";
    return scLookup.get(subcategoryId) || "";
  }, [scLookup, subcategoryId]);

  const mappedPgForStepBSelectedSubcategory = useMemo(() => {
    if (!scMapSubcategoryId) return "";
    return scLookup.get(scMapSubcategoryId) || "";
  }, [scLookup, scMapSubcategoryId]);

  const mappedPgNameForSubcategory = useMemo(() => {
    if (!mappedPgForSelectedSubcategory) return null;
    return allProductGroups.find((p) => p.id === mappedPgForSelectedSubcategory) || null;
  }, [allProductGroups, mappedPgForSelectedSubcategory]);

  const effectiveProductGroupId = useMemo(() => {
    if (!typeId) return "";
    if (!categoryId) return "";
    if (productGroupId) return productGroupId;
    if (subcategoryId && mappedPgForSelectedSubcategory) return mappedPgForSelectedSubcategory;
    return "";
  }, [typeId, categoryId, subcategoryId, productGroupId, mappedPgForSelectedSubcategory]);

  const effectiveLabel = useMemo(() => {
    if (!typeId) return "Select Type";
    if (!categoryId) return "Select Category";
    if (productGroupId && selectedProductGroup) return `Product Group (Advanced): ${selectedProductGroup.name}`;
    if (subcategoryId && selectedSubcategory) {
      if (mappedPgNameForSubcategory) return `Subcategory: ${selectedSubcategory.name} → Product Group: ${mappedPgNameForSubcategory.name}`;
      return `Subcategory: ${selectedSubcategory.name} (NOT mapped to a Product Group yet)`;
    }
    return selectedCategory ? `Category: ${selectedCategory.name} (Select a Subcategory)` : "Category";
  }, [typeId, categoryId, subcategoryId, productGroupId, selectedCategory, selectedSubcategory, selectedProductGroup, mappedPgNameForSubcategory]);

  const pgSelectDisabled = !categoryId;

  const scNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subcategories) m.set(s.id, s.name);
    return m;
  }, [subcategories]);

  const pgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProductGroups) m.set(p.id, p.name);
    return m;
  }, [allProductGroups]);

  const scMappingsSorted = useMemo(() => {
    const arr = [...scMappings];
    arr.sort((a, b) => {
      const an = scNameById.get(a.subcategory_id) || a.subcategory_id;
      const bn = scNameById.get(b.subcategory_id) || b.subcategory_id;
      return an.localeCompare(bn);
    });
    return arr;
  }, [scMappings, scNameById]);

  const attrById = useMemo(() => {
    const m = new Map<string, AttrRow>();
    for (const a of attributes) m.set(a.id, a);
    return m;
  }, [attributes]);

  const mappedDisplay = useMemo(() => {
    return mapped.map((m) => {
      const a = attrById.get(m.attribute_id);
      return {
        ...m,
        service_attributes: a ? { id: a.id, name: a.name, slug: a.slug, input_type: a.input_type, unit: a.unit } : null,
      } as PgAttrMapRow;
    });
  }, [mapped, attrById]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await requireModuleAdmin(supabase);
        if (!alive) return;

        setAdminOk(a.ok);
        setRole(a.role);

        if (!a.ok) {
          router.replace("/admin/dashboard");
          return;
        }

        const t = await fetchChildren(supabase, "type", null);
        const attrs = await fetchAttributes(supabase);
        const pgs = await fetchAllByKind(supabase, "product_group");

        if (!alive) return;
        setTypes(t);
        setAttributes(attrs);
        setAllProductGroups(pgs);

        if (!attrs || attrs.length === 0) {
          setMsg(
            "No attributes returned from service_attributes (global only). Check: table has rows + RLS SELECT for admin + scope values."
          );
        }

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load Services mapping page.");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // load categories on type
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategories([]);
      setSubcategories([]);
      setScMappings([]);
      setCategoryId("");
      setSubcategoryId("");
      setProductGroupId("");
      setMapped([]);

      setScMapSubcategoryId("");
      setScMapProductGroupId("");

      if (!typeId) return;
      try {
        const c = await fetchChildren(supabase, "category", typeId);
        if (!alive) return;
        setCategories(c);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load categories.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [typeId, supabase]);

  // load subcategories + step-b mappings
  useEffect(() => {
    let alive = true;
    (async () => {
      setSubcategories([]);
      setScMappings([]);
      setSubcategoryId("");
      setProductGroupId("");
      setMapped([]);

      setScMapSubcategoryId("");
      setScMapProductGroupId("");

      if (!categoryId) return;

      try {
        const s = await fetchChildren(supabase, "subcategory", categoryId);
        if (!alive) return;
        setSubcategories(s);

        const subIds = (s || []).map((x) => x.id);
        const maps = await fetchSubcatPgMappings(supabase, subIds);
        if (!alive) return;
        setScMappings(maps);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(
          `Failed to load subcategories / Step-B mappings: ${formatSbError(e)}. Check table ${SC_PG_TABLE} + RLS SELECT.`
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [categoryId, supabase]);

  // sync step-b selector with main subcategory
  useEffect(() => {
    if (!subcategoryId) return;
    setScMapSubcategoryId(subcategoryId);
  }, [subcategoryId]);

  // auto-fill step-b product group
  useEffect(() => {
    if (!scMapSubcategoryId) {
      setScMapProductGroupId("");
      return;
    }
    const existing = scLookup.get(scMapSubcategoryId) || "";
    setScMapProductGroupId(existing);
  }, [scMapSubcategoryId, scLookup]);

  async function refreshMappedAttributes(productGroupIdToLoad: string) {
    const m = await fetchMappedAttributesRaw(supabase, productGroupIdToLoad);
    setMapped(m);
    const max = m.reduce((acc, x) => Math.max(acc, x.sort_order ?? 0), 0);
    setMapSort((max || 0) + 1);
  }

  // load mapped attributes whenever effective pg changes
  useEffect(() => {
    let alive = true;
    (async () => {
      setMapped([]);
      setMapAttrId("");
      setMapSort(1);
      setMapRequired(false);
      setEditKey(null);

      if (!effectiveProductGroupId) return;

      try {
        const m = await fetchMappedAttributesRaw(supabase, effectiveProductGroupId);
        if (!alive) return;
        setMapped(m);

        const max = m.reduce((acc, x) => Math.max(acc, x.sort_order ?? 0), 0);
        setMapSort((max || 0) + 1);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(
          `Failed to load mapped attributes: ${formatSbError(e)}. If you can INSERT but cannot see rows, check RLS SELECT on ${PG_ATTR_TABLE}.`
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [effectiveProductGroupId, supabase]);

  const mappedAttrIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of mapped) if (m?.attribute_id) s.add(m.attribute_id);
    return s;
  }, [mapped]);

  const availableAttributes = useMemo(() => attributes, [attributes]);

  async function refreshStepBMappings() {
    const subIds = subcategories.map((x) => x.id);
    const maps = await fetchSubcatPgMappings(supabase, subIds);
    setScMappings(maps);
  }

  async function onUpsertSubcategoryProductGroup() {
    setMsg(null);

    if (!typeId) return setMsg("Select a Type first.");
    if (!categoryId) return setMsg("Select a Category first.");
    if (!scMapSubcategoryId) return setMsg("Select a Subcategory to map.");
    if (!scMapProductGroupId) return setMsg("Select a Product Group to map to.");

    const sc = subcategories.find((x) => x.id === scMapSubcategoryId);
    if (!sc || sc.kind !== "subcategory") return setMsg("Invalid subcategory selected.");
    const pg = allProductGroups.find((x) => x.id === scMapProductGroupId);
    if (!pg || pg.kind !== "product_group") return setMsg("Invalid product group selected.");

    setBusy(true);
    try {
      const { error } = await supabase
        .from(SC_PG_TABLE)
        .upsert(
          { subcategory_id: scMapSubcategoryId, product_group_id: scMapProductGroupId },
          { onConflict: "subcategory_id" }
        );

      if (error) throw error;

      await refreshStepBMappings();
      setMsg("Subcategory → Product Group mapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(`Step-B mapping failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onUnmapSubcategoryProductGroup(subcategory_id: string) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from(SC_PG_TABLE).delete().eq("subcategory_id", subcategory_id);
      if (error) throw error;

      await refreshStepBMappings();
      setMsg("Step-B mapping removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(`Unmap failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onMapAttribute() {
    setMsg(null);

    if (!typeId) return setMsg("Select a Type first.");
    if (!categoryId) return setMsg("Select a Category first.");

    if (!effectiveProductGroupId) {
      if (subcategoryId && !mappedPgForSelectedSubcategory && !productGroupId) {
        return setMsg("This Subcategory is not mapped to any Product Group yet. Complete Step-B first.");
      }
      return setMsg("Select Subcategory (and ensure Step-B mapping) or choose a Product Group (Advanced).");
    }

    if (!mapAttrId) return setMsg("Select an attribute to map.");

    if (mappedAttrIds.has(mapAttrId)) {
      return setMsg("This attribute is already mapped to the active Product Group.");
    }

    setBusy(true);
    try {
      const { error } = await supabase.from(PG_ATTR_TABLE).insert({
        product_group_id: effectiveProductGroupId,
        attribute_id: mapAttrId,
        sort_order: Number.isFinite(mapSort) ? mapSort : 1,
        is_required: mapRequired,
      });

      if (error) throw error;

      await refreshMappedAttributes(effectiveProductGroupId);

      setMapAttrId("");
      setMapRequired(false);
      setMsg("Mapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(
        `Mapping failed: ${formatSbError(e)}. If insert works but list stays 0, check RLS SELECT on ${PG_ATTR_TABLE}.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function onUnmapAttribute(row: PgAttrMapRow) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase
        .from(PG_ATTR_TABLE)
        .delete()
        .eq("product_group_id", row.product_group_id)
        .eq("attribute_id", row.attribute_id);

      if (error) throw error;

      await refreshMappedAttributes(row.product_group_id);
      setMsg("Unmapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(`Unmap failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: PgAttrMapRow) {
    const key = `${row.product_group_id}:${row.attribute_id}`;
    setEditKey(key);
    setEditSort(row.sort_order ?? 1);
    setEditRequired(!!row.is_required);
  }

  function cancelEdit() {
    setEditKey(null);
    setEditSort(1);
    setEditRequired(false);
  }

  async function saveEdit(row: PgAttrMapRow) {
    setMsg(null);
    const nextSort = Number.isFinite(editSort) ? editSort : 1;
    const nextReq = !!editRequired;

    setBusy(true);
    try {
      const { error } = await supabase
        .from(PG_ATTR_TABLE)
        .update({ sort_order: nextSort, is_required: nextReq })
        .eq("product_group_id", row.product_group_id)
        .eq("attribute_id", row.attribute_id);

      if (error) throw error;

      await refreshMappedAttributes(row.product_group_id);
      setMsg("Updated ✅");
      cancelEdit();
    } catch (e: any) {
      console.error(e);
      setMsg(`Update failed: ${formatSbError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Services → Mapping" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Services → Mapping" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="sxm-page">
        <SectionHeader
          title="Services → Product → Variations Mapping"
          subtitle={`Step B: Subcategory → Product Group • Attributes map to Product Group (role: ${role ?? "—"})`}
        />

        <div className="sxm-topbar">
          <div className="sxm-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/services/taxonomy" variant="secondary">
              Taxonomy Manager
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/services/attributes" variant="secondary">
              Attributes Manager
            </ActionButton>
          </div>
          <div className="sxm-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="sxm-grid2">
          <CardBox
            title="Select context"
            subtitle="Pick Type → Category → Subcategory. Step B decides which Product Group the Subcategory belongs to. (Advanced: choose a Product Group directly.)"
            right={<Badge>{TAXON_TABLE}</Badge>}
          >
            <div className="sxm-form">
              <label className="sxm-field">
                <span>Type</span>
                <select
                  value={typeId}
                  onChange={(e) => {
                    setTypeId(e.target.value);
                    setMsg(null);
                  }}
                >
                  <option value="">— Select Type —</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sxm-field">
                <span>Category</span>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setMsg(null);
                  }}
                  disabled={!typeId}
                >
                  <option value="">{typeId ? "— Select Category —" : "Select Type first"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sxm-field">
                <span>Subcategory</span>
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setProductGroupId("");
                    setMsg(null);
                  }}
                  disabled={!categoryId}
                >
                  <option value="">{categoryId ? "— Select Subcategory —" : "Select Category first"}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sxm-field">
                <span>
                  Product Group <span className="sxm-advancedBadge">Advanced override</span>
                </span>
                <select
                  value={productGroupId}
                  onChange={(e) => {
                    setProductGroupId(e.target.value);
                    setMsg(null);
                  }}
                  disabled={pgSelectDisabled}
                  className={pgSelectDisabled ? "advanced-disabled" : ""}
                >
                  <option value="">
                    {categoryId ? `— Select Product Group (${allProductGroups.length}) — (optional)` : "Select Category first"}
                  </option>
                  {allProductGroups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sxm-hint">
                <b>Active context:</b> {effectiveLabel}
                <div style={{ marginTop: 8, opacity: 0.85 }}>
                  Attribute mappings write to <b>{PG_ATTR_TABLE}.product_group_id</b> (must be <b>kind=product_group</b>).
                </div>
              </div>
            </div>
          </CardBox>

          <CardBox title="Map attribute" subtitle="Attach an attribute to the active Product Group." right={<Badge>{PG_ATTR_TABLE}</Badge>}>
            {!categoryId ? (
              <div className="sxm-empty">Select Type + Category first.</div>
            ) : !effectiveProductGroupId ? (
              <div className="sxm-empty">
                Select a Subcategory and complete <b>Step B</b> mapping (or pick a Product Group in Advanced).
              </div>
            ) : (
              <div className="sxm-form">
                <label className="sxm-field">
                  <span>Attribute</span>

                  {attributes.length === 0 ? (
                    <div className="sxm-empty" style={{ marginTop: 6 }}>
                      No attributes loaded. Check <b>{ATTR_TABLE}</b> data + RLS + scope filter.
                    </div>
                  ) : null}

                  <select value={mapAttrId} onChange={(e) => setMapAttrId(e.target.value)}>
                    <option value="">— Select Attribute —</option>
                    {availableAttributes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.input_type}) — {a.slug}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sxm-twoCol">
                  <label className="sxm-field">
                    <span>Sort order</span>
                    <input type="number" value={mapSort} onChange={(e) => setMapSort(parseInt(e.target.value || "1", 10))} />
                  </label>

                  <label className="sxm-field" style={{ alignContent: "end" }}>
                    <span>Required</span>
                    <div className="sxm-checkRow">
                      <input type="checkbox" checked={mapRequired} onChange={(e) => setMapRequired(e.target.checked)} />
                      <span>Yes, required</span>
                    </div>
                  </label>
                </div>

                <button className="sxm-primaryBtn" type="button" onClick={onMapAttribute} disabled={busy || !mapAttrId}>
                  {busy ? "Saving..." : "Map"}
                </button>
              </div>
            )}
          </CardBox>
        </div>

        <div className="sxm-grid2 sxm-mt">
          <CardBox
            title="Step B — Map Subcategory → Product Group"
            subtitle={`Each Subcategory maps to exactly one Product Group using ${SC_PG_TABLE} (UPSERT on subcategory_id).`}
            right={<Badge>{SC_PG_TABLE}</Badge>}
          >
            {!categoryId ? (
              <div className="sxm-empty">Select Type + Category to load Subcategories.</div>
            ) : (
              <div className="sxm-form">
                <label className="sxm-field">
                  <span>Subcategory (kind=subcategory)</span>
                  <select value={scMapSubcategoryId} onChange={(e) => setScMapSubcategoryId(e.target.value)} disabled={!subcategories.length}>
                    <option value="">{subcategories.length ? `— Select Subcategory (${subcategories.length}) —` : "No subcategories in this category"}</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sxm-field">
                  <span>Product Group (kind=product_group)</span>
                  <select value={scMapProductGroupId} onChange={(e) => setScMapProductGroupId(e.target.value)} disabled={!scMapSubcategoryId}>
                    <option value="">{scMapSubcategoryId ? `— Select Product Group (${allProductGroups.length}) —` : "Select Subcategory first"}</option>
                    {allProductGroups.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sxm-hint">
                  <b>UPSERT rule:</b> on conflict (<b>subcategory_id</b>) do update set <b>product_group_id</b>.
                  <div style={{ marginTop: 8, opacity: 0.85 }}>
                    Current mapping for selected subcategory:{" "}
                    <b>{mappedPgForStepBSelectedSubcategory ? pgNameById.get(mappedPgForStepBSelectedSubcategory) || mappedPgForStepBSelectedSubcategory : "— none —"}</b>
                  </div>
                </div>

                <div className="sxm-rowBtns">
                  <button className="sxm-primaryBtn" type="button" onClick={onUpsertSubcategoryProductGroup} disabled={busy || !scMapSubcategoryId || !scMapProductGroupId}>
                    {busy ? "Saving..." : "Save mapping"}
                  </button>

                  {scMapSubcategoryId && scLookup.get(scMapSubcategoryId) ? (
                    <button className="sxm-ghostBtn" type="button" onClick={() => onUnmapSubcategoryProductGroup(scMapSubcategoryId)} disabled={busy}>
                      Remove mapping
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </CardBox>

          <CardBox
            title="Existing Step-B mappings"
            subtitle={categoryId ? `Mapped in this Category: ${scMappings.length} / ${subcategories.length}` : "Select Category to view mappings."}
            right={<span className="sxm-count">{scMappings.length}</span>}
          >
            {!categoryId ? (
              <div className="sxm-empty">Select Type + Category.</div>
            ) : subcategories.length === 0 ? (
              <div className="sxm-empty">No subcategories found for this category.</div>
            ) : scMappings.length === 0 ? (
              <div className="sxm-empty">No Step-B mappings yet. Map a Subcategory to a Product Group.</div>
            ) : (
              <div className="sxm-list">
                {scMappingsSorted.map((r) => {
                  const scName = scNameById.get(r.subcategory_id) || r.subcategory_id;
                  const pgName = pgNameById.get(r.product_group_id) || r.product_group_id;

                  return (
                    <div key={r.subcategory_id} className="sxm-row">
                      <div className="sxm-rowText">
                        <div className="sxm-rowName">
                          {scName}
                          <span className="sxm-pill">→ {pgName}</span>
                        </div>
                        <div className="sxm-rowMeta">
                          subcategory_id {r.subcategory_id} • product_group_id {r.product_group_id}
                        </div>
                      </div>

                      <div className="sxm-rowBtns">
                        <button
                          className="sxm-ghostBtn"
                          onClick={() => {
                            setScMapSubcategoryId(r.subcategory_id);
                            setScMapProductGroupId(r.product_group_id);
                            setMsg(null);
                          }}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button className="sxm-ghostBtn" onClick={() => onUnmapSubcategoryProductGroup(r.subcategory_id)} disabled={busy}>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBox>
        </div>

        <div className="sxm-grid2 sxm-mt">
          <CardBox
            title="Mapped attributes"
            subtitle={effectiveProductGroupId ? `Total mapped: ${mapped.length}` : "Resolve Product Group via Step B (or Advanced) to view mapping."}
            right={<span className="sxm-count">{mapped.length}</span>}
          >
            {!categoryId ? (
              <div className="sxm-empty">Select Type + Category.</div>
            ) : !effectiveProductGroupId ? (
              <div className="sxm-empty">Select Subcategory and complete Step B (or choose Product Group in Advanced).</div>
            ) : mapped.length === 0 ? (
              <div className="sxm-empty">No attributes mapped yet.</div>
            ) : (
              <div className="sxm-list">
                {mappedDisplay.map((m) => {
                  const a = normalizeJoinedAttr(m.service_attributes);
                  const key = `${m.product_group_id}:${m.attribute_id}`;
                  const isEditing = editKey === key;

                  return (
                    <div key={key} className="sxm-row">
                      <div className="sxm-rowText">
                        <div className="sxm-rowName">
                          {a ? a.name : m.attribute_id}
                          {m.is_required ? <span className="sxm-pill">required</span> : null}
                        </div>

                        <div className="sxm-rowMeta">
                          sort {m.sort_order}
                          {a ? ` • ${a.input_type} • ${a.slug}${a.unit ? ` • unit ${a.unit}` : ""}` : ""}
                        </div>

                        {isEditing ? (
                          <div className="sxm-editBox">
                            <label className="sxm-miniField">
                              <span>Sort</span>
                              <input type="number" value={editSort} onChange={(e) => setEditSort(parseInt(e.target.value || "1", 10))} />
                            </label>

                            <label className="sxm-miniField">
                              <span>Required</span>
                              <div className="sxm-checkRow" style={{ height: 40 }}>
                                <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                                <span>Yes</span>
                              </div>
                            </label>
                          </div>
                        ) : null}
                      </div>

                      <div className="sxm-rowBtns">
                        {isEditing ? (
                          <>
                            <button className="sxm-ghostBtn" onClick={() => saveEdit(m)} disabled={busy}>
                              Save
                            </button>
                            <button className="sxm-ghostBtn" onClick={cancelEdit} disabled={busy}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="sxm-ghostBtn" onClick={() => startEdit(m)} disabled={busy}>
                              Edit
                            </button>
                            <button className="sxm-ghostBtn" onClick={() => onUnmapAttribute(m)} disabled={busy}>
                              Unmap
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBox>

          <CardBox title="Rule reminder" subtitle="Same rule as Materials" right={<Badge>Architecture</Badge>}>
            <div className="sxm-hint">
              Keep <b>variations</b> as <b>attribute values</b> (not separate product groups).
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Example: “Legal Service” → product group “Legal” and variations like “Registration / Documentation / Consultation” are attribute values.
              </div>
            </div>
          </CardBox>
        </div>

        <style jsx>{`
          .sxm-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin: 12px 0 16px;
          }
          .sxm-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .sxm-status {
            display: flex;
            justify-content: flex-end;
            min-height: 24px;
          }

          .sxm-grid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .sxm-mt {
            margin-top: 14px;
          }
          @media (min-width: 980px) {
            .sxm-grid2 {
              grid-template-columns: 1fr 1fr;
            }
          }

          .sxm-card {
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          .sxm-cardHead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 14px 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }
          .sxm-cardBody {
            padding: 14px;
          }

          .sxm-title {
            font-size: 15px;
            font-weight: 800;
          }
          .sxm-subtitle {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.75;
            line-height: 1.35;
          }

          .sxm-count {
            display: inline-flex;
            min-width: 34px;
            height: 28px;
            padding: 0 10px;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.06);
            font-weight: 800;
            font-size: 13px;
          }

          .sxm-form {
            display: grid;
            gap: 12px;
          }

          .sxm-field {
            display: grid;
            gap: 6px;
          }
          .sxm-field > span {
            font-size: 12px;
            opacity: 0.75;
          }

          .sxm-field select,
          .sxm-field input {
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

          .sxm-twoCol {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 760px) {
            .sxm-twoCol {
              grid-template-columns: 1fr 1fr;
            }
          }

          .sxm-checkRow {
            height: 42px;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 0 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #fff;
            font-size: 14px;
          }

          .sxm-primaryBtn {
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #111;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
            padding: 0 14px;
          }
          .sxm-primaryBtn:disabled {
            background: rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.35);
            cursor: not-allowed;
          }

          .sxm-empty {
            font-size: 14px;
            opacity: 0.75;
          }

          .sxm-list {
            display: grid;
            gap: 10px;
          }
          .sxm-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .sxm-rowText {
            min-width: 0;
            flex: 1;
          }
          .sxm-rowName {
            font-weight: 800;
            font-size: 14px;
            line-height: 1.2;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .sxm-rowMeta {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 520px;
          }

          .sxm-pill {
            font-size: 12px;
            padding: 5px 10px;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(0, 0, 0, 0.02);
            white-space: nowrap;
          }

          .sxm-advancedBadge {
            display: inline-block;
            margin-left: 6px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 800;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.08);
            opacity: 0.75;
            white-space: nowrap;
          }

          .sxm-rowBtns {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
          }

          .sxm-ghostBtn {
            height: 36px;
            padding: 0 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
          }
          .sxm-ghostBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .sxm-hint {
            border: 1px dashed rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.45;
          }

          .sxm-editBox {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 10px;
            margin-top: 10px;
            align-items: end;
          }
          .sxm-miniField {
            display: grid;
            gap: 6px;
          }
          .sxm-miniField > span {
            font-size: 12px;
            opacity: 0.75;
          }
          .sxm-miniField input {
            height: 40px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #fff;
            font-size: 14px;
          }

          .sxm-field select.advanced-disabled {
            background: rgba(0, 0, 0, 0.03);
            opacity: 0.55;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </Container>
  );
}
