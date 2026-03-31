// app/admin/dashboard/master-data/materials/mapping/page.tsx
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
};

type AttrInputType = "single_select" | "multi_select" | "text" | "number" | "boolean";

type AttrRow = {
  id: string;
  name: string;
  slug: string;
  input_type: AttrInputType;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
  scope?: "global" | "product_specific"; // ✅ add this
};


// PostgREST join can be object (many-to-one) OR array in some configs.
// We tolerate both to avoid TS + runtime surprises.
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
  // We will hydrate this client-side from attributes[] to avoid fragile PostgREST embedded joins
  material_attributes?: JoinedAttr;
};

type SubcatPgMapRow = {
  subcategory_id: string;
  product_group_id: string;
};

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
function isMaterialsAdmin(role: string | null | undefined) {
  return role === "materials_admin";
}

function formatSbError(e: any) {
  const msg = e?.message || "Unknown error";
  const code = e?.code ? ` (code: ${e.code})` : "";
  const details = e?.details ? ` • ${e.details}` : "";
  const hint = e?.hint ? ` • hint: ${e.hint}` : "";
  return `${msg}${code}${details}${hint}`;
}

async function requireMaterialsAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
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
  const ok = isMaster(role) || isMaterialsAdmin(role);
  return { ok, role };
}

async function fetchChildren(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  kind: Kind,
  parentId: string | null
) {
  const q = supabase
    .from("material_taxons")
    .select("id,parent_id,kind,name,slug,sort_order,is_active")
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
    .from("material_taxons")
    .select("id,parent_id,kind,name,slug,sort_order,is_active")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data, error } = await supabase
    .from("material_attributes")
    .select("id,name,slug,input_type,unit,sort_order,is_active,scope")
    .eq("is_active", true)
    .eq("scope", "global") // ✅ ONLY GLOBAL ATTRIBUTES IN MAPPING DROPDOWN
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as AttrRow[];
}



/**
 * ✅ FIX: do NOT use embedded join `material_attributes(...)` here.
 * That embed requires a correctly named FK relationship in PostgREST and also SELECT RLS
 * alignment across both tables. If embed fails or is filtered, mapped list appears as 0 / broken.
 *
 * Instead, fetch mapping rows only, then hydrate attribute display from already loaded attributes[].
 */
async function fetchMappedAttributesRaw(supabase: ReturnType<typeof getSupabaseBrowser>, productGroupId: string) {
  const { data, error } = await supabase
    .from("material_product_group_attributes")
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
    .from("material_subcategory_product_groups")
    .select("subcategory_id,product_group_id")
    .in("subcategory_id", subcategoryIds);

  if (error) throw error;
  return (data || []) as SubcatPgMapRow[];
}

function CardBox(props: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mxm-card">
      <div className="mxm-cardHead">
        <div>
          <div className="mxm-title">{props.title}</div>
          {props.subtitle ? <div className="mxm-subtitle">{props.subtitle}</div> : null}
        </div>
        {props.right ? <div className="mxm-right">{props.right}</div> : null}
      </div>
      <div className="mxm-cardBody">{props.children}</div>
    </section>
  );
}

