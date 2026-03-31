// app/materials/add/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Kind = "type" | "category" | "subcategory" | "product_group";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string | null;
  sort_order: number | null;
  is_active?: boolean | null;
};

type AttrRow = {
  id: string;
  name: string;
  input_type: "single_select" | "multi_select" | "text" | "number" | "boolean" | string;
  unit: string | null;
  sort_order: number | null;
  is_active?: boolean | null;
};

type AttrValueRow = {
  id: string;
  attribute_id: string;
  value: string;
  slug?: string | null;
  sort_order: number | null;
  is_active?: boolean | null;

  // IMPORTANT: for product-group–specific values (nullable for global)
  product_group_id?: string | null;
};

type GroupKey = "core" | "finish" | "kitchen" | "tools";

const GROUPS: { key: GroupKey; label: string; hint: string }[] = [
  { key: "core", label: "Core Construction Materials", hint: "Build the Structure" },
  { key: "finish", label: "Finishing & Interior Materials", hint: "Finish & Design Your Home" },
  { key: "kitchen", label: "Kitchen, Appliances & Hardware", hint: "Fit-Out & Installations" },
  { key: "tools", label: "Tools, Safety & Infrastructure", hint: "Tools, Safety & Maintenance" },
];

const GROUP_TO_TYPES: Record<GroupKey, string[]> = {
  core: ["BASIC BUILDING MATERIALS", "PLUMBING MATERIALS", "ELECTRICAL FITTINGS", "WIRES & CABLES", "ROOFING", "DOORS & WINDOWS"],
  finish: ["FLOORING", "WALL FINISHING", "PAINTS", "FALSE CEILING & PARTITION", "INTERIOR & CEILING DÉCOR", "GLASS", "STAIRS, RAMPS & ELEVATORS"],
  kitchen: ["KITCHEN FITTINGS", "KITCHEN APPLIANCES", "HOME APPLIANCES", "HARDWARE", "CHEMICALS & ADHESIVES", "CONSUMABLES"],
  tools: ["CONSTRUCTION TOOLS", "SAFETY & SECURITY", "Furniture", "Electrical & Networking", "Landscaping & Horticulture"],
};

const TYPE_LABEL_TO_DB_SLUG: Record<string, string> = {
  "BASIC BUILDING MATERIALS": "basic-building-materials",
  "PLUMBING MATERIALS": "plumbing-materials",
  "ELECTRICAL FITTINGS": "electrical-fittings",
  "WIRES & CABLES": "wires-cables",
  "ROOFING": "roofing",
  "DOORS & WINDOWS": "doors-windows",

  "FLOORING": "flooring",
  "WALL FINISHING": "wall-finishing",
  "PAINTS": "paints",
  "FALSE CEILING & PARTITION": "false-ceiling-partition",
  "INTERIOR & CEILING DÉCOR": "interior-ceiling-decor",
  "GLASS": "glass",
  "STAIRS, RAMPS & ELEVATORS": "stairs-ramps-elevators",

  "KITCHEN FITTINGS": "kitchen-fittings",
  "KITCHEN APPLIANCES": "kitchen-appliances",
  "HOME APPLIANCES": "home-appliances",
  "HARDWARE": "hardware",
  "CHEMICALS & ADHESIVES": "chemicals-adhesives",
  "CONSUMABLES": "consumables",

  "CONSTRUCTION TOOLS": "construction-tools",
  "SAFETY & SECURITY": "safety-security",
  "Furniture": "furniture",
  "Electrical & Networking": "electrical-and-networking",
  "Landscaping & Horticulture": "landscaping-horticulture",
};

function bySortThenName(a: TaxonRow, b: TaxonRow) {
  const sa = a.sort_order ?? 999999;
  const sb = b.sort_order ?? 999999;
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name);
}

function bySortThenValue(a: AttrValueRow, b: AttrValueRow) {
  const sa = a.sort_order ?? 999999;
  const sb = b.sort_order ?? 999999;
  if (sa !== sb) return sa - sb;
  return a.value.localeCompare(b.value);
}

function normName(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, " & ");
}

