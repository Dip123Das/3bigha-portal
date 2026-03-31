// app/admin/dashboard/master-data/rentals/attributes/page.tsx
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

type AttrValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  sort_order: number | null;
  is_active?: boolean | null;
  product_group_id?: string | null; // may not exist in DB (we feature-detect)
};

type PgAttrMapRow = {
  id: string;
  product_group_id: string;
  attribute_id: string;
  sort_order: number | null;
  is_required: boolean | null;
  is_active?: boolean | null;
};

const TAXON_TABLE = "rental_taxons" as const;
const ATTR_TABLE = "rental_attributes" as const;
const VALUE_TABLE = "rental_attribute_values" as const;
const MAP_TABLE = "rental_product_group_attributes" as const;

const ADMIN_ROLE = "rentals_admin" as const;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}
function isModuleAdmin(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

function looksLikeMissingColumn(err: any, col: string) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes(col.toLowerCase());
}

function looksLikeMissingRelation(err: any, rel: string) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes("does not exist") && msg.toLowerCase().includes(rel.toLowerCase());
}

async function requireModuleAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, role: null as string | null, email: null as string | null };

  const { data: prof, error: profErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profErr) throw profErr;

  const role = ((prof as any)?.role ?? null) as string | null;
  const ok = isMaster(role) || isModuleAdmin(role);
  return { ok, role, email: user.email ?? null };
}

async function fetchTaxons(supabase: ReturnType<typeof getSupabaseBrowser>, kind: Kind, parentId: string | null) {
  let q = supabase
    .from(TAXON_TABLE)
    .select("id,parent_id,kind,name,slug,sort_order,is_active,source")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (parentId === null) q = q.is("parent_id", null);
  else q = q.eq("parent_id", parentId);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TaxonRow[];
}

async function fetchAttributes(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const withActive = await supabase
    .from(ATTR_TABLE)
    .select("id,name,slug,input_type,unit,sort_order,is_active")
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (!withActive.error) return (withActive.data || []) as AttrRow[];

  if (looksLikeMissingRelation(withActive.error, ATTR_TABLE)) throw withActive.error;

  if (looksLikeMissingColumn(withActive.error, "is_active")) {
    const noActive = await supabase
      .from(ATTR_TABLE)
      .select("id,name,slug,input_type,unit,sort_order")
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (noActive.error) throw noActive.error;
    return (noActive.data || []) as AttrRow[];
  }

  throw withActive.error;
}

/**
 * IMPORTANT:
 * We avoid dynamic select strings because Supabase generated types can emit:
 * ParserError<"Unexpected input: ,product_group_id"> which breaks TS build.
 *
 * So we keep SELECT strings as literals in each branch.
 */
async function fetchAttributeValues(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  attributeId: string,
  productGroupId: string | null,
  supportsPgScopedValues: boolean,
  wantPgScopedFilter: boolean // when supportsPgScopedValues=true: true means filter by product_group_id (null or pgId), false means ignore product_group_id
) {
  // Branch A: PG-scoped column exists and we want to use it
  if (supportsPgScopedValues && wantPgScopedFilter) {
    // Try with is_active
    let q = supabase
      .from(VALUE_TABLE)
      .select("id,attribute_id,value,sort_order,is_active,product_group_id")
      .eq("attribute_id", attributeId)
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("value", { ascending: true });

    if (productGroupId === null) q = q.is("product_group_id", null);
    else q = q.eq("product_group_id", productGroupId);

    const r1 = await q;
    if (!r1.error) return (r1.data || []) as AttrValueRow[];

    if (looksLikeMissingRelation(r1.error, VALUE_TABLE)) throw r1.error;

    // Retry without is_active
    if (looksLikeMissingColumn(r1.error, "is_active")) {
      let q2 = supabase
        .from(VALUE_TABLE)
        .select("id,attribute_id,value,sort_order,product_group_id")
        .eq("attribute_id", attributeId)
        .order("sort_order", { ascending: true, nullsFirst: true })
        .order("value", { ascending: true });

      if (productGroupId === null) q2 = q2.is("product_group_id", null);
      else q2 = q2.eq("product_group_id", productGroupId);

      const r2 = await q2;
      if (r2.error) throw r2.error;
      return (r2.data || []) as AttrValueRow[];
    }

    // If product_group_id is missing after all, caller should disable supportsPgScopedValues
    throw r1.error;
  }

  // Branch B: Global-only (or caller chooses to ignore product_group_id)
  // Try with is_active
  const r1 = await supabase
    .from(VALUE_TABLE)
    .select("id,attribute_id,value,sort_order,is_active")
    .eq("attribute_id", attributeId)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("value", { ascending: true });

  if (!r1.error) return (r1.data || []) as AttrValueRow[];

  if (looksLikeMissingRelation(r1.error, VALUE_TABLE)) throw r1.error;

  if (looksLikeMissingColumn(r1.error, "is_active")) {
    const r2 = await supabase
      .from(VALUE_TABLE)
      .select("id,attribute_id,value,sort_order")
      .eq("attribute_id", attributeId)
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("value", { ascending: true });

    if (r2.error) throw r2.error;
    return (r2.data || []) as AttrValueRow[];
  }

  throw r1.error;
}