export default function MaterialsMappingAdmin() {
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

  // Advanced override: allow mapping attributes directly to a Product Group (real kind=product_group)
  const [productGroupId, setProductGroupId] = useState("");

  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [mapped, setMapped] = useState<PgAttrMapRow[]>([]);

  const [mapAttrId, setMapAttrId] = useState("");
  const [mapSort, setMapSort] = useState<number>(1);
  const [mapRequired, setMapRequired] = useState<boolean>(false);

  // Inline edit buffer for mapped rows
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editSort, setEditSort] = useState<number>(1);
  const [editRequired, setEditRequired] = useState<boolean>(false);

  // Step B: Subcategory -> Product Group mapping (material_subcategory_product_groups)
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

  /**
   * Effective context for attribute mapping:
   * 1) If Advanced Product Group chosen → use productGroupId (kind=product_group)
   * 2) else if Subcategory chosen → use mapped product group for that subcategory
   * 3) else → empty (must choose subcategory first)
   */
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

  // ✅ IMPORTANT: these useMemo hooks MUST be before any early return (no conditional hooks)
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

  // ✅ Attribute lookup for client-side hydration (no UI change)
  const attrById = useMemo(() => {
    const m = new Map<string, AttrRow>();
    for (const a of attributes) m.set(a.id, a);
    return m;
  }, [attributes]);

  // ✅ Display-mapped = mapped rows + hydrated attribute details (keeps your UI exactly same)
  const mappedDisplay = useMemo(() => {
    return mapped.map((m) => {
      const a = attrById.get(m.attribute_id);
      return {
        ...m,
        material_attributes: a
          ? { id: a.id, name: a.name, slug: a.slug, input_type: a.input_type, unit: a.unit }
          : null,
      } as PgAttrMapRow;
    });
  }, [mapped, attrById]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await requireMaterialsAdmin(supabase);
        if (!alive) return;

        setAdminOk(a.ok);
        setRole(a.role);

        if (!a.ok) {
          router.replace("/admin/dashboard");
          return;
        }

        const t = await fetchChildren(supabase, "type", null);
        const attrs = await fetchAttributes(supabase);
        const pgs = await fetchAllByKind(supabase, "product_group"); // ✅ only real product groups

        if (!alive) return;
        setTypes(t);
setAttributes(attrs);
setAllProductGroups(pgs);

if (!attrs || attrs.length === 0) {
  setMsg("No attributes returned from material_attributes. Check: (1) table has rows, (2) RLS SELECT allows admin, (3) correct project/schema.");
}

setLoading(false);

      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load mapping page.");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // Load categories on type
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

  // Load subcategories on category + load Step-B mappings for those subcategories
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
        const s = await fetchChildren(supabase, "subcategory", categoryId); // ✅ only real subcategories
        if (!alive) return;
        setSubcategories(s);

        const subIds = (s || []).map((x) => x.id);
        const maps = await fetchSubcatPgMappings(supabase, subIds);
        if (!alive) return;
        setScMappings(maps);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setMsg(e?.message || "Failed to load subcategories / Step-B mappings.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [categoryId, supabase]);

  // When selected subcategory changes, keep Step-B control in sync (nice UX)
  useEffect(() => {
    if (!subcategoryId) return;
    setScMapSubcategoryId(subcategoryId);
  }, [subcategoryId]);

  // When Step-B subcategory changes, auto-fill its existing mapping (if any)
  useEffect(() => {
    if (!scMapSubcategoryId) {
      setScMapProductGroupId("");
      return;
    }
    const existing = scLookup.get(scMapSubcategoryId) || "";
    setScMapProductGroupId(existing);
  }, [scMapSubcategoryId, scLookup]);

  // ✅ Dedicated refresh for mapped attributes (robust, better error text)
  async function refreshMappedAttributes(productGroupIdToLoad: string) {
    const m = await fetchMappedAttributesRaw(supabase, productGroupIdToLoad);
    setMapped(m);

    const max = m.reduce((acc, x) => Math.max(acc, x.sort_order ?? 0), 0);
    setMapSort((max || 0) + 1);
  }

  // Load mapped attributes whenever effective product group changes
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
          `Failed to load mapped attributes: ${formatSbError(e)}. ` +
            `If you can INSERT but cannot see rows, check RLS SELECT on material_product_group_attributes.`
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [effectiveProductGroupId, supabase]);

const mappedAttrIds = useMemo(() => {
  const s = new Set<string>();
  for (const m of mapped) {
    if (m && typeof m.attribute_id === "string" && m.attribute_id.length > 0) {
      s.add(m.attribute_id);
    }
  }
  return s;
}, [mapped]);

  const availableAttributes = useMemo(() => {
  return attributes;
}, [attributes]);

  async function refreshStepBMappings() {
    const subIds = subcategories.map((x) => x.id);
    const maps = await fetchSubcatPgMappings(supabase, subIds);
    setScMappings(maps);
  }

  // Step B UPSERT: subcategory -> product_group (conflict on subcategory_id)
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
        .from("material_subcategory_product_groups")
        .upsert({ subcategory_id: scMapSubcategoryId, product_group_id: scMapProductGroupId }, { onConflict: "subcategory_id" });

      if (error) throw error;

      await refreshStepBMappings();
      setMsg("Subcategory → Product Group mapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Step-B mapping failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnmapSubcategoryProductGroup(subcategory_id: string) {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("material_subcategory_product_groups").delete().eq("subcategory_id", subcategory_id);
      if (error) throw error;

      await refreshStepBMappings();
      setMsg("Step-B mapping removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Unmap failed.");
    } finally {
      setBusy(false);
    }
  }

  // ✅ FIXED: attribute mapping uses effectiveProductGroupId, refresh uses raw fetch + hydration in UI
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

    // Prevent obvious duplicates client-side (reduces confusing behavior)
    if (mappedAttrIds.has(mapAttrId)) {
      return setMsg("This attribute is already mapped to the active Product Group.");
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("material_product_group_attributes").insert({
        product_group_id: effectiveProductGroupId, // ✅ ALWAYS a real product_group_id now
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
        `Mapping failed: ${formatSbError(e)}. ` +
          `If you see 201/insert OK but list stays 0, check RLS SELECT on material_product_group_attributes.`
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
        .from("material_product_group_attributes")
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
        .from("material_product_group_attributes")
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
        <SectionHeader title="Materials → Mapping" subtitle="Loading..." />
      </Container>
    );
  }

  if (!adminOk) {
    return (
      <Container>
        <SectionHeader title="Materials → Mapping" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mxm-page">
        <SectionHeader
          title="Materials → Product → Variations Mapping"
          subtitle={`Step B: Subcategory → Product Group • Attributes map to Product Group (role: ${role ?? "—"})`}
        />

        <div className="mxm-topbar">
          <div className="mxm-actions">
            <ActionButton href="/admin/dashboard/master-data" variant="secondary">
              ← Back to Master Data
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/taxonomy" variant="secondary">
              Taxonomy Manager
            </ActionButton>
            <ActionButton href="/admin/dashboard/master-data/materials/attributes" variant="secondary">
              Attributes Manager
            </ActionButton>
          </div>
          <div className="mxm-status">{msg ? <Badge>{msg}</Badge> : null}</div>
        </div>

        <div className="mxm-grid2">
          <CardBox
            title="Select context"
            subtitle="Pick a Type → Category → Subcategory. Step B decides which Product Group the Subcategory belongs to. (Advanced: choose a Product Group directly.)"
            right={<Badge>material_taxons</Badge>}
          >
            <div className="mxm-form">
              <label className="mxm-field">
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

              <label className="mxm-field">
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

              <label className="mxm-field">
                <span>Subcategory</span>
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setProductGroupId(""); // keep Advanced truly optional
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

              <label className="mxm-field">
                <span>
                  Product Group <span className="mxm-advancedBadge">Advanced override</span>
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

              <div className="mxm-hint">
                <b>Active context:</b> {effectiveLabel}
                <div style={{ marginTop: 8, opacity: 0.85 }}>
                  Attribute mappings write to <b>material_product_group_attributes.product_group_id</b> (must be <b>kind=product_group</b>).
                </div>
              </div>
            </div>
          </CardBox>

          <CardBox
            title="Map attribute"
            subtitle="Attach an attribute to the active Product Group (resolved via Step B or Advanced override)."
            right={<Badge>material_product_group_attributes</Badge>}
          >
            {!categoryId ? (
              <div className="mxm-empty">Select Type + Category first.</div>
            ) : !effectiveProductGroupId ? (
              <div className="mxm-empty">
                Select a Subcategory and complete <b>Step B</b> mapping (or pick a Product Group in Advanced).
              </div>
            ) : (
              <div className="mxm-form">
                <label className="mxm-field">
  <span>Attribute</span>

  {attributes.length === 0 ? (
    <div className="mxm-empty">
      No attributes loaded. Check <b>material_attributes</b> data and RLS/filters.
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


                <div className="mxm-twoCol">
                  <label className="mxm-field">
                    <span>Sort order</span>
                    <input type="number" value={mapSort} onChange={(e) => setMapSort(parseInt(e.target.value || "1", 10))} />
                  </label>

                  <label className="mxm-field" style={{ alignContent: "end" }}>
                    <span>Required</span>
                    <div className="mxm-checkRow">
                      <input type="checkbox" checked={mapRequired} onChange={(e) => setMapRequired(e.target.checked)} />
                      <span>Yes, required</span>
                    </div>
                  </label>
                </div>

                <button className="mxm-primaryBtn" type="button" onClick={onMapAttribute} disabled={busy || !mapAttrId}>
                  {busy ? "Saving..." : "Map"}
                </button>
              </div>
            )}
          </CardBox>
        </div>

        <div className="mxm-grid2 mxm-mt">
          <CardBox
            title="Step B — Map Subcategory → Product Group"
            subtitle="Each Subcategory must map to exactly one Product Group using material_subcategory_product_groups (UPSERT on subcategory_id)."
            right={<Badge>material_subcategory_product_groups</Badge>}
          >
            {!categoryId ? (
              <div className="mxm-empty">Select Type + Category to load Subcategories.</div>
            ) : (
              <div className="mxm-form">
                <label className="mxm-field">
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

                <label className="mxm-field">
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

                <div className="mxm-hint">
                  <b>UPSERT rule:</b> on conflict (<b>subcategory_id</b>) do update set <b>product_group_id</b>.
                  <div style={{ marginTop: 8, opacity: 0.85 }}>
                    Current mapping for selected subcategory:{" "}
                    <b>{mappedPgForStepBSelectedSubcategory ? pgNameById.get(mappedPgForStepBSelectedSubcategory) || mappedPgForStepBSelectedSubcategory : "— none —"}</b>
                  </div>
                </div>

                <div className="mxm-rowBtns">
                  <button className="mxm-primaryBtn" type="button" onClick={onUpsertSubcategoryProductGroup} disabled={busy || !scMapSubcategoryId || !scMapProductGroupId}>
                    {busy ? "Saving..." : "Save mapping"}
                  </button>

                  {scMapSubcategoryId && scLookup.get(scMapSubcategoryId) ? (
                    <button className="mxm-ghostBtn" type="button" onClick={() => onUnmapSubcategoryProductGroup(scMapSubcategoryId)} disabled={busy}>
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
            right={<span className="mxm-count">{scMappings.length}</span>}
          >
            {!categoryId ? (
              <div className="mxm-empty">Select Type + Category.</div>
            ) : subcategories.length === 0 ? (
              <div className="mxm-empty">No subcategories found for this category.</div>
            ) : scMappings.length === 0 ? (
              <div className="mxm-empty">No Step-B mappings yet. Map a Subcategory to a Product Group.</div>
            ) : (
              <div className="mxm-list">
                {scMappingsSorted.map((r) => {
                  const scName = scNameById.get(r.subcategory_id) || r.subcategory_id;
                  const pgName = pgNameById.get(r.product_group_id) || r.product_group_id;

                  return (
                    <div key={r.subcategory_id} className="mxm-row">
                      <div className="mxm-rowText">
                        <div className="mxm-rowName">
                          {scName}
                          <span className="mxm-pill">→ {pgName}</span>
                        </div>
                        <div className="mxm-rowMeta">
                          subcategory_id {r.subcategory_id} • product_group_id {r.product_group_id}
                        </div>
                      </div>

                      <div className="mxm-rowBtns">
                        <button
                          className="mxm-ghostBtn"
                          onClick={() => {
                            setScMapSubcategoryId(r.subcategory_id);
                            setScMapProductGroupId(r.product_group_id);
                            setMsg(null);
                          }}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button className="mxm-ghostBtn" onClick={() => onUnmapSubcategoryProductGroup(r.subcategory_id)} disabled={busy}>
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

        <div className="mxm-grid2 mxm-mt">
          <CardBox
            title="Mapped attributes"
            subtitle={effectiveProductGroupId ? `Total mapped: ${mapped.length}` : "Resolve Product Group via Step B (or Advanced) to view mapping."}
            right={<span className="mxm-count">{mapped.length}</span>}
          >
            {!categoryId ? (
              <div className="mxm-empty">Select Type + Category.</div>
            ) : !effectiveProductGroupId ? (
              <div className="mxm-empty">Select Subcategory and complete Step B (or choose Product Group in Advanced).</div>
            ) : mapped.length === 0 ? (
              <div className="mxm-empty">No attributes mapped yet.</div>
            ) : (
              <div className="mxm-list">
                {mappedDisplay.map((m) => {
                  const a = normalizeJoinedAttr(m.material_attributes);
                  const key = `${m.product_group_id}:${m.attribute_id}`;
                  const isEditing = editKey === key;

                  return (
                    <div key={key} className="mxm-row">
                      <div className="mxm-rowText">
                        <div className="mxm-rowName">
                          {a ? a.name : m.attribute_id}
                          {m.is_required ? <span className="mxm-pill">required</span> : null}
                        </div>

                        <div className="mxm-rowMeta">
                          sort {m.sort_order}
                          {a ? ` • ${a.input_type} • ${a.slug}${a.unit ? ` • unit ${a.unit}` : ""}` : ""}
                        </div>

                        {isEditing ? (
                          <div className="mxm-editBox">
                            <label className="mxm-miniField">
                              <span>Sort</span>
                              <input type="number" value={editSort} onChange={(e) => setEditSort(parseInt(e.target.value || "1", 10))} />
                            </label>

                            <label className="mxm-miniField">
                              <span>Required</span>
                              <div className="mxm-checkRow" style={{ height: 40 }}>
                                <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} />
                                <span>Yes</span>
                              </div>
                            </label>
                          </div>
                        ) : null}
                      </div>

                      <div className="mxm-rowBtns">
                        {isEditing ? (
                          <>
                            <button className="mxm-ghostBtn" onClick={() => saveEdit(m)} disabled={busy}>
                              Save
                            </button>
                            <button className="mxm-ghostBtn" onClick={cancelEdit} disabled={busy}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="mxm-ghostBtn" onClick={() => startEdit(m)} disabled={busy}>
                              Edit
                            </button>
                            <button className="mxm-ghostBtn" onClick={() => onUnmapAttribute(m)} disabled={busy}>
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

          <CardBox title="Cement example (your rule)" subtitle="One Product Group: Cement. Variants are attribute values." right={<Badge>Step B</Badge>}>
            <div className="mxm-hint">
              Map Subcategory → Product Group:
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                <b>Subcategory:</b> Cement → <b>Product Group:</b> Cement
              </div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Then map attribute <b>Cement Type</b> (single_select) → values: OPC 43, OPC 53, PPC, PSC, SRC, PCC, Premium
              </div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>This prevents “Slug already exists” product-group duplication for variants.</div>
            </div>
          </CardBox>
        </div>

        <style jsx>{`
          .mxm-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin: 12px 0 16px;
          }
          .mxm-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .mxm-status {
            display: flex;
            justify-content: flex-end;
            min-height: 24px;
          }

          .mxm-grid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .mxm-mt {
            margin-top: 14px;
          }
          @media (min-width: 980px) {
            .mxm-grid2 {
              grid-template-columns: 1fr 1fr;
            }
          }

          .mxm-card {
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          .mxm-cardHead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 14px 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }
          .mxm-cardBody {
            padding: 14px;
          }

          .mxm-title {
            font-size: 15px;
            font-weight: 800;
          }
          .mxm-subtitle {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.75;
            line-height: 1.35;
          }

          .mxm-count {
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

          .mxm-form {
            display: grid;
            gap: 12px;
          }

          .mxm-field {
            display: grid;
            gap: 6px;
          }
          .mxm-field > span {
            font-size: 12px;
            opacity: 0.75;
          }

          .mxm-field select,
          .mxm-field input {
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

          .mxm-twoCol {
            display: grid;
            gap: 12px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 760px) {
            .mxm-twoCol {
              grid-template-columns: 1fr 1fr;
            }
          }

          .mxm-checkRow {
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

          .mxm-primaryBtn {
            height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #111;
            color: #fff;
            font-weight: 900;
            cursor: pointer;
            padding: 0 14px;
          }
          .mxm-primaryBtn:disabled {
            background: rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.35);
            cursor: not-allowed;
          }

          .mxm-empty {
            font-size: 14px;
            opacity: 0.75;
          }

          .mxm-list {
            display: grid;
            gap: 10px;
          }
          .mxm-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: #fff;
          }
          .mxm-rowText {
            min-width: 0;
            flex: 1;
          }
          .mxm-rowName {
            font-weight: 800;
            font-size: 14px;
            line-height: 1.2;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .mxm-rowMeta {
            margin-top: 4px;
            font-size: 13px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 520px;
          }

          .mxm-pill {
            font-size: 12px;
            padding: 5px 10px;
            border-radius: 999px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            background: rgba(0, 0, 0, 0.02);
            white-space: nowrap;
          }

          .mxm-advancedBadge {
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

          .mxm-rowBtns {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
          }

          .mxm-ghostBtn {
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
          .mxm-ghostBtn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .mxm-hint {
            border: 1px dashed rgba(0, 0, 0, 0.18);
            background: rgba(0, 0, 0, 0.02);
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 13px;
            opacity: 0.9;
            line-height: 1.45;
          }

          .mxm-editBox {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 10px;
            margin-top: 10px;
            align-items: end;
          }
          .mxm-miniField {
            display: grid;
            gap: 6px;
          }
          .mxm-miniField > span {
            font-size: 12px;
            opacity: 0.75;
          }
          .mxm-miniField input {
            height: 40px;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid rgba(0, 0, 0, 0.18);
            background: #fff;
            font-size: 14px;
          }

          /* Make Advanced Product Group dropdown look greyed out when disabled */
          .mxm-field select.advanced-disabled {
            background: rgba(0, 0, 0, 0.03);
            opacity: 0.55;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </Container>
  );
}
