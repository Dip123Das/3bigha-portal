// app/materials/add/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getHandoffIdFromLocation,
  loadCostInventoryHandoff,
  confirmCostInventoryHandoff,
  type CostInventoryHandoffPrefill,
} from "@/lib/cost-execution/handoff-prefill";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  loadVendorTaxonomyExtensions,
  type VendorExtensionRow,
} from "@/lib/vendors/loadVendorTaxonomyExtensions";
import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";

import {
  buildVendorSmartSuggestions,
} from "@/lib/vendors/vendorSmartSuggestions";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";

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
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);

  // Inventory foundation
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [skuCode, setSkuCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [stockUnit, setStockUnit] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [godownNo, setGodownNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [rackNo, setRackNo] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [loadCapacity, setLoadCapacity] = useState("");
  const [recentInventoryMemory, setRecentInventoryMemory] = useState<
  VendorListingMemoryRow[]
>([]);

  const smartInventorySuggestions = buildVendorSmartSuggestions(
    recentInventoryMemory,
    4
  );

  // Data
  const [allTaxons, setAllTaxons] = useState<TaxonRow[]>([]);
  const [vendorExtensions, setVendorExtensions] = useState<VendorExtensionRow[]>([]);
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
  const [costHandoff, setCostHandoff] = useState<CostInventoryHandoffPrefill | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiBuyerType, setAiBuyerType] = useState<"home_owner" | "contractor" | "mason" | "vendor">("home_owner");

  useEffect(() => {
  const handoffId = getHandoffIdFromLocation();
  if (!handoffId) return;

  void (async () => {
    try {
      const handoff = await loadCostInventoryHandoff(
        supabase,
        handoffId,
        "seller_material_inventory"
      );

      setCostHandoff(handoff);
      setInventoryEnabled(true);

      const payload = handoff.payload;
      if (payload.outputName) setTitle(String(payload.outputName));
      if (payload.completedQuantity != null) {
        setOpeningStock(String(payload.completedQuantity));
      }
      if (payload.unitProductionCost != null) {
        setPurchasePrice(String(payload.unitProductionCost));
      }

      setDescription((current) =>
        current ||
        "Finished production transferred from the 3BOS Cost Register. Review all product and marketplace details before publishing."
      );
    } catch (error: any) {
      setErrorMsg(
        error?.message ||
        "Could not load finished-production handoff."
      );
    }
  })();
}, [supabase]);

useEffect(() => {
  let alive = true;

  async function loadVendorData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!alive || !user?.id) return;

    const rows = await loadVendorTaxonomyExtensions({
      module: "materials",
      userId: user.id,
    });

    if (!alive) return;

    setVendorExtensions(rows);
  }

  loadVendorData();

  return () => {
    alive = false;
  };
}, [supabase]);