async function tryFetchPgAttributeMap(supabase: ReturnType<typeof getSupabaseBrowser>, productGroupId: string) {
  const withActive = await supabase
    .from(MAP_TABLE)
    .select("id,product_group_id,attribute_id,sort_order,is_required,is_active")
    .eq("product_group_id", productGroupId)
    .order("sort_order", { ascending: true, nullsFirst: true });

  if (!withActive.error) return (withActive.data || []) as PgAttrMapRow[];

  if (looksLikeMissingRelation(withActive.error, MAP_TABLE)) throw withActive.error;

  if (looksLikeMissingColumn(withActive.error, "is_active")) {
    const noActive = await supabase
      .from(MAP_TABLE)
      .select("id,product_group_id,attribute_id,sort_order,is_required")
      .eq("product_group_id", productGroupId)
      .order("sort_order", { ascending: true, nullsFirst: true });

    if (noActive.error) throw noActive.error;
    return (noActive.data || []) as PgAttrMapRow[];
  }

  throw withActive.error;
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

export default function RentalsAttributesAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // taxonomy select
  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [categories, setCategories] = useState<TaxonRow[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonRow[]>([]);
  const [productGroups, setProductGroups] = useState<TaxonRow[]>([]);

  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");

  // attributes + values
  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [selectedAttrId, setSelectedAttrId] = useState<string>("");

  const [valuesMode, setValuesMode] = useState<"global" | "product_group">("global");
  const [values, setValues] = useState<AttrValueRow[]>([]);
  const [supportsPgScopedValues, setSupportsPgScopedValues] = useState<boolean>(false);

  // mapping (attr -> pg)
  const [mappingSupported, setMappingSupported] = useState<boolean | null>(null);
  const [pgAttrMap, setPgAttrMap] = useState<PgAttrMapRow[]>([]);

  // create attribute form
  const [aName, setAName] = useState("");
  const [aSlug, setASlug] = useState("");
  const [aInputType, setAInputType] = useState<AttrInputType>("single_select");
  const [aUnit, setAUnit] = useState("");
  const [aSort, setASort] = useState<number>(1);

  // create value form
  const [vValue, setVValue] = useState("");
  const [vSort, setVSort] = useState<number>(1);

  // mapping form
  const [mapAttrId, setMapAttrId] = useState<string>("");
  const [mapSort, setMapSort] = useState<number>(1);
  const [mapRequired, setMapRequired] = useState<boolean>(false);

  const selectedType = types.find((t) => t.id === typeId) || null;
  const selectedCategory = categories.find((c) => c.id === categoryId) || null;
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId) || null;
  const selectedPG = productGroups.find((p) => p.id === productGroupId) || null;

  // boot
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg(null);

        const a = await requireModuleAdmin(supabase);
        if (!alive) return;

        setAllowed(a.ok);
        setRole(a.role);
        setEmail(a.email);

        if (!a.ok) {
          setLoading(false);
          router.replace("/admin/dashboard");
          return;
        }

        // detect if rental_attribute_values has product_group_id column
        // IMPORTANT: keep select string literal, not dynamic
        let pgScoped = false;
        const probe = await supabase.from(VALUE_TABLE).select("id,product_group_id").limit(1);
        if (!probe.error) pgScoped = true;
        else if (looksLikeMissingColumn(probe.error, "product_group_id")) pgScoped = false;
        else if (looksLikeMissingRelation(probe.error, VALUE_TABLE)) throw probe.error;
        else pgScoped = false;

        if (!alive) return;
        setSupportsPgScopedValues(pgScoped);

        const t = await fetchTaxons(supabase, "type", null);
        const attrs = await fetchAttributes(supabase);

        if (!alive) return;
        setTypes(t);
        setAttributes(attrs);

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        const m =
          e?.message ||
          (looksLikeMissingRelation(e, ATTR_TABLE) || looksLikeMissingRelation(e, VALUE_TABLE) || looksLikeMissingRelation(e, TAXON_TABLE)
            ? "Rentals master tables not found in DB yet. Create the Rentals tables first (OPTION A SQL)."
            : "Failed to load.");

        setMsg(m);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // cascade taxonomy
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategories([]);
      setSubcategories([]);
      setProductGroups([]);
      setCategoryId("");
      setSubcategoryId("");
      setProductGroupId("");
      if (!typeId) return;

      try {
        const c = await fetchTaxons(supabase, "category", typeId);
        if (!alive) return;
        setCategories(c);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load categories.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [typeId, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setSubcategories([]);
      setProductGroups([]);
      setSubcategoryId("");
      setProductGroupId("");
      if (!categoryId) return;

      try {
        const s = await fetchTaxons(supabase, "subcategory", categoryId);
        if (!alive) return;
        setSubcategories(s);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load subcategories.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [categoryId, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setProductGroups([]);
      setProductGroupId("");
      if (!subcategoryId) return;

      try {
        const p = await fetchTaxons(supabase, "product_group", subcategoryId);
        if (!alive) return;
        setProductGroups(p);
      } catch (e: any) {
        if (!alive) return;
        setMsg(e?.message || "Failed to load product groups.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [subcategoryId, supabase]);

  // if DB doesn't support PG-scoped values, force global tab
  useEffect(() => {
    if (valuesMode === "product_group" && !supportsPgScopedValues) setValuesMode("global");
  }, [valuesMode, supportsPgScopedValues]);

  // load values
  useEffect(() => {
    let alive = true;
    (async () => {
      setValues([]);
      if (!selectedAttrId) return;

      // if PG tab but no PG selected, do nothing
      if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) return;

      try {
        if (supportsPgScopedValues) {
          if (valuesMode === "global") {
            // global tab means product_group_id IS NULL
            const vg = await fetchAttributeValues(supabase, selectedAttrId, null, true, true);
            if (!alive) return;
            setValues(vg);
          } else {
            const vp = await fetchAttributeValues(supabase, selectedAttrId, productGroupId, true, true);
            if (!alive) return;
            setValues(vp);
          }
        } else {
          const v = await fetchAttributeValues(supabase, selectedAttrId, null, false, false);
          if (!alive) return;
          setValues(v);
        }
      } catch (e: any) {
        console.error(e);
        if (!alive) return;

        // if product_group_id missing, disable scoped mode and retry global
        if (looksLikeMissingColumn(e, "product_group_id")) {
          setSupportsPgScopedValues(false);
          setValuesMode("global");
          try {
            const vg = await fetchAttributeValues(supabase, selectedAttrId, null, false, false);
            if (!alive) return;
            setValues(vg);
          } catch (e2: any) {
            if (!alive) return;
            setMsg(e2?.message || "Failed to load attribute values.");
          }
          return;
        }

        setMsg(e?.message || "Failed to load attribute values.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedAttrId, valuesMode, productGroupId, supportsPgScopedValues, supabase]);

  // check mapping table when PG selected
  useEffect(() => {
    let alive = true;
    (async () => {
      setPgAttrMap([]);
      setMappingSupported(null);

      if (!productGroupId) return;

      try {
        const m = await tryFetchPgAttributeMap(supabase, productGroupId);
        if (!alive) return;
        setPgAttrMap(m);
        setMappingSupported(true);
      } catch {
        if (!alive) return;
        setMappingSupported(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productGroupId, supabase]);

  async function refreshAttributes() {
    const a = await fetchAttributes(supabase);
    setAttributes(a);
  }

  async function refreshValues() {
    if (!selectedAttrId) return;
    if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) return;

    if (supportsPgScopedValues) {
      if (valuesMode === "global") {
        setValues(await fetchAttributeValues(supabase, selectedAttrId, null, true, true));
      } else {
        setValues(await fetchAttributeValues(supabase, selectedAttrId, productGroupId, true, true));
      }
    } else {
      setValues(await fetchAttributeValues(supabase, selectedAttrId, null, false, false));
    }
  }

  async function refreshMap() {
    if (!productGroupId) return;
    const m = await tryFetchPgAttributeMap(supabase, productGroupId);
    setPgAttrMap(m);
  }

  async function onCreateAttribute() {
    setMsg(null);
    const name = aName.trim();
    if (!name) return;

    const slug = (aSlug.trim() || slugify(name)).toLowerCase();

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const payload1: any = {
        name,
        slug,
        input_type: aInputType,
        unit: aUnit.trim() ? aUnit.trim() : null,
        sort_order: aSort,
        is_active: true,
        created_by: userId,
      };

      let { error } = await supabase.from(ATTR_TABLE).insert(payload1);

      if (error && looksLikeMissingColumn(error, "is_active")) {
        const payload2: any = {
          name,
          slug,
          input_type: aInputType,
          unit: aUnit.trim() ? aUnit.trim() : null,
          sort_order: aSort,
          created_by: userId,
        };
        const retry = await supabase.from(ATTR_TABLE).insert(payload2);
        error = retry.error;
      }
      if (error && looksLikeMissingColumn(error, "created_by")) {
        const payload3: any = {
          name,
          slug,
          input_type: aInputType,
          unit: aUnit.trim() ? aUnit.trim() : null,
          sort_order: aSort,
          is_active: true,
        };
        const retry2 = await supabase.from(ATTR_TABLE).insert(payload3);
        error = retry2.error;
      }

      if (error) throw error;

      setAName("");
      setASlug("");
      setAUnit("");
      setASort(1);
      await refreshAttributes();
      setMsg("Attribute created ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create attribute failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDisableAttribute(attr: AttrRow) {
    setMsg(null);
    setBusy(true);
    try {
      let { error } = await supabase.from(ATTR_TABLE).update({ is_active: false }).eq("id", attr.id);
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const del = await supabase.from(ATTR_TABLE).delete().eq("id", attr.id);
        error = del.error;
      }
      if (error) throw error;

      if (selectedAttrId === attr.id) {
        setSelectedAttrId("");
        setValues([]);
      }
      await refreshAttributes();
      setMsg("Attribute removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Remove attribute failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateValue() {
    setMsg(null);
    if (!selectedAttrId) return setMsg("Select an attribute first.");

    if (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId)) {
      return setMsg("Select a Product Group to add PG-specific values.");
    }

    const value = vValue.trim();
    if (!value) return;

    setBusy(true);
    try {
      const base: any = {
        attribute_id: selectedAttrId,
        value,
        sort_order: vSort,
        is_active: true,
      };

      if (supportsPgScopedValues && valuesMode === "product_group") {
        base.product_group_id = productGroupId;
      }

      let { error } = await supabase.from(VALUE_TABLE).insert(base);

      if (error && looksLikeMissingColumn(error, "is_active")) {
        const base2: any = { attribute_id: selectedAttrId, value, sort_order: vSort };
        if (supportsPgScopedValues && valuesMode === "product_group") base2.product_group_id = productGroupId;
        const retry = await supabase.from(VALUE_TABLE).insert(base2);
        error = retry.error;
      }

      if (error && looksLikeMissingColumn(error, "product_group_id")) {
        setSupportsPgScopedValues(false);
        setValuesMode("global");
        const base3: any = { attribute_id: selectedAttrId, value, sort_order: vSort, is_active: true };
        const retry2 = await supabase.from(VALUE_TABLE).insert(base3);
        error = retry2.error;
      }

      if (error) throw error;

      setVValue("");
      setVSort(1);
      await refreshValues();
      setMsg("Value created ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Create value failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveValue(row: AttrValueRow) {
    setMsg(null);
    setBusy(true);
    try {
      let { error } = await supabase.from(VALUE_TABLE).update({ is_active: false }).eq("id", row.id);
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const del = await supabase.from(VALUE_TABLE).delete().eq("id", row.id);
        error = del.error;
      }
      if (error) throw error;

      await refreshValues();
      setMsg("Value removed ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Remove value failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onMapAttributeToProductGroup() {
    setMsg(null);
    if (!productGroupId) return setMsg("Select a Product Group first.");
    if (!mappingSupported) return setMsg("Mapping table not found / not accessible.");
    if (!mapAttrId) return setMsg("Select an attribute to map.");

    setBusy(true);
    try {
      const payload1: any = {
        product_group_id: productGroupId,
        attribute_id: mapAttrId,
        sort_order: mapSort,
        is_required: mapRequired,
        is_active: true,
      };

      let { error } = await supabase.from(MAP_TABLE).insert(payload1);

      if (error && looksLikeMissingColumn(error, "is_active")) {
        const payload2: any = {
          product_group_id: productGroupId,
          attribute_id: mapAttrId,
          sort_order: mapSort,
          is_required: mapRequired,
        };
        const retry = await supabase.from(MAP_TABLE).insert(payload2);
        error = retry.error;
      }

      if (error) throw error;

      await refreshMap();
      setMsg("Mapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Mapping failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnmap(row: PgAttrMapRow) {
    setMsg(null);
    if (!mappingSupported) return;

    setBusy(true);
    try {
      let { error } = await supabase.from(MAP_TABLE).update({ is_active: false }).eq("id", row.id);
      if (error && looksLikeMissingColumn(error, "is_active")) {
        const del = await supabase.from(MAP_TABLE).delete().eq("id", row.id);
        error = del.error;
      }
      if (error) throw error;

      await refreshMap();
      setMsg("Unmapped ✅");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Unmap failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Rentals → Attributes Manager" subtitle="Loading..." />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Rentals → Attributes Manager" subtitle="Admin access required" />
        <EmptyState message="Access denied." />
      </Container>
    );
  }

  const valuesTitle =
    valuesMode === "global"
      ? supportsPgScopedValues
        ? "Global values (shared)"
        : "Values (global)"
      : "Values for selected Product Group";

  const valuesSubtitle =
    valuesMode === "global"
      ? supportsPgScopedValues
        ? "Only product_group_id = NULL"
        : "Applies everywhere"
      : selectedPG
      ? `Product Group: ${selectedPG.name}`
      : "Select a Product Group first";

  return (
    <Container>
      <div className="mtx-page">
        <SectionHeader
          title="Rentals → Attributes Manager"
          subtitle={`Create Attributes + Values, and map Attributes to Product Groups (role: ${role ?? "—"})`}
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
                {supportsPgScopedValues ? (
                  <span style={{ marginLeft: 10, opacity: 0.8 }}>(PG-specific values supported)</span>
                ) : (
                  <span style={{ marginLeft: 10, opacity: 0.8 }}>(Global values only)</span>
                )}
              </div>
            </div>
          </CardBox>

          <CardBox title="Attributes" subtitle={`Create and manage ${ATTR_TABLE}`} right={<Badge>{ATTR_TABLE}</Badge>}>
            <div className="mtx-form">
              <label className="mtx-field">
                <span>Select Attribute</span>
                <select value={selectedAttrId} onChange={(e) => setSelectedAttrId(e.target.value)}>
                  <option value="">— Select Attribute —</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.input_type})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mtx-divider" />

              <div className="mtx-title" style={{ fontSize: 14 }}>
                Create Attribute
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Name</span>
                  <input
                    value={aName}
                    onChange={(e) => {
                      setAName(e.target.value);
                      if (!aSlug.trim()) setASlug(slugify(e.target.value));
                    }}
                    placeholder="e.g., Fuel Type"
                  />
                </label>

                <label className="mtx-field">
                  <span>Slug</span>
                  <input value={aSlug} onChange={(e) => setASlug(e.target.value)} placeholder="auto-generated" />
                </label>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Input type</span>
                  <select value={aInputType} onChange={(e) => setAInputType(e.target.value as AttrInputType)}>
                    <option value="single_select">single_select</option>
                    <option value="multi_select">multi_select</option>
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                </label>

                <label className="mtx-field">
                  <span>Unit (optional)</span>
                  <input value={aUnit} onChange={(e) => setAUnit(e.target.value)} placeholder="e.g., HP / ton / m³" />
                </label>
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    value={aSort}
                    onChange={(e) => setASort(parseInt(e.target.value || "1", 10))}
                  />
                </label>

                <div className="mtx-field">
                  <span>Status</span>
                  <div className="mtx-readonly">{busy ? "Saving…" : aName.trim() ? "Ready" : "Incomplete"}</div>
                </div>
              </div>

              <button className="mtx-primaryBtn" type="button" onClick={onCreateAttribute} disabled={busy || !aName.trim()}>
                {busy ? "Saving..." : "Create Attribute"}
              </button>

              {selectedAttrId ? (
                <button
                  className="mtx-ghostBtn danger"
                  type="button"
                  onClick={() => {
                    const a = attributes.find((x) => x.id === selectedAttrId);
                    if (a) onDisableAttribute(a);
                  }}
                  disabled={busy}
                >
                  Disable selected attribute
                </button>
              ) : (
                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Tip: select an attribute to manage its values.
                </div>
              )}
            </div>
          </CardBox>
        </div>

        <div className="mtx-grid2 mtx-mt">
          <CardBox
            title={valuesTitle}
            subtitle={valuesSubtitle}
            right={
              <div className="mtx-right">
                <div className="mtx-tabRow">
                  <button
                    className={`mtx-tab ${valuesMode === "global" ? "active" : ""}`}
                    onClick={() => setValuesMode("global")}
                    type="button"
                  >
                    Global values
                  </button>
                  <button
                    className={`mtx-tab ${valuesMode === "product_group" ? "active" : ""}`}
                    onClick={() => setValuesMode("product_group")}
                    type="button"
                    disabled={!supportsPgScopedValues}
                    title={!supportsPgScopedValues ? "Enable PG-scoped values in DB (product_group_id column)." : ""}
                  >
                    Values for selected Product Group
                  </button>
                </div>
              </div>
            }
          >
            <div className="mtx-form">
              <div className="mtx-footnote" style={{ textAlign: "left", marginTop: 0 }}>
                Add values for selected attribute (single_select / multi_select).{" "}
                {supportsPgScopedValues ? (
                  valuesMode === "global" ? (
                    <b>(product_group_id IS NULL)</b>
                  ) : (
                    <b>(product_group_id = selected PG)</b>
                  )
                ) : (
                  <b>(global-only table)</b>
                )}
              </div>

              <div className="mtx-twoCol">
                <label className="mtx-field">
                  <span>Value</span>
                  <input
                    value={vValue}
                    onChange={(e) => setVValue(e.target.value)}
                    placeholder="e.g., Petrol / Diesel / Electric"
                    disabled={!selectedAttrId || (valuesMode === "product_group" && !productGroupId)}
                  />
                </label>

                <label className="mtx-field">
                  <span>Sort</span>
                  <input
                    type="number"
                    value={vSort}
                    onChange={(e) => setVSort(parseInt(e.target.value || "1", 10))}
                    disabled={!selectedAttrId || (valuesMode === "product_group" && !productGroupId)}
                  />
                </label>
              </div>

              <button
                className="mtx-primaryBtn"
                type="button"
                onClick={onCreateValue}
                disabled={
                  busy ||
                  !selectedAttrId ||
                  !vValue.trim() ||
                  (valuesMode === "product_group" && (!supportsPgScopedValues || !productGroupId))
                }
              >
                {busy ? "Saving..." : "Add Value"}
              </button>

              <div className="mtx-divider" />

              <div className="mtx-title" style={{ fontSize: 14 }}>
                Existing values
              </div>

              {!selectedAttrId ? (
                <div className="mtx-empty">Select an attribute first.</div>
              ) : valuesMode === "product_group" && !productGroupId ? (
                <div className="mtx-empty">Select a Product Group to view/add PG-specific values.</div>
              ) : values.length === 0 ? (
                <div className="mtx-empty">No values yet.</div>
              ) : (
                <div className="mtx-list">
                  {values.slice(0, 80).map((r) => (
                    <div key={r.id} className="mtx-row">
                      <div className="mtx-rowText">
                        <div className="mtx-rowName">{r.value}</div>
                        <div className="mtx-rowSlug">
                          sort: {r.sort_order ?? "-"}
                          {supportsPgScopedValues ? (
                            <>
                              {" "}
                              • pg:{" "}
                              {r.product_group_id ? (
                                <span style={{ fontWeight: 700 }}>{r.product_group_id}</span>
                              ) : (
                                <span style={{ opacity: 0.75 }}>GLOBAL</span>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                      <button className="mtx-ghostBtn" onClick={() => onRemoveValue(r)} disabled={busy}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mtx-footnote" style={{ textAlign: "left" }}>
                Note: “Remove” soft-disables if <b>is_active</b> exists; otherwise it deletes the row.
              </div>
            </div>
          </CardBox>

          <CardBox
            title="Map Attribute → Product Group"
            subtitle={mappingSupported ? "Controls which attributes show for a Product Group." : "Mapping disabled (table missing / not accessible)."}
            right={<Badge>{MAP_TABLE}</Badge>}
          >
            {!mappingSupported ? (
              <div className="mtx-empty">Select a Product Group. If still disabled, create {MAP_TABLE} in DB.</div>
            ) : (
              <div className="mtx-form">
                <label className="mtx-field">
                  <span>Attribute to map</span>
                  <select value={mapAttrId} onChange={(e) => setMapAttrId(e.target.value)} disabled={!productGroupId}>
                    <option value="">{productGroupId ? "— Select Attribute —" : "Select a Product Group first"}</option>
                    {attributes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.input_type})
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

                <button
                  className="mtx-primaryBtn"
                  type="button"
                  onClick={onMapAttributeToProductGroup}
                  disabled={busy || !productGroupId || !mapAttrId}
                >
                  {busy ? "Saving..." : "Map"}
                </button>

                <div className="mtx-divider" />

                <div className="mtx-title" style={{ fontSize: 14 }}>
                  Mapped attributes (for selected PG)
                </div>

                                {!productGroupId ? (
                  <div className="mtx-empty">Select a Product Group to see mappings.</div>
                ) : pgAttrMap.length === 0 ? (
                  <div className="mtx-empty">No mapped attributes yet.</div>
                ) : (
                  <div className="mtx-list">
                    {pgAttrMap.slice(0, 80).map((m) => {
                      const a = attributes.find((x) => x.id === m.attribute_id) || null;
                      return (
                        <div key={m.id} className="mtx-row">
                          <div className="mtx-rowText">
                            <div className="mtx-rowName">
                              {a ? a.name : m.attribute_id}{" "}
                              {m.is_required ? <span className="mtx-miniTag">required</span> : null}
                            </div>
                            <div className="mtx-rowSlug">
                              {a ? a.slug : ""} {m.sort_order != null ? ` • sort ${m.sort_order}` : ""}
                            </div>
                          </div>
                          <button className="mtx-ghostBtn" onClick={() => onUnmap(m)} disabled={busy}>
                            Unmap
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mtx-footnote" style={{ textAlign: "left" }}>
                  Tip: in the Values card, you can add both “Global values” and “Values for selected Product Group” (if
                  your DB supports it).
                </div>
              </div>
            )}
          </CardBox>
        </div>
      </div>

      {/* SAME CSS as your Materials/Services/Rentals Taxonomy */}
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
        .mtx-mt {
          margin-top: 14px;
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

        .mtx-readonly {
          height: 42px;
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          font-size: 14px;
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
        .mtx-ghostBtn.danger {
          border-color: rgba(200, 0, 0, 0.25);
          color: rgba(160, 0, 0, 0.95);
        }

        .mtx-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 4px 0;
        }

        .mtx-selection {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          border-radius: 12px;
          padding: 12px;
        }
        .mtx-selectionHead {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.9;
        }
        .mtx-pillRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .mtx-pill {
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          white-space: nowrap;
        }

        .mtx-tabRow {
          display: inline-flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .mtx-tab {
          height: 34px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.16);
          background: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .mtx-tab:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .mtx-tab.active {
          background: rgba(0, 0, 0, 0.08);
          border-color: rgba(0, 0, 0, 0.22);
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

        .mtx-miniTag {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          margin-left: 8px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.14);
          background: rgba(0, 0, 0, 0.03);
          font-size: 11px;
          font-weight: 900;
          opacity: 0.9;
        }

        .mtx-empty {
          font-size: 13px;
          opacity: 0.7;
          padding: 4px 0;
        }

        .mtx-footnote {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.7;
          text-align: right;
        }

        /* missing in your snippet earlier but used: */
        .mtx-checkRow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 42px;
          padding: 0 10px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(0, 0, 0, 0.02);
          font-weight: 800;
        }
        .mtx-checkRow input {
          width: 16px;
          height: 16px;
        }
      `}</style>
    </Container>
  );
}