function parseLinks(text: string): string[] {
  return text
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MaterialsAddPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // Step 1: Group
  const [groupKey, setGroupKey] = useState<GroupKey>("core");

  // Step 2: Type label
  const [typeLabel, setTypeLabel] = useState<string>("");

  // IDs in DB
  const [typeId, setTypeId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [productGroupId, setProductGroupId] = useState<string>("");

  // Listing fields
  const [title, setTitle] = useState("");
  const [localName, setLocalName] = useState(""); // ✅ NEW
  const [description, setDescription] = useState("");
  const [photoLinksText, setPhotoLinksText] = useState("");
  const [videoLinksText, setVideoLinksText] = useState("");

  // Data
  const [allTaxons, setAllTaxons] = useState<TaxonRow[]>([]);
  const [loadingTaxons, setLoadingTaxons] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Product groups via Step-B mapping
  const [productGroupOptions, setProductGroupOptions] = useState<TaxonRow[]>([]);
  const [loadingPG, setLoadingPG] = useState(false);

  // Attributes
  const [attrs, setAttrs] = useState<AttrRow[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, AttrValueRow[]>>({});
  const [attrInput, setAttrInput] = useState<Record<string, string | string[]>>({});
  const [loadingAttrs, setLoadingAttrs] = useState(false);

  const [saving, setSaving] = useState(false);

  // ✅ Load ALL taxons once
  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setLoadingTaxons(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("material_taxons")
        .select("id,parent_id,kind,name,slug,sort_order,is_active")
        .or("is_active.is.null,is_active.eq.true")
        .in("kind", ["type", "category", "subcategory", "product_group"]);

      if (!alive) return;

      if (error) {
        setErrorMsg(error.message);
        setAllTaxons([]);
      } else {
        const rows = ((data ?? []) as TaxonRow[])
          .filter((r) => r.is_active !== false)
          .slice()
          .sort(bySortThenName);

        setAllTaxons(rows);

        if (rows.length === 0) {
          setErrorMsg(
            "No taxonomy rows returned. This is usually RLS (SELECT blocked) or no rows are active. Check policies for material_taxons."
          );
        }
      }

      setLoadingTaxons(false);
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const taxonById = useMemo(() => {
    const m = new Map<string, TaxonRow>();
    for (const t of allTaxons) m.set(t.id, t);
    return m;
  }, [allTaxons]);

  // DB types list
  const dbTypes = useMemo(() => {
    return allTaxons.filter((t) => t.kind === "type").slice().sort(bySortThenName);
  }, [allTaxons]);

  // Map: slug -> type
  const dbTypeBySlug = useMemo(() => {
    const m = new Map<string, TaxonRow>();
    for (const t of dbTypes) {
      const key = (t.slug ?? "").toLowerCase();
      if (key) m.set(key, t);
    }
    return m;
  }, [dbTypes]);

  // Map: normalized name -> type
  const dbTypeByNormName = useMemo(() => {
    const m = new Map<string, TaxonRow>();
    for (const t of dbTypes) m.set(normName(t.name), t);
    return m;
  }, [dbTypes]);

  // Type options for selected group (fixed list)
  const typeOptions = useMemo(() => {
    const list = GROUP_TO_TYPES[groupKey] ?? [];
    return list.map((label) => {
      const wantedSlug = (TYPE_LABEL_TO_DB_SLUG[label] ?? "").toLowerCase();
      const bySlug = wantedSlug ? dbTypeBySlug.get(wantedSlug) ?? null : null;
      const byName = dbTypeByNormName.get(normName(label)) ?? null;
      const db = bySlug ?? byName;
      return { label, dbType: db, missing: !db };
    });
  }, [groupKey, dbTypeBySlug, dbTypeByNormName]);

  // When group changes, reset all lower selections
  useEffect(() => {
    setTypeLabel("");
    setTypeId("");
    setCategoryId("");
    setSubcategoryId("");
    setProductGroupId("");
    setProductGroupOptions([]);
    setAttrs([]);
    setAttrValues({});
    setAttrInput({});
    setErrorMsg(null);
  }, [groupKey]);

  // When type label chosen -> resolve DB type id
  useEffect(() => {
    setErrorMsg(null);

    if (!typeLabel) {
      setTypeId("");
      setCategoryId("");
      setSubcategoryId("");
      setProductGroupId("");
      setProductGroupOptions([]);
      return;
    }

    const wantedSlug = (TYPE_LABEL_TO_DB_SLUG[typeLabel] ?? "").toLowerCase();
    const bySlug = wantedSlug ? dbTypeBySlug.get(wantedSlug) ?? null : null;
    const byName = dbTypeByNormName.get(normName(typeLabel)) ?? null;
    const db = bySlug ?? byName;

    if (!db) {
      setTypeId("");
      setCategoryId("");
      setSubcategoryId("");
      setProductGroupId("");
      setProductGroupOptions([]);
      return;
    }

    setTypeId(db.id);
    setCategoryId("");
    setSubcategoryId("");
    setProductGroupId("");
    setProductGroupOptions([]);
  }, [typeLabel, dbTypeBySlug, dbTypeByNormName]);

  // Category/Subcategory lists from taxons
  const categories = useMemo(() => {
    if (!typeId) return [];
    return allTaxons.filter((t) => t.kind === "category" && t.parent_id === typeId).slice().sort(bySortThenName);
  }, [allTaxons, typeId]);

  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return allTaxons.filter((t) => t.kind === "subcategory" && t.parent_id === categoryId).slice().sort(bySortThenName);
  }, [allTaxons, categoryId]);

  const selectedGroup = useMemo(() => GROUPS.find((g) => g.key === groupKey) ?? GROUPS[0], [groupKey]);
  const selectedCategory = useMemo(() => (categoryId ? taxonById.get(categoryId) ?? null : null), [taxonById, categoryId]);
  const selectedSubcategory = useMemo(
    () => (subcategoryId ? taxonById.get(subcategoryId) ?? null : null),
    [taxonById, subcategoryId]
  );
  const selectedProductGroup = useMemo(
    () => (productGroupId ? taxonById.get(productGroupId) ?? null : null),
    [taxonById, productGroupId]
  );

  // ✅ Auto-select subcategory
  useEffect(() => {
    if (!categoryId) {
      setSubcategoryId("");
      setProductGroupId("");
      setProductGroupOptions([]);
      return;
    }

    setSubcategoryId("");
    setProductGroupId("");
    setProductGroupOptions([]);

    if (subcategories.length === 0) return;

    if (subcategories.length === 1) {
      setSubcategoryId(subcategories[0].id);
      return;
    }

    const cat = taxonById.get(categoryId);
    const catName = cat?.name ?? "";
    const catSlug = (cat?.slug ?? "").toLowerCase();

    const match = subcategories.find((sc) => {
      const scSlug = (sc.slug ?? "").toLowerCase();
      return (catSlug && scSlug && scSlug === catSlug) || normName(sc.name) === normName(catName);
    });

    if (match) setSubcategoryId(match.id);
  }, [categoryId, subcategories, taxonById]);

  // ✅ When subcategory changes: load product groups via Step-B mapping table
  useEffect(() => {
    let alive = true;

    async function loadProductGroupsViaMapping() {
      setProductGroupId("");
      setProductGroupOptions([]);
      setAttrs([]);
      setAttrValues({});
      setAttrInput({});
      setErrorMsg(null);

      if (!subcategoryId) return;

      setLoadingPG(true);
      try {
        // Step-B mapping table
        const { data: mapRows, error: mapErr } = await supabase
          .from("material_subcategory_product_groups")
          .select("product_group_id")
          .eq("subcategory_id", subcategoryId);

        if (mapErr) throw mapErr;

        const pgIds = (mapRows ?? [])
          .map((r: any) => r.product_group_id)
          .filter(Boolean) as string[];

        if (pgIds.length === 0) {
          if (!alive) return;
          setProductGroupOptions([]);
          setLoadingPG(false);
          return;
        }

        // Get product_group taxon rows
        const { data: pgRows, error: pgErr } = await supabase
          .from("material_taxons")
          .select("id,parent_id,kind,name,slug,sort_order,is_active")
          .in("id", pgIds)
          .eq("kind", "product_group")
          .or("is_active.is.null,is_active.eq.true");

        if (pgErr) throw pgErr;

        const rows = ((pgRows ?? []) as TaxonRow[])
          .filter((r) => r.is_active !== false)
          .slice()
          .sort(bySortThenName);

        if (!alive) return;
        setProductGroupOptions(rows);

        // If only 1 product group, auto-select
        if (rows.length === 1) setProductGroupId(rows[0].id);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message ?? "Failed to load product groups");
      } finally {
        if (alive) setLoadingPG(false);
      }
    }

    loadProductGroupsViaMapping();
    return () => {
      alive = false;
    };
  }, [subcategoryId, supabase]);

  // Load attributes when product group selected
  useEffect(() => {
    let alive = true;

    async function loadAttrs() {
      setErrorMsg(null);

      if (!productGroupId) {
        setAttrs([]);
        setAttrValues({});
        setAttrInput({});
        return;
      }

      setLoadingAttrs(true);
      try {
        const { data: pga, error: pgaErr } = await supabase
          .from("material_product_group_attributes")
          .select("attribute_id, sort_order, is_required")
          .eq("product_group_id", productGroupId);

        if (pgaErr) throw pgaErr;

        const attrIds = (pga ?? []).map((r: any) => r.attribute_id).filter(Boolean);
        if (attrIds.length === 0) {
          if (!alive) return;
          setAttrs([]);
          setAttrValues({});
          setAttrInput({});
          return;
        }

        const { data: attrRows, error: attrErr } = await supabase
          .from("material_attributes")
          .select("id,name,input_type,unit,sort_order,is_active")
          .in("id", attrIds)
          .or("is_active.is.null,is_active.eq.true");

        if (attrErr) throw attrErr;

        const orderMap = new Map<string, number>();
        for (const r of pga ?? []) orderMap.set(r.attribute_id, r.sort_order ?? 999999);

        const sortedAttrs = (attrRows ?? [])
          .filter((a: any) => a.is_active !== false)
          .slice()
          .sort((a: AttrRow, b: AttrRow) => {
            const oa = orderMap.get(a.id) ?? (a.sort_order ?? 999999);
            const ob = orderMap.get(b.id) ?? (b.sort_order ?? 999999);
            if (oa !== ob) return oa - ob;
            return a.name.localeCompare(b.name);
          }) as AttrRow[];

        if (!alive) return;
        setAttrs(sortedAttrs);

        const selectAttrIds = sortedAttrs
          .filter((a) => a.input_type === "single_select" || a.input_type === "multi_select")
          .map((a) => a.id);

        if (selectAttrIds.length) {
          // ✅ Global + Product-group-specific values
          // Requires material_attribute_values.product_group_id nullable
          const { data: vals, error: vErr } = await supabase
            .from("material_attribute_values")
            .select("id,attribute_id,value,sort_order,is_active,product_group_id")
            .in("attribute_id", selectAttrIds)
            .or(`product_group_id.is.null,product_group_id.eq.${productGroupId}`)
            .or("is_active.is.null,is_active.eq.true");

          if (vErr) throw vErr;

          const map: Record<string, AttrValueRow[]> = {};
          for (const v of (vals ?? []) as AttrValueRow[]) {
            if (v.is_active === false) continue;
            if (!map[v.attribute_id]) map[v.attribute_id] = [];
            map[v.attribute_id].push(v);
          }
          for (const k of Object.keys(map)) map[k].sort(bySortThenValue);

          if (!alive) return;
          setAttrValues(map);
        } else {
          setAttrValues({});
        }

        const init: Record<string, string | string[]> = {};
        for (const a of sortedAttrs) init[a.id] = a.input_type === "multi_select" ? [] : "";
        if (!alive) return;
        setAttrInput(init);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message ?? "Failed to load attributes");
      } finally {
        if (alive) setLoadingAttrs(false);
      }
    }

    loadAttrs();
    return () => {
      alive = false;
    };
  }, [productGroupId, supabase]);

  const canSubmit = !!productGroupId && title.trim().length > 0;

  async function onSaveDraft() {
    setErrorMsg(null);

    if (!canSubmit) {
      setErrorMsg("Please complete Group → Type → Category → Subcategory → Product Group and enter Title.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        router.push(`/login?next=${encodeURIComponent("/materials/add")}`);
        return;
      }

      const attributes_payload: Record<string, any> = {};
      for (const a of attrs) attributes_payload[a.id] = attrInput[a.id];

      const photo_links = parseLinks(photoLinksText);
      const video_links = parseLinks(videoLinksText);

      const { error: insErr } = await supabase.from("material_listings").insert({
        user_id: user.id,
        title: title.trim(),
        local_name: localName.trim() ? localName.trim() : null, // ✅ NEW
        description: description.trim() || null,

        type_id: typeId || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        product_group_id: productGroupId,

        attributes: attributes_payload,

        photo_links,
        video_links,

        status: "draft",
      });

      if (insErr) throw insErr;
      router.push("/materials");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add Material Listing</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {loadingTaxons ? "Loading taxonomy..." : `Loaded ${allTaxons.length} taxonomy rows.`}
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
          {/* LEFT */}
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Step 1 — Select Group <span style={{ opacity: 0.6 }}>(required)</span>
                </label>
                <select
                  value={groupKey}
                  onChange={(e) => setGroupKey(e.target.value as GroupKey)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  {GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label} — {g.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Step 2 — Select Type <span style={{ opacity: 0.6 }}>(required)</span>
                </label>
                <select
                  value={typeLabel}
                  onChange={(e) => setTypeLabel(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">{loadingTaxons ? "Loading..." : "Select type"}</option>
                  {typeOptions.map((t) => (
                    <option key={t.label} value={t.label}>
                      {t.label}
                      {t.missing ? " (Missing in DB)" : ""}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  We do not remove any item. If a Type is missing in DB, it is shown as “(Missing in DB)” (not hidden).
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Step 3A — Select Category <span style={{ opacity: 0.6 }}>(required)</span>
                </label>
                <select
                  value={categoryId}
                  disabled={!typeId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setErrorMsg(null);
                  }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">
                    {!typeId ? "Select type first" : categories.length ? "Select category" : "No categories found"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Step 3B — Select Subcategory <span style={{ opacity: 0.6 }}>(required)</span>
                </label>
                <select
                  value={subcategoryId}
                  disabled={!categoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setErrorMsg(null);
                  }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">
                    {!categoryId ? "Select category first" : subcategories.length ? "Select subcategory" : "No subcategories found"}
                  </option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  Auto-rule: If only 1 subcategory exists (or matches category), it is auto-selected.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                  Step 3C — Select Product Group <span style={{ opacity: 0.6 }}>(required)</span>
                </label>
                <select
                  value={productGroupId}
                  disabled={!subcategoryId || loadingPG}
                  onChange={(e) => {
                    setProductGroupId(e.target.value);
                    setErrorMsg(null);
                  }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">
                    {!subcategoryId
                      ? "Select subcategory first"
                      : loadingPG
                      ? "Loading product groups..."
                      : productGroupOptions.length
                      ? "Select product group"
                      : "No product groups found (map Step-B first)"}
                  </option>
                  {productGroupOptions.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.name}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  Product groups come from <b>Step-B mapping</b> (material_subcategory_product_groups).
                </div>
              </div>

              {errorMsg ? (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 10, border: "1px solid #f2c", background: "#fff5fb" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
                  <div style={{ fontSize: 13 }}>{errorMsg}</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Selected Path</div>
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55 }}>
                <div>
                  Group: {selectedGroup.label} — {selectedGroup.hint}
                </div>
                <div>Type: {typeLabel || "—"}</div>
                <div>Category: {selectedCategory?.name ?? "—"}</div>
                <div>Subcategory: {selectedSubcategory?.name ?? "—"}</div>
                <div>Product Group: {selectedProductGroup?.name ?? "—"}</div>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "12px 0" }} />

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                    Title <span style={{ opacity: 0.6 }}>(required)</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Write your listing title"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  />
                </div>

                {/* ✅ Local/Regional name */}
                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                    Local / Regional Name <span style={{ opacity: 0.6 }}>(optional)</span>
                  </label>
                  <input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    placeholder="e.g., Raidak Sand, Torsha Sand, Chalu, 3-4 mixture..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, lineHeight: 1.4 }}>
                    Helps buyers find the same material using local market terms. This does not need fixed values.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write key specs, condition, service area, warranty..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Photo links (public URL)</label>
                  <textarea
                    value={photoLinksText}
                    onChange={(e) => setPhotoLinksText(e.target.value)}
                    placeholder={`Paste image URLs here.\nOne link per line OR separate by comma.\nExample:\nhttps://.../photo1.jpg\nhttps://.../photo2.png`}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6, lineHeight: 1.4 }}>
                    Note: Upload photos to Drive/Dropbox/website → set sharing to <b>Anyone with the link</b> → paste here.
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Video links (public URL)</label>
                  <textarea
                    value={videoLinksText}
                    onChange={(e) => setVideoLinksText(e.target.value)}
                    placeholder={`Paste video URLs here.\nOne link per line OR separate by comma.\nExample:\nhttps://youtu.be/xxxxx\nhttps://drive.google.com/...`}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6, lineHeight: 1.4 }}>
                    Note: Upload to YouTube (unlisted OK) / Drive → set public link → paste here.
                  </div>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "12px 0" }} />

              <div style={{ fontWeight: 700, marginBottom: 8 }}>Attributes</div>

              {!productGroupId ? (
                <div style={{ fontSize: 13, opacity: 0.8 }}>Select a product group to load attributes.</div>
              ) : loadingAttrs ? (
                <div style={{ fontSize: 13, opacity: 0.8 }}>Loading attributes...</div>
              ) : attrs.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  No attributes mapped to this product group yet (admin → Mapping page → map attributes).
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {attrs.map((a) => {
                    const unit = a.unit ? ` (${a.unit})` : "";
                    const inputType = a.input_type;

                    if (inputType === "single_select") {
                      const opts = attrValues[a.id] ?? [];
                      return (
                        <div key={a.id}>
                          <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                            {a.name}
                            {unit}
                          </label>
                          <select
                            value={String(attrInput[a.id] ?? "")}
                            onChange={(e) => setAttrInput((p) => ({ ...p, [a.id]: e.target.value }))}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                          >
                            <option value="">Select</option>
                            {opts.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (inputType === "multi_select") {
                      const opts = attrValues[a.id] ?? [];
                      const current = (attrInput[a.id] as string[]) ?? [];
                      return (
                        <div key={a.id}>
                          <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                            {a.name}
                            {unit}
                          </label>
                          <div
                            style={{
                              border: "1px solid #ddd",
                              borderRadius: 10,
                              padding: 10,
                              display: "grid",
                              gap: 6,
                              maxHeight: 220,
                              overflow: "auto",
                            }}
                          >
                            {opts.map((v) => {
                              const checked = current.includes(v.id);
                              return (
                                <label key={v.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...current, v.id]))
                                        : current.filter((x) => x !== v.id);
                                      setAttrInput((p) => ({ ...p, [a.id]: next }));
                                    }}
                                  />
                                  {v.value}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    if (inputType === "boolean") {
                      const checked = String(attrInput[a.id] ?? "") === "true";
                      return (
                        <div key={a.id}>
                          <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                            {a.name}
                            {unit}
                          </label>
                          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setAttrInput((p) => ({ ...p, [a.id]: e.target.checked ? "true" : "false" }))}
                            />
                            Yes
                          </label>
                        </div>
                      );
                    }

                    return (
                      <div key={a.id}>
                        <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                          {a.name}
                          {unit}
                        </label>
                        <input
                          value={String(attrInput[a.id] ?? "")}
                          onChange={(e) => setAttrInput((p) => ({ ...p, [a.id]: e.target.value }))}
                          placeholder={inputType === "number" ? "Enter number" : "Enter value"}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={saving || !canSubmit}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: saving || !canSubmit ? "#ddd" : "#111",
                    color: saving || !canSubmit ? "#444" : "#fff",
                    cursor: saving || !canSubmit ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/materials")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                If insert fails due to missing columns, tell me your exact <code>material_listings</code> columns and I’ll adjust only the payload.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