useEffect(() => {
  let alive = true;

  async function loadRecentInventoryMemory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!alive || !user?.id) return;

    const rows = await loadVendorListingMemory({
      userId: user.id,
      module: "materials",
      memoryType: "inventory",
      limit: 6,
    });

    if (!alive) return;

    setRecentInventoryMemory(rows);
  }

  loadRecentInventoryMemory();

  return () => {
    alive = false;
  };
}, [supabase]);

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
  const vendorProductGroups = useMemo(() => {
    if (!subcategoryId) return [];

    return vendorExtensions
      .filter((x) => x.level === "product_group" && x.parent_id === subcategoryId)
      .map((x) => ({
        id: `vendor-${x.id}`,
        parent_id: x.parent_id,
        kind: "product_group" as const,
        name: x.label,
        slug: null,
        sort_order: 999999,
        is_active: true,
      }));
  }, [vendorExtensions, subcategoryId]);

  const selectedProductGroup = useMemo(
    () =>
      productGroupId
        ? productGroupOptions.find((pg) => pg.id === productGroupId) ??
          taxonById.get(productGroupId) ??
          null
        : null,
    [productGroupId, productGroupOptions, taxonById]
  );

  const isVendorProductGroup = productGroupId.startsWith("vendor-");

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
        const { data: mapRows, error: mapErr } = await supabase
          .from("material_subcategory_product_groups")
          .select("product_group_id")
          .eq("subcategory_id", subcategoryId);

        if (mapErr) throw mapErr;

        const pgIds = (mapRows ?? [])
          .map((r: any) => r.product_group_id)
          .filter(Boolean) as string[];

        let adminRows: TaxonRow[] = [];

        if (pgIds.length > 0) {
          const { data: pgRows, error: pgErr } = await supabase
            .from("material_taxons")
            .select("id,parent_id,kind,name,slug,sort_order,is_active")
            .in("id", pgIds)
            .eq("kind", "product_group")
            .or("is_active.is.null,is_active.eq.true");

          if (pgErr) throw pgErr;

          adminRows = ((pgRows ?? []) as TaxonRow[]).filter(
            (r) => r.is_active !== false
          );
        }

        const mergedRows = [...adminRows, ...vendorProductGroups].sort(bySortThenName);

        if (!alive) return;

        setProductGroupOptions(mergedRows);

        if (mergedRows.length === 1) {
          setProductGroupId(mergedRows[0].id);
        }
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
  }, [subcategoryId, supabase, vendorProductGroups]);

  // Load attributes when product group selected
  useEffect(() => {
    let alive = true;

    async function loadAttrs() {
      setErrorMsg(null);

      if (!productGroupId || isVendorProductGroup) {
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
  }, [productGroupId, isVendorProductGroup, supabase]);

  const canSubmit = !!productGroupId && title.trim().length > 0;

  function getAttrDisplayValue(a: AttrRow) {
    const raw = attrInput[a.id];

    if (a.input_type === "multi_select") {
      const ids = Array.isArray(raw) ? raw : [];
      const opts = attrValues[a.id] ?? [];
      return ids
        .map((id) => opts.find((v) => v.id === id)?.value)
        .filter(Boolean)
        .join(", ");
    }

    if (a.input_type === "single_select") {
      const opts = attrValues[a.id] ?? [];
      return opts.find((v) => v.id === raw)?.value ?? "";
    }

    if (a.input_type === "boolean") {
      return String(raw ?? "") === "true" ? "Yes" : "No";
    }

    return String(raw ?? "").trim();
  }

  function buildMaterialAiContext(target: string) {
    const materialText = [
      title,
      localName,
      selectedProductGroup?.name,
      selectedSubcategory?.name,
      selectedCategory?.name,
      typeLabel,
      selectedGroup.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const detectedMaterial =
      /cement|opc|ppc|psc|concrete|rmc/.test(materialText)
        ? "cement / concrete"
        : /steel|tmt|rod|bar|sariya|rebar|iron/.test(materialText)
        ? "steel / TMT bar"
        : /sand|balu|baalu|river sand|m sand|stone dust/.test(materialText)
        ? "sand / aggregates"
        : /brick|block|aac|fly ash|paver/.test(materialText)
        ? "brick / block"
        : /tile|tiles|marble|granite|flooring/.test(materialText)
        ? "tiles / flooring"
        : /paint|primer|putty|wall finish|distemper|emulsion/.test(materialText)
        ? "paint / wall finishing"
        : /pipe|pvc|cpvc|upvc|plumbing|fitting/.test(materialText)
        ? "plumbing material"
        : /wire|cable|switch|mcb|electrical|light|fan/.test(materialText)
        ? "electrical material"
        : /door|window|glass|aluminium|aluminum/.test(materialText)
        ? "doors / windows / glass"
        : /adhesive|chemical|sealant|waterproof/.test(materialText)
        ? "chemicals / adhesives"
        : /tool|machine|drill|cutter|safety|helmet/.test(materialText)
        ? "tools / safety material"
        : /appliance|chimney|hob|sink|kitchen/.test(materialText)
        ? "kitchen / home appliance"
        : "selected material";

    const buyerTypeLabel =
      aiBuyerType === "contractor"
        ? "contractor / bulk buyer"
        : aiBuyerType === "mason"
        ? "mason / site worker"
        : aiBuyerType === "vendor"
        ? "reseller / vendor"
        : "home owner / small buyer";

    const attrLines = attrs
      .map((a) => {
        const value = getAttrDisplayValue(a);
        if (!value) return "";
        return `${a.name}${a.unit ? ` (${a.unit})` : ""}: ${value}`;
      })
      .filter(Boolean);

    return `
You are an expert construction-material listing assistant for 3bigha.com.

Generate only this section: ${target}

Detected material focus: ${detectedMaterial}
Target buyer: ${buyerTypeLabel}

STRICT QUALITY RULES:
- Write material-specific content only. Never write generic marketplace text.
- Use the selected Product Group, title, local name and attributes as the main source.
- Mention practical site-use points that a buyer actually checks before purchase.
- Do not claim BIS/ISI/lab-tested/warranty/brand guarantee unless entered by seller.
- Do not create fake numbers, fake certificates, fake test reports or fake durability claims.
- Keep language trustworthy, simple and marketplace-ready.
- Output 4 to 6 short bullet points only.
- Each bullet must be useful and different.
- Avoid repeated phrases.

MATERIAL-SPECIFIC WRITING RULES:
- Cement / concrete: grade, setting, strength use, storage, freshness, plaster/RCC/PCC suitability.
- Steel / TMT: grade, diameter, bendability, rust condition, structural use, weight/length awareness.
- Sand / aggregate: source, grain size, cleanliness, silt/dust caution, plaster/concrete suitability.
- Brick / block: size, strength, water absorption, edge finish, wall use, breakage handling.
- Tiles / flooring: size, finish, slip resistance, installation area, shade/batch caution.
- Paint / wall finishing: surface use, coverage awareness, interior/exterior suitability, preparation.
- Plumbing: size, pressure use, fitting compatibility, leakage caution, installation guidance.
- Electrical: rating, safety use, load suitability, installation by electrician.
- Doors/windows/glass: material, thickness, frame use, weather exposure, installation.
- Chemicals/adhesives: application area, curing/use guidance, surface preparation, storage caution.
- Tools/safety: practical use, durability, handling, site safety.
- Appliances/fittings: installation, utility, compatibility, buyer checking points.

Selected path:
Group: ${selectedGroup.label}
Type: ${typeLabel || "Not selected"}
Category: ${selectedCategory?.name ?? "Not selected"}
Subcategory: ${selectedSubcategory?.name ?? "Not selected"}
Product Group: ${
  selectedProductGroup?.name ||
  selectedSubcategory?.name ||
  selectedCategory?.name ||
  "Not selected"
}

Listing title: ${title.trim() || "Not entered"}
Local / Regional Name: ${localName.trim() || "Not entered"}

Selected attributes:
${attrLines.length ? attrLines.join("\n") : "No attributes entered yet."}
`.trim();
  }

  function upsertDescriptionSection(sectionTitle: string, sectionBody: string) {
    const cleanBody = sectionBody.trim();
    if (!cleanBody) return;

    const current = description.trim();
    const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionRegex = new RegExp(`\\n?\\n?${escapedTitle}\\n[\\s\\S]*?(?=\\n\\n[A-Z][A-Za-z &]+\\n|$)`, "m");

    const nextSection = `${sectionTitle}\n${cleanBody}`;

    if (sectionRegex.test(current)) {
      setDescription(current.replace(sectionRegex, `\n\n${nextSection}`).trim());
      return;
    }

    setDescription(current ? `${current}\n\n${nextSection}` : nextSection);
  }

  async function runMaterialAiFill(sectionTitle: string) {
    setErrorMsg(null);

    if (!categoryId || !title.trim()) {
      setErrorMsg("Please select Category and enter Title before using AI Smart-Fill.");
      return;
    }

    setAiLoading(sectionTitle);
    try {
      const prompt = buildMaterialAiContext(sectionTitle);

      const res = await fetch("/api/ai/smart-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          module: "materials",
          action: "generate_description",
          tone: "professional",
          input: {
            title: title.trim(),
            localName: localName.trim(),
            sectionTitle,
            prompt,
            existingText: description,
            attributes: {
              group: selectedGroup.label,
              type: typeLabel,
              category: selectedCategory?.name ?? "",
              subcategory: selectedSubcategory?.name ?? "",
              productGroup:
                selectedProductGroup?.name ||
                selectedSubcategory?.name ||
                selectedCategory?.name ||
                "",
              buyerType: aiBuyerType,
              materialAttributes: attrs.map((a) => ({
                name: a.name,
                unit: a.unit,
                input_type: a.input_type,
                value: getAttrDisplayValue(a),
              })),
            },
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "AI Smart-Fill failed");
      }

      const generated =
        data?.result?.description ||
        data?.result?.text ||
        data?.text ||
        data?.description ||
        data?.content ||
        data?.value ||
        data?.data?.text ||
        data?.data?.description ||
        "";

      if (!String(generated).trim()) {
        throw new Error("AI Smart-Fill returned empty content.");
      }

      upsertDescriptionSection(sectionTitle, String(generated));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "AI Smart-Fill failed");
    } finally {
      setAiLoading(null);
    }
  }

  function getPriceTodayHref() {
    const materialName =
      selectedProductGroup?.name ||
      selectedSubcategory?.name ||
      selectedCategory?.name ||
      title ||
      localName ||
      "";

    const params = new URLSearchParams();

    if (materialName.trim()) params.set("q", materialName.trim());
    if (selectedCategory?.name) params.set("category", selectedCategory.name);
    if (selectedSubcategory?.name) params.set("subcategory", selectedSubcategory.name);
    if (selectedProductGroup?.name) params.set("productGroup", selectedProductGroup.name);

    return `/price-today${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function saveMaterialPriceTodayContext() {
    if (typeof window === "undefined") return;

    const materialName =
      selectedProductGroup?.name ||
      selectedSubcategory?.name ||
      selectedCategory?.name ||
      title ||
      localName ||
      "";

    window.localStorage.setItem(
      "3bigha_price_today_prefill",
      JSON.stringify({
        source: "materials_ai",
        q: materialName.trim(),
        category: selectedCategory?.name ?? "",
        subcategory: selectedSubcategory?.name ?? "",
        productGroup: selectedProductGroup?.name ?? "",
        type: typeLabel ?? "",
        title: title.trim(),
        localName: localName.trim(),
        createdAt: new Date().toISOString(),
      })
    );
  }

  async function runAllMaterialAiFill() {
    const sections = [
      "Technical Specifications",
      "Durability & Weather Resistance",
      "Usage Guidance",
      "Buyer Trust Description",
    ];

    for (const sectionTitle of sections) {
      await runMaterialAiFill(sectionTitle);
    }
  }


  useEffect(() => {
    if (smartInventorySuggestions.length === 0) return;

    const top = smartInventorySuggestions[0]?.memory;
    const inv = top?.payload?.inventory ?? {};

    if (!stockUnit && inv.stock_unit) {
      setStockUnit(String(inv.stock_unit));
    }

    if (!purchasePrice && inv.purchase_price) {
      setPurchasePrice(String(inv.purchase_price));
    }

    if (!sellingPrice && inv.selling_price) {
      setSellingPrice(String(inv.selling_price));
    }

    if (!vehicleType && inv.vehicle_type) {
      setVehicleType(String(inv.vehicle_type));
    }
  }, [
    smartInventorySuggestions,
    stockUnit,
    purchasePrice,
    sellingPrice,
    vehicleType,
  ]);

  function applyInventoryMemory(memory: VendorListingMemoryRow) {
    const inv = memory.payload?.inventory ?? {};

    setStockUnit(inv.stock_unit ?? "");
    setPurchasePrice(inv.purchase_price ?? "");
    setSellingPrice(inv.selling_price ?? "");
    setReorderLevel(inv.reorder_level ?? "");

    setGodownNo(inv.godown_no ?? "");
    setRoomNo(inv.room_no ?? "");
    setRackNo(inv.rack_no ?? "");

    setVehicleType(inv.vehicle_type ?? "");
    setLoadCapacity(inv.load_capacity ?? "");

    if (memory.payload?.description_template) {
      setDescription(memory.payload.description_template);
    }
  }

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

      const uploadedPhotos = mediaAssets
        .filter((asset) => asset.kind === "image")
        .map((asset) => asset.url);

      const uploadedVideos = mediaAssets
        .filter((asset) => asset.kind === "video")
        .map((asset) => asset.url);

      const media_links = {
        photos: Array.from(new Set([...uploadedPhotos, ...parseLinks(photoLinksText)])),
        videos: Array.from(new Set([...uploadedVideos, ...parseLinks(videoLinksText)])),
        media_assets: mediaAssets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          bucket: asset.bucket,
          path: asset.path,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
          kind: asset.kind,
        })),
      };

      let geography: any = null;

      try {
        const { data: vendorProfile } = await supabase
          .from("business_profiles")
          .select("state,district,city,locality,pincode,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (vendorProfile?.geo_state_id) {
          geography = {
            geo_state_id: vendorProfile.geo_state_id,
            geo_district_id: vendorProfile.geo_district_id,
            geo_subdivision_id: vendorProfile.geo_subdivision_id,
            geo_block_id: vendorProfile.geo_block_id,
            geo_place_id: vendorProfile.geo_place_id,
          };
        } else if (vendorProfile) {
          const geoRes = await fetch("/api/admin/geography/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state: vendorProfile.state,
              district: vendorProfile.district,
              city: vendorProfile.city,
              locality: vendorProfile.locality,
              pincode: vendorProfile.pincode,
            }),
          });

          const geoJson = await geoRes.json().catch(() => null);
          geography = geoJson?.result || null;
        }
      } catch {
        geography = null;
      }

      const { count: existingMaterialCount } = await supabase
        .from("material_listings")
        .select("id", { count: "exact", head: true })
        .eq("vendor_user_id", user.id);

      const { data: createdMaterial, error: insErr } = await supabase.from("material_listings").insert({
        vendor_user_id: user.id,
        title: title.trim(),
        local_name: localName.trim() ? localName.trim() : null,
        description: description.trim() || null,

        type_id: typeId || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        product_group_id: isVendorProductGroup ? null : productGroupId || null,

        attributes: {
          ...attributes_payload,
          vendor_private_product_group: isVendorProductGroup
            ? {
                id: productGroupId.replace("vendor-", ""),
                name: selectedProductGroup?.name ?? "",
                subcategory_id: subcategoryId,
                source: "vendor_taxonomy_extensions",
              }
            : null,
          media_links,
          inventory: {
            enabled: inventoryEnabled,
            sku_code: skuCode.trim() || null,
            barcode: barcode.trim() || null,
            opening_stock: openingStock.trim() || null,
            current_stock: 0,
            stock_unit: stockUnit.trim() || null,
            purchase_price: purchasePrice.trim() || null,
            selling_price: sellingPrice.trim() || null,
            reorder_level: reorderLevel.trim() || null,
            godown_no: godownNo.trim() || null,
            room_no: roomNo.trim() || null,
            rack_no: rackNo.trim() || null,
            vehicle_type: vehicleType.trim() || null,
            vehicle_number: vehicleNumber.trim() || null,
            load_capacity: loadCapacity.trim() || null,
            inventory_source: "material_add_form",
            created_at: new Date().toISOString(),
          },
        },

        geo_state_id: geography?.geo_state_id || null,
        geo_district_id: geography?.geo_district_id || null,
        geo_subdivision_id: geography?.geo_subdivision_id || null,
        geo_block_id: geography?.geo_block_id || null,
        geo_place_id: geography?.geo_place_id || null,

        status: "draft",
      }).select("id").single();

      if (insErr) throw insErr;

      const initialStockQuantity = Math.max(
        0,
        Number(openingStock || 0)
      );

      if (
        inventoryEnabled &&
        createdMaterial?.id &&
        initialStockQuantity > 0
      ) {
        const initialTransactionType = costHandoff
          ? "production_receipt"
          : "opening_stock";

        const { error: initialStockError } =
          await supabase.rpc(
            "post_bos_material_inventory_transaction",
            {
              target_material_listing_id: createdMaterial.id,
              target_transaction_type: initialTransactionType,
              target_quantity: initialStockQuantity,
              target_unit: stockUnit.trim() || null,
              target_unit_cost:
                purchasePrice.trim() === ""
                  ? null
                  : Math.max(
                      0,
                      Number(purchasePrice || 0)
                    ),
              target_source_module: costHandoff
                ? "cost_register"
                : "materials_add",
              target_source_reference_type: costHandoff
                ? "cost_inventory_handoff"
                : "material_listing_creation",
              target_source_reference_id: costHandoff
                ? costHandoff.handoffId
                : String(createdMaterial.id),
              target_idempotency_key:
                `material-initial-stock:${createdMaterial.id}`,
              target_note: costHandoff
                ? "Finished production received into seller inventory"
                : "Opening stock recorded when inventory item was created",
              target_metadata: {
                inventory_enabled: inventoryEnabled,
                source: costHandoff
                  ? "finished_output_handoff"
                  : "material_add_form",
              },
            }
          );

        if (initialStockError) throw initialStockError;
      }

      if (Number(existingMaterialCount || 0) === 0) {
        trackVendorConversionClient({
          eventType: "first_listing_created",
          module: "materials",
          source: "materials_add_page",
          label: "First Material Listing Created",
          metadata: {
            title: title.trim(),
            categoryId,
            subcategoryId,
            productGroupId,
          },
        });
      }

if (costHandoff && createdMaterial?.id) {
  await confirmCostInventoryHandoff({
    supabase,
    handoff: costHandoff,
    destinationRecordIds: [String(createdMaterial.id)],
    transferredQuantity: Number(
      costHandoff.payload.completedQuantity ||
      openingStock ||
      0
    ),
  });
}

// ---------- Save reusable operational memory ----------
try {
  await saveVendorListingMemory({
    userId: user.id,
    module: "materials",
    memoryType: "inventory",
    title:
      selectedProductGroup?.name ||
      title.trim() ||
      "Material Listing Setup",

    payload: {
      type_id: typeId || null,
      category_id: categoryId || null,
      subcategory_id: subcategoryId || null,

      product_group: selectedProductGroup
        ? {
            id: productGroupId,
            name: selectedProductGroup.name,
          }
        : null,

      inventory: {
        stock_unit: stockUnit.trim() || null,
        purchase_price: purchasePrice.trim() || null,
        selling_price: sellingPrice.trim() || null,
        reorder_level: reorderLevel.trim() || null,

        godown_no: godownNo.trim() || null,
        room_no: roomNo.trim() || null,
        rack_no: rackNo.trim() || null,

        vehicle_type: vehicleType.trim() || null,
        load_capacity: loadCapacity.trim() || null,
      },

      description_template: description.trim() || null,

      saved_from: "materials_add_page",
      saved_at: new Date().toISOString(),
    },
  });
} catch (memoryErr) {
  console.error("Vendor memory save failed", memoryErr);
}

router.push("/materials");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Material Listing</h1>
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
                      {String(pg.id).startsWith("vendor-") ? " • My Added Option" : ""}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  Product groups come from approved master options. Your own saved variations will appear here as <b>My Added Option</b>.
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

                <div
                  style={{
                    border: "1px solid #bbf7d0",
                    background: "#ffffff",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 900 }}>
                    <input
                      type="checkbox"
                      checked={inventoryEnabled}
                      onChange={(e) => setInventoryEnabled(e.target.checked)}
                    />
                    Link this material with shop / godown inventory
                  </label>

                  <div style={{ marginTop: 8, fontSize: 12, color: "#047857", fontWeight: 800, lineHeight: 1.5 }}>
                    This will help vendors manage online stock, offline billing, godown location, rack search and future inventory reports.
                  </div>

                  {recentInventoryMemory.length > 0 ? (
                    <div
                      style={{
                        marginTop: 12,
                        marginBottom: 10,
                        border: "1px solid #dbeafe",
                        background: "#f8fbff",
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          marginBottom: 8,
                          color: "#1d4ed8",
                        }}
                      >
                        Suggested For You
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {smartInventorySuggestions.map((suggestion) => {
                          const memory = suggestion.memory;

                          return (
                            <button
                              key={suggestion.key}
                              type="button"
                              onClick={() => applyInventoryMemory(memory)}
                              style={{
                                border: "1px solid #bfdbfe",
                                background: "#fff",
                                borderRadius: 999,
                                padding: "8px 12px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ fontWeight: 800 }}>
                                {suggestion.title}
                              </div>

                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 10,
                                  opacity: 0.72,
                                  fontWeight: 600,
                                }}
                              >
                                {suggestion.reason}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          opacity: 0.72,
                          lineHeight: 1.4,
                        }}
                      >
                        Smart suggestions based on your frequently reused inventory, pricing and delivery workflows.
                      </div>
                    </div>
                  ) : null}

                  {inventoryEnabled ? (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                      <input value={skuCode} onChange={(e) => setSkuCode(e.target.value)} placeholder="SKU Code" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode / Item Code" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} placeholder="Opening Stock" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <div style={{ display: "grid", gap: 4 }}>
                        <input value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} placeholder="Unit: bag / pcs / cft / kg" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                        {!stockUnit && smartInventorySuggestions.length > 0 ? (
                          <div style={{ fontSize: 10, opacity: 0.65 }}>
                            Suggested from your previous workflow
                          </div>
                        ) : null}
                      </div>
                      <input value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Purchase Price" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="Selling Price" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="Low Stock Alert Level" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={godownNo} onChange={(e) => setGodownNo(e.target.value)} placeholder="Godown No." style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={roomNo} onChange={(e) => setRoomNo(e.target.value)} placeholder="Room No." style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={rackNo} onChange={(e) => setRackNo(e.target.value)} placeholder="Rack No." style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="Vehicle Type: truck / tractor / dumper" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Vehicle No." style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                      <input value={loadCapacity} onChange={(e) => setLoadCapacity(e.target.value)} placeholder="Load Capacity: 300 cft / 10 ton" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>AI Smart-Fill</label>

                  <select
                    value={aiBuyerType}
                    onChange={(e) => setAiBuyerType(e.target.value as typeof aiBuyerType)}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 10,
                      border: "1px solid #d9e7ff",
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    <option value="home_owner">Target: Home Owner / Small Buyer</option>
                    <option value="contractor">Target: Contractor / Bulk Buyer</option>
                    <option value="mason">Target: Mason / Site Worker</option>
                    <option value="vendor">Target: Reseller / Vendor</option>
                  </select>

                  <button
                    type="button"
                    disabled={!!aiLoading || !categoryId || !title.trim()}
                    onClick={runAllMaterialAiFill}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #bbf7d0",
                      background: !!aiLoading || !categoryId || !title.trim() ? "#f1f5f9" : "#f0fdf4",
                      color: "#14532d",
                      cursor: !!aiLoading || !categoryId || !title.trim() ? "not-allowed" : "pointer",
                      fontSize: 13,
                      fontWeight: 900,
                      marginBottom: 8,
                    }}
                  >
                    {aiLoading ? `Generating ${aiLoading}...` : "✨ Generate Complete Buyer-Ready Description"}
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      "Technical Specifications",
                      "Durability & Weather Resistance",
                      "Usage Guidance",
                      "Buyer Trust Description",
                    ].map((sectionTitle) => (
                      <button
                        key={sectionTitle}
                        type="button"
                        disabled={!!aiLoading || !categoryId || !title.trim()}
                        onClick={() => runMaterialAiFill(sectionTitle)}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 10,
                          border: "1px solid #d9e7ff",
                          background: !!aiLoading || !categoryId || !title.trim() ? "#f1f5f9" : "#f8fbff",
                          color: "#0f172a",
                          cursor: !!aiLoading || !categoryId || !title.trim() ? "not-allowed" : "pointer",
                          fontSize: 12,
                          fontWeight: 800,
                          textAlign: "left",
                        }}
                      >
                        {aiLoading === sectionTitle ? "Generating..." : `✨ ${sectionTitle}`}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72, lineHeight: 1.4 }}>
                    Level 10 AI uses Product Group, local name, attributes and buyer type to write material-specific content.
                  </div>

                  {selectedProductGroup?.name &&
                  /cement|steel|tmt|rod|bar|sand|balu|brick|block|stone|aggregate|chips|rcc|concrete/i.test(
                    selectedProductGroup.name
                  ) ? (
                    <button
                      type="button"
                      onClick={() => {
                        saveMaterialPriceTodayContext();
                        router.push(getPriceTodayHref());
                      }}
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 10,
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        fontSize: 12,
                        fontWeight: 800,
                        lineHeight: 1.45,
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#9a3412",
                      }}
                    >
                      📊 Prices of this material may change frequently. Check today&apos;s local market trend before publishing →
                    </button>
                  ) : null}

                  {productGroupId && title.trim().length > 5 && !description.trim() ? (
                    <div
                      onClick={runAllMaterialAiFill}
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 10,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        fontSize: 12,
                        color: "#1d4ed8",
                        fontWeight: 800,
                        cursor: aiLoading ? "not-allowed" : "pointer",
                        lineHeight: 1.45,
                      }}
                    >
                      ✨ Generate smart material description using AI
                    </div>
                  ) : null}
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

                <UniversalMediaUploader
                  module="materials"
                  value={mediaAssets}
                  onChange={setMediaAssets}
                  label="Material photos / videos"
                  helperText="Take product photos, upload clear images, or record a short video showing stock, quality, size, packaging or site delivery."
                  allowImages
                  allowVideos
                  allowDocuments={false}
                  maxFiles={12}
                
                  uploadStrategy="trusted"

                  mandatoryTrustedCaptures={1}

                  inlineCamera

                  cameraFacing="environment"

                  cameraOnly={false}
/>

                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 900, color: "#374151" }}>
                    Advanced: paste existing photo/video URLs
                  </summary>

                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    <div>
                      <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Photo links (public URL)</label>
                      <textarea
                        value={photoLinksText}
                        onChange={(e) => setPhotoLinksText(e.target.value)}
                        placeholder={`Optional. Paste image URLs here.\nOne link per line OR separate by comma.`}
                        rows={3}
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
                      <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Video links (public URL)</label>
                      <textarea
                        value={videoLinksText}
                        onChange={(e) => setVideoLinksText(e.target.value)}
                        placeholder={`Optional. Paste video URLs here.\nOne link per line OR separate by comma.`}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  </div>
                </details>
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
