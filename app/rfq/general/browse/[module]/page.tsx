// app/rfq/general/browse/[module]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RfqModule = "materials" | "services" | "rentals" | "properties";
type PickMode = "hint" | "item";

type Group = {
  key: string;
  title: string;
  items: string[];
};

type TaxonKind = "type" | "category" | "subcategory" | "product_group";
type Taxon = {
  id: string;
  name: string;
  slug: string | null;
  kind: TaxonKind;
  parent_id: string | null;
};

function moduleLabel(m: RfqModule) {
  if (m === "materials") return "Materials";
  if (m === "services") return "Services";
  if (m === "rentals") return "Rentals";
  return "Properties";
}

function norm(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function contains(hay: string, needle: string) {
  return norm(hay).toLowerCase().includes(norm(needle).toLowerCase());
}

/** ✅ Curated lists for non-material modules (keep as you already use) */
const SERVICES_GROUPS: Group[] = [
  {
    key: "turnkey",
    title: "Turnkey & Construction (Killing Part)",
    items: [
      "Turnkey house construction (complete package)",
      "House construction (labour + materials)",
      "Civil contractor / building contractor",
      "Boundary wall construction",
      "Demolition work",
      "Roofing / shed / structure work",
      "Waterproofing work",
      "Septic tank / soak pit",
      "Borewell / deep tubewell",
    ],
  },
  {
    key: "professional",
    title: "Professional Services",
    items: [
      "Architect / building design",
      "Engineer (civil / structural)",
      "Interior design consultation",
      "3D elevation / 3D plan",
      "Site supervision",
      "Vastu consultation",
      "Survey / measurement",
      "Estimate / BOQ preparation",
      "DPR consultant",
      "Quantity surveyor",
      "Project manager",
    ],
  },
  {
    key: "legal",
    title: "Legal & Documentation Services",
    items: [
      "Sale deed / registration assistance",
      "Agreement drafting (sale / rent / development)",
      "Land mutation / records correction",
      "Property verification / due diligence",
      "Court / legal case assistance",
      "NOC / permission assistance",
      "Loan / bank documentation help",
      "Title search (30-year search)",
      "Encumbrance certificate (EC) assistance",
    ],
  },
  {
    key: "skilled",
    title: "Skilled Work & Repairs",
    items: [
      "Electrical wiring",
      "Plumbing work",
      "Painting",
      "Mason / labour",
      "Tiles / flooring work",
      "False ceiling / POP / gypsum",
      "Aluminium / UPVC fabrication",
      "Carpentry / furniture work",
      "Welding / grill / gate work",
      "AC installation / repair",
      "CCTV / security systems",
      "Solar installation",
      "Pest control",
    ],
  },
];

const PROPERTIES_GROUPS: Group[] = [
  { key: "landplots", title: "Land / Plots", items: ["Residential", "Commercial", "Agricultural", "Industrial"] },
  {
    key: "houses",
    title: "Houses / Buildings",
    items: ["Independent House", "Builder Floor", "Villa", "Farm House", "Bungalow", "Office Space", "Shop / Showroom"],
  },
];

const RENTALS_GROUPS: Group[] = [
  {
    key: "earthmoving",
    title: "Land Development & Earthmoving",
    items: ["Excavator (20T/30T)", "JCB / Backhoe Loader", "Mini Excavator", "Bulldozer", "Road Roller", "Tipper / Dumper"],
  },
  {
    key: "concrete",
    title: "Concrete & Structural Work",
    items: ["Concrete Mixer", "Concrete Pump", "Boom Pump", "Needle Vibrator", "Scaffolding", "Centering Props", "Shuttering Plates"],
  },
  {
    key: "power",
    title: "Electrical & Power Rentals",
    items: ["DG Set (5KVA–125KVA)", "Portable Generator", "Arc Welding Machine", "Core Cutting Machine", "Tower Lights"],
  },
  {
    key: "transport",
    title: "Transport & Material Movement",
    items: ["Pickup Van (90/120 CFT)", "Mini Truck / Tata Ace", "Truck (10–20 Ton)", "Tractor with Trailer", "Water Tanker"],
  },
];

export default function BrowseForRfqModulePage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const moduleParam = String((params as any)?.module || "").toLowerCase();
  const module = (["materials", "services", "rentals", "properties"].includes(moduleParam)
    ? (moduleParam as RfqModule)
    : "services") as RfqModule;

  const returnTo = sp.get("returnTo") || "/rfq/general/new";

  const [q, setQ] = useState("");
  const [otherText, setOtherText] = useState("");

  // ✅ MULTI-SELECT state
  const [selected, setSelected] = useState<Record<string, string>>({}); // key -> label
  const selectedCount = Object.keys(selected).length;

  function toggleSelected(key: string, label: string) {
    setSelected((prev) => {
      const out = { ...prev };
      if (out[key]) delete out[key];
      else out[key] = label;
      return out;
    });
  }

  function clearSelected() {
    setSelected({});
  }

  function selectedValues(): string[] {
    return Object.values(selected);
  }

  // ✅ Return payload (picked=JSON) - your /rfq/general/new already supports this
  function goBackWithPicked(values: string[], applyAs: PickMode) {
    const cleanVals = values.map((x) => norm(x)).filter(Boolean);
    if (cleanVals.length === 0) return;

    const payload = {
      mode: "typed",
      applyAs: applyAs, // "hint" | "item"
      values: cleanVals,
      module,
    };

    const u = new URL(returnTo, "http://local");
    u.searchParams.set("picked", encodeURIComponent(JSON.stringify(payload)));
    router.push(u.pathname + (u.search || ""));
  }

  function goBackNoSelection() {
    const url = `${returnTo}?module=${encodeURIComponent(module)}`;
    router.push(url);
  }

  function pickSingle(label: string, mode: PickMode) {
    goBackWithPicked([label], mode);
  }

  function pickMulti(mode: PickMode) {
    goBackWithPicked(selectedValues(), mode);
  }

  // ✅ Materials states
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [taxons, setTaxons] = useState<Taxon[]>([]);
  const [openTypeId, setOpenTypeId] = useState<string>(""); // only one type open
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(""); // drill-down within type

  /** ✅ Load ALL material_taxons (not partial) */
  useEffect(() => {
    let alive = true;

    async function loadMaterials() {
      if (module !== "materials") return;

      setLoading(true);
      setLoadErr("");

      try {
        const res = await supabase
          .from("material_taxons")
          .select("id,name,slug,kind,parent_id")
          .in("kind", ["type", "category", "subcategory", "product_group"])
          .order("name", { ascending: true })
          .range(0, 4999);

        if (res.error) throw res.error;

        const rows = (res.data || []).map((r: any) => ({
          id: String(r.id),
          name: String(r.name),
          slug: r.slug ? String(r.slug) : null,
          kind: r.kind as TaxonKind,
          parent_id: r.parent_id ? String(r.parent_id) : null,
        })) as Taxon[];

        if (!alive) return;

        setTaxons(rows);

        // auto-open first type
        const firstType = rows.find((t) => t.kind === "type");
        setOpenTypeId(firstType?.id || "");
        setSelectedCategoryId("");
      } catch (e: any) {
        if (!alive) return;
        setLoadErr(e?.message || "Failed to load materials taxonomy.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadMaterials();

    return () => {
      alive = false;
    };
  }, [module, supabase]);

  /** build maps for materials */
  const maps = useMemo(() => {
    const byId = new Map<string, Taxon>();
    const childrenByParent = new Map<string, Taxon[]>();

    for (const t of taxons) byId.set(t.id, t);

    for (const t of taxons) {
      const pid = t.parent_id || "";
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid)!.push(t);
    }

    for (const [k, arr] of childrenByParent.entries()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      childrenByParent.set(k, arr);
    }

    function childrenOf(id: string | null) {
      return childrenByParent.get(id || "") || [];
    }

    function pathOf(id: string) {
      const parts: string[] = [];
      let cur = byId.get(id);
      let guard = 0;
      while (cur && guard < 10) {
        parts.unshift(cur.name);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
        guard++;
      }
      return parts.join(" > ");
    }

    return { byId, childrenOf, pathOf };
  }, [taxons]);

  /** Materials UI data */
  const materialTypes = useMemo(() => {
    if (module !== "materials") return [];
    let types = taxons.filter((t) => t.kind === "type");
    if (!q.trim()) return types;

    const needle = norm(q);
    const { childrenOf, pathOf } = maps;

    const hasMatchInType = (typeId: string) => {
      const stack = [...childrenOf(typeId)];
      while (stack.length) {
        const n = stack.pop()!;
        if (contains(pathOf(n.id), needle)) return true;
        stack.push(...childrenOf(n.id));
      }
      return false;
    };

    return types.filter((t) => contains(t.name, needle) || hasMatchInType(t.id));
  }, [module, taxons, q, maps]);

  const categoriesInOpenType = useMemo(() => {
    if (module !== "materials" || !openTypeId) return [];
    const needle = norm(q);
    const cats = maps.childrenOf(openTypeId).filter((x) => x.kind === "category");

    if (!needle) return cats;

    const hasMatchInCat = (catId: string) => {
      const stack = [...maps.childrenOf(catId)];
      while (stack.length) {
        const n = stack.pop()!;
        if (contains(maps.pathOf(n.id), needle)) return true;
        stack.push(...maps.childrenOf(n.id));
      }
      return false;
    };

    return cats.filter((c) => contains(c.name, needle) || hasMatchInCat(c.id));
  }, [module, openTypeId, q, maps]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return maps.byId.get(selectedCategoryId) || null;
  }, [selectedCategoryId, maps.byId]);

  /** list of pickable nodes inside selected category: subcategories + product groups */
  const pickablesInSelectedCategory = useMemo(() => {
    if (module !== "materials" || !selectedCategoryId) return [];

    const needle = norm(q);
    const out: Array<{ id: string; kind: TaxonKind; label: string }> = [];

    out.push({
      id: selectedCategoryId,
      kind: "category",
      label: maps.pathOf(selectedCategoryId),
    });

    const stack = [...maps.childrenOf(selectedCategoryId)];
    while (stack.length) {
      const n = stack.shift()!;
      if (n.kind === "subcategory" || n.kind === "product_group") {
        out.push({ id: n.id, kind: n.kind, label: maps.pathOf(n.id) });
      }
      stack.push(...maps.childrenOf(n.id));
    }

    const filtered = needle ? out.filter((x) => contains(x.label, needle)) : out;

    const seen = new Set<string>();
    return filtered.filter((x) => {
      const key = x.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [module, selectedCategoryId, q, maps]);

  /** Non-material groups */
  const groups: Group[] = useMemo(() => {
    if (module === "services") return SERVICES_GROUPS;
    if (module === "rentals") return RENTALS_GROUPS;
    if (module === "properties") return PROPERTIES_GROUPS;
    return [];
  }, [module]);

  const filteredGroups = useMemo(() => {
    if (module === "materials") return [];
    const needle = norm(q);
    if (!needle) return groups;

    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => contains(it, needle) || contains(g.title, needle)),
      }))
      .filter((g) => g.items.length > 0);
  }, [module, groups, q]);

  // ✅ Helpful label prefixes for non-material modules (so RFQ shows readable text)
  function labelForNonMaterial(item: string) {
    // Keep it clean but informative
    return `${moduleLabel(module)} > ${norm(item)}`;
  }

  // ✅ Multi-select bulk helpers for non-material groups
  function selectAllInGroup(g: Group) {
    setSelected((prev) => {
      const out = { ...prev };
      for (const it of g.items) {
        const lbl = labelForNonMaterial(it);
        const key = `${g.key}:${lbl}`;
        out[key] = lbl;
      }
      return out;
    });
  }
  function clearGroup(g: Group) {
    setSelected((prev) => {
      const out = { ...prev };
      for (const it of g.items) {
        const lbl = labelForNonMaterial(it);
        const key = `${g.key}:${lbl}`;
        if (out[key]) delete out[key];
      }
      return out;
    });
  }

  // ✅ Materials: key generator for selected map
  function materialKey(label: string) {
    // label already contains path (unique enough)
    return `mat:${label}`;
  }

  // ✅ Other (specify): add as one item/hint immediately
  function addOther(mode: PickMode) {
    const v = norm(otherText);
    if (!v) return;
    // Keep it simple and consistent:
    const label = `${moduleLabel(module)} > Other: ${v}`;
    pickSingle(label, mode);
  }

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>
            Browse for RFQ • {moduleLabel(module)}
          </h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            ✅ Now supports <b>Multi-select</b>. Select many → add once as <b>Hint</b> or <b>Item</b>.
          </div>
        </div>

        <button className="topBtn topBtnGhost" onClick={goBackNoSelection} type="button">
          Back to RFQ →
        </button>
      </div>

      {/* Search */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="searchInput"
          placeholder={`Search inside ${moduleLabel(module)}...`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 520 }}
        />
        {module === "materials" ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Loaded from <code>material_taxons</code>. (Types → Categories → Subcategories/Product Groups)
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 13 }}>Curated RFQ list.</div>
        )}
      </div>

      {/* ✅ Selected bar (bulk actions) */}
      <div
        style={{
          marginTop: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 12,
          background: selectedCount ? "rgba(11,87,208,0.05)" : "rgba(0,0,0,0.02)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Selected: {selectedCount} {selectedCount === 1 ? "item" : "items"}
          {selectedCount ? <span style={{ opacity: 0.7, fontWeight: 800 }}> (use bulk add)</span> : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="topBtn topBtnGhost"
            onClick={() => pickMulti("hint")}
            disabled={selectedCount === 0}
            title="Add all selected to Description"
          >
            Add Selected as Hint →
          </button>
          <button
            type="button"
            className="topBtn topBtnPrimary"
            onClick={() => pickMulti("item")}
            disabled={selectedCount === 0}
            title="Add all selected to Typed items"
          >
            Add Selected as Item →
          </button>
          <button type="button" className="topBtn topBtnGhost" onClick={clearSelected} disabled={selectedCount === 0}>
            Clear selected
          </button>
        </div>
      </div>

      {/* ✅ MATERIALS: Type accordion → Category list → Items list */}
      {module === "materials" ? (
        <div style={{ marginTop: 14 }}>
          {loading ? <div style={{ opacity: 0.85 }}>Loading materials taxonomy…</div> : null}

          {loadErr ? (
            <div
              style={{
                marginTop: 12,
                background: "#ffecec",
                border: "1px solid #ffb3b3",
                padding: 12,
                borderRadius: 10,
                whiteSpace: "pre-wrap",
              }}
            >
              {loadErr}
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                If you see “permission denied”, your RLS on <code>material_taxons</code> is blocking public read.
              </div>
            </div>
          ) : null}

          {!loading && !loadErr ? (
            <div style={{ display: "grid", gap: 12 }}>
              {materialTypes.map((tp) => {
                const isOpen = openTypeId === tp.id;
                const catCount = maps.childrenOf(tp.id).filter((x) => x.kind === "category").length;

                return (
                  <div
                    key={tp.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenTypeId(isOpen ? "" : tp.id);
                        setSelectedCategoryId("");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        fontWeight: 950,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: isOpen ? "rgba(11,87,208,0.06)" : "#fff",
                        border: "0",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span>{tp.name}</span>
                        <span style={{ opacity: 0.65, fontWeight: 800, fontSize: 12 }}>({catCount} categories)</span>
                      </span>
                      <span style={{ opacity: 0.7 }}>{isOpen ? "▴" : "▾"}</span>
                    </button>

                    {isOpen ? (
                      <div style={{ padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          {/* LEFT: category list */}
                          <div
                            style={{
                              border: "1px solid rgba(0,0,0,0.10)",
                              borderRadius: 12,
                              padding: 10,
                              background: "rgba(0,0,0,0.01)",
                            }}
                          >
                            <div style={{ fontWeight: 900, marginBottom: 8 }}>Categories</div>

                            {categoriesInOpenType.length === 0 ? (
                              <div style={{ opacity: 0.75 }}>No categories found (try clearing search).</div>
                            ) : (
                              <div style={{ display: "grid", gap: 8 }}>
                                {categoriesInOpenType.map((c) => {
                                  const active = selectedCategoryId === c.id;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => setSelectedCategoryId(c.id)}
                                      className="topBtn topBtnGhost"
                                      style={{
                                        justifyContent: "space-between",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: active
                                          ? "1px solid rgba(11,87,208,0.55)"
                                          : "1px solid rgba(0,0,0,0.10)",
                                        background: active ? "rgba(11,87,208,0.06)" : "#fff",
                                        fontWeight: 900,
                                      }}
                                    >
                                      <span>{c.name}</span>
                                      <span style={{ opacity: 0.7 }}>Open →</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
                              Select a category to show its subcategories / product groups.
                            </div>
                          </div>

                          {/* RIGHT: items within selected category */}
                          <div
                            style={{
                              border: "1px solid rgba(0,0,0,0.10)",
                              borderRadius: 12,
                              padding: 10,
                              background: "#fff",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 900 }}>
                                {selectedCategory ? `Inside: ${selectedCategory.name}` : "Select a category"}
                              </div>

                              {selectedCategory ? (
                                <button type="button" className="topBtn topBtnGhost" onClick={() => setSelectedCategoryId("")}>
                                  Back to categories →
                                </button>
                              ) : null}
                            </div>

                            {!selectedCategory ? (
                              <div style={{ marginTop: 10, opacity: 0.75 }}>Choose a category from the left panel.</div>
                            ) : (
                              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                                {pickablesInSelectedCategory.length === 0 ? (
                                  <div style={{ opacity: 0.75 }}>No subcategories/product groups found (try clearing search).</div>
                                ) : (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    {pickablesInSelectedCategory.map((x) => {
                                      const label = x.label; // already full path
                                      const key = materialKey(label);
                                      const checked = Boolean(selected[key]);

                                      return (
                                        <div
                                          key={x.id}
                                          style={{
                                            border: "1px solid rgba(0,0,0,0.10)",
                                            borderRadius: 12,
                                            padding: 10,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 10,
                                            flexWrap: "wrap",
                                            background: "rgba(0,0,0,0.01)",
                                          }}
                                        >
                                          <label style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 240 }}>
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() => toggleSelected(key, label)}
                                              style={{ width: 16, height: 16 }}
                                            />
                                            <div style={{ fontWeight: 900, lineHeight: 1.25 }}>
                                              {label}
                                              <span style={{ marginLeft: 8, opacity: 0.65, fontSize: 12 }}>({x.kind})</span>
                                            </div>
                                          </label>

                                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button type="button" className="topBtn topBtnGhost" onClick={() => pickSingle(label, "hint")}>
                                              Add as Hint →
                                            </button>
                                            <button type="button" className="topBtn topBtnPrimary" onClick={() => pickSingle(label, "item")}>
                                              Add as Item →
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <div style={{ opacity: 0.7, fontSize: 12 }}>
                                  Drill-down view: only one Type open + one Category open. Multi-select works inside this list.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {materialTypes.length === 0 ? (
                <div style={{ opacity: 0.8, marginTop: 8 }}>
                  No Types found in <code>material_taxons</code>.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        // ✅ NON-MATERIAL: keep accordion list + add checkboxes multi-select
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {filteredGroups.map((g) => (
            <div
              key={g.key}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  fontWeight: 950,
                  background: "rgba(11,87,208,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>{g.title}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ opacity: 0.65, fontWeight: 800, fontSize: 12 }}>({g.items.length} options)</span>
                  <button type="button" className="topBtn topBtnGhost" onClick={() => selectAllInGroup(g)}>
                    Select all
                  </button>
                  <button type="button" className="topBtn topBtnGhost" onClick={() => clearGroup(g)}>
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {g.items.map((it) => {
                  const label = labelForNonMaterial(it);
                  const key = `${g.key}:${label}`;
                  const checked = Boolean(selected[key]);

                  return (
                    <div
                      key={it}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 10,
                        background: "rgba(0,0,0,0.01)",
                      }}
                    >
                      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(key, label)}
                          style={{ width: 16, height: 16 }}
                        />
                        <div style={{ fontWeight: 900, lineHeight: 1.25 }}>{it}</div>
                      </label>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="topBtn topBtnGhost" onClick={() => pickSingle(label, "hint")}>
                          Add as Hint →
                        </button>
                        <button type="button" className="topBtn topBtnPrimary" onClick={() => pickSingle(label, "item")}>
                          Add as Item →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Other (specify) */}
      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(16,185,129,0.05)",
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Other (specify)</div>
        <textarea
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder={`Write your ${moduleLabel(module)} requirement in your words...`}
          style={{
            width: "100%",
            minHeight: 90,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#fff",
            outline: "none",
            resize: "vertical",
          }}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="topBtn topBtnGhost" onClick={() => addOther("hint")} disabled={!norm(otherText)}>
            Add as Hint →
          </button>
          <button type="button" className="topBtn topBtnPrimary" onClick={() => addOther("item")} disabled={!norm(otherText)}>
            Add as Item →
          </button>
          <button type="button" className="topBtn topBtnGhost" onClick={goBackNoSelection}>
            Back to RFQ (no selection) →
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Link className="topBtn topBtnGhost" href="/">
          Home
        </Link>
      </div>
    </div>
  );
}