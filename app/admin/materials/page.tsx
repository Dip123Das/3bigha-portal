// app/materials/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ListingRow = {
  id: string;
  product_group_id: string | null;
  title: string | null;
  description: string | null;
  brand: string | null;
  price: number | null;
  unit: string | null;
  service_area: string | null;
  pincode: string | null;
  created_at?: string | null;
};

type PgRow = {
  product_group_id: string;
  product_group_name: string;
  subcategory_name: string;
  category_name: string;
  type_name: string;
  full_path: string;
};

type TypeRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
};

function money(v: number | null) {
  if (typeof v !== "number") return "₹ —";
  return `₹ ${v}`;
}

function clip(s: string | null, n: number) {
  if (!s) return "";
  const t = s.trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trim() + "…";
}

function norm(s: string | null | undefined) {
  return String(s ?? "").toLowerCase();
}

type GroupKey = "core" | "finish" | "kitchen" | "tools";

const CATALOG: {
  key: GroupKey;
  title: string;
  buyerLabel: string;
  // IMPORTANT: these must match material_taxons.slug (kind='type')
  typeSlugs: string[];
}[] = [
  {
    key: "core",
    title: "Core\nConstruction\nMaterials",
    buyerLabel: "Build the Structure",
    typeSlugs: [
      "basic-building-materials",
      "plumbing-materials",
      "electrical-fittings",
      "wires-and-cables",
      "roofing",
      "doors-and-windows",
    ],
  },
  {
    key: "finish",
    title: "Finishing\n& Interior\nMaterials",
    buyerLabel: "Finish & Design Your Home",
    typeSlugs: [
      "flooring",
      "wall-finishing",
      "paints",
      "false-ceiling-and-partition",
      "interior-and-ceiling-decor",
      "glass",
      "stairs-ramps-elevators",
    ],
  },
  {
    key: "kitchen",
    title: "Kitchen,\nAppliances &\nHardware",
    buyerLabel: "Fit-Out & Installations",
    typeSlugs: [
      "kitchen-fittings",
      "kitchen-appliances",
      "home-appliances",
      "hardware",
      "chemicals-and-adhesives",
      "consumables",
    ],
  },
  {
    key: "tools",
    title: "Tools, Safety\n&\nInfrastructure",
    buyerLabel: "Tools, Safety & Maintenance",
    typeSlugs: [
      "construction-tools",
      "safety-and-security",
      "furniture",
      "electrical-and-networking",
      "landscaping-and-horticulture",
    ],
  },
];

export default function MaterialsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checkingAdd, setCheckingAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [pgMap, setPgMap] = useState<Map<string, PgRow>>(new Map());
  const [allTypes, setAllTypes] = useState<TypeRow[]>([]);

  const [q, setQ] = useState<string>("");
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<string>("");

  async function ensureFreshOrAnon() {
    if (!supabase) return;
    const { data: sData } = await supabase.auth.getSession();
    if (sData?.session) {
      const { error: rErr } = await supabase.auth.refreshSession();
      if (rErr) {
        await supabase.auth.signOut();
      }
    }
  }

  async function loadProductGroupsBestEffort(): Promise<PgRow[]> {
    // Try RPC first (if you created it)
    try {
      const { data, error } = await (supabase as any).rpc("get_public_material_product_groups");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {
      // ignore
    }

    // Try public view
    try {
      const { data, error } = await (supabase as any)
        .from("v_public_material_product_groups")
        .select("product_group_id,product_group_name,subcategory_name,category_name,type_name,full_path");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {
      // ignore
    }

    // Try hierarchy view (your screenshot shows this exists)
    try {
      const { data, error } = await (supabase as any)
        .from("v_material_product_group_hierarchy")
        .select("product_group_id,product_group_name,subcategory_name,category_name,type_name,full_path");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {
      // ignore
    }

    // Nothing worked
    throw new Error(
      "Product group source not found. Expected one of: RPC get_public_material_product_groups, view v_public_material_product_groups, or view v_material_product_group_hierarchy."
    );
  }

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      setLoading(true);
      setErr(null);

      if (!supabase) {
        setErr("Supabase not configured (missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
        setLoading(false);
        return;
      }

      try {
        await ensureFreshOrAnon();

        // Types (for labels + mapping type_name -> slug)
        const { data: tData, error: tErr } = await supabase
          .from("material_taxons")
          .select("id,name,slug,sort_order")
          .eq("kind", "type")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
          .range(0, 9999);

        if (!alive) return;
        if (tErr) throw new Error(tErr.message);

        // ✅ Product groups (fixed: no more v_material_product_groups)
        const pgData = await loadProductGroupsBestEffort();
        if (!alive) return;

        const map = new Map<string, PgRow>();
        pgData.forEach((r) => map.set(r.product_group_id, r));

        // Listings
        const { data: liData, error: liErr } = await supabase
          .from("material_listings")
          .select("id,product_group_id,title,description,brand,price,unit,service_area,pincode,created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (!alive) return;
        if (liErr) throw new Error(liErr.message);

        setAllTypes(((tData as any) ?? []) as TypeRow[]);
        setPgMap(map);
        setListings(((liData as any) ?? []) as ListingRow[]);
      } catch (e: any) {
        setErr(e?.message || "Failed to load materials.");
        setListings([]);
        setPgMap(new Map());
        setAllTypes([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const typeNameToSlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTypes) m.set(norm(t.name), t.slug);
    return m;
  }, [allTypes]);

  const selectedTypeLabel = useMemo(() => {
    if (!selectedTypeSlug) return "";
    const t = allTypes.find((x) => x.slug === selectedTypeSlug);
    return t?.name ?? selectedTypeSlug.replace(/-/g, " ").toUpperCase();
  }, [selectedTypeSlug, allTypes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return listings.filter((l) => {
      const pg = l.product_group_id ? pgMap.get(l.product_group_id) : undefined;

      // 1) type filter
      if (selectedTypeSlug) {
        const pgTypeSlug = pg?.type_name ? typeNameToSlug.get(norm(pg.type_name)) : undefined;
        if (pgTypeSlug !== selectedTypeSlug) return false;
      }

      // 2) search
      if (!query) return true;

      const haystack = [
        l.title,
        l.description,
        l.brand,
        l.unit,
        l.service_area,
        l.pincode,
        pg?.type_name,
        pg?.category_name,
        pg?.subcategory_name,
        pg?.product_group_name,
        pg?.full_path,
      ]
        .map((x) => norm(x))
        .join(" ");

      return haystack.includes(query);
    });
  }, [listings, q, pgMap, selectedTypeSlug, typeNameToSlug]);

  async function handleAddClick() {
    if (!supabase) {
      router.push(`/login?next=${encodeURIComponent("/materials/add")}`);
      return;
    }

    setCheckingAdd(true);
    try {
      await ensureFreshOrAnon();
      const { data, error } = await supabase.auth.getSession();
      const hasSession = !!data?.session && !error;

      if (!hasSession) {
        router.push(`/login?next=${encodeURIComponent("/materials/add")}`);
        return;
      }

      router.push("/materials/add");
    } finally {
      setCheckingAdd(false);
    }
  }

  function clearAllFilters() {
    setSelectedTypeSlug("");
    setQ("");
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  return (
    <main style={{ maxWidth: 1100, margin: "26px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 6 }}>Materials</h1>
          <div style={{ color: "#666" }}>Browse building materials. Vendors can add listings after login.</div>
        </div>

        <button
          onClick={handleAddClick}
          disabled={checkingAdd}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: checkingAdd ? "not-allowed" : "pointer",
            fontWeight: 800,
            opacity: checkingAdd ? 0.75 : 1,
            minWidth: 140,
            height: 42,
          }}
        >
          {checkingAdd ? "Checking…" : "Add Material"}
        </button>
      </div>

      {/* Browse Catalog */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 10 }}>Browse Catalog</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {CATALOG.map((g) => (
            <div key={g.key} style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", padding: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, whiteSpace: "pre-line", lineHeight: 1.2 }}>{g.title}</div>
                <span
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid #e6e6e6",
                    background: "#f7f7f7",
                    fontWeight: 800,
                  }}
                >
                  {g.buyerLabel}
                </span>
              </div>

              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {g.typeSlugs.map((slug) => {
                  const t = allTypes.find((x) => x.slug === slug);
                  const label = t?.name || slug.replace(/-/g, " ").toUpperCase();
                  const active = selectedTypeSlug === slug;

                  return (
                    <button
                      key={slug}
                      onClick={() => {
                        setSelectedTypeSlug(slug);
                        setQ("");
                        window?.scrollTo?.({ top: 560, behavior: "smooth" });
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid #e6e6e6",
                        background: active ? "#111" : "#fff",
                        color: active ? "#fff" : "#111",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                      title="Filter listings below"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#777" }}>Click a type to filter listings below.</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 18,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={clearAllFilters}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #e6e6e6",
              background: selectedTypeSlug || q.trim() ? "#fff" : "#edf4ff",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 13,
            }}
            title="Clear type + search"
          >
            All
          </button>

          {selectedTypeSlug ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #e6e6e6",
                background: "#f7f7f7",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {selectedTypeLabel}
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, minWidth: 220, display: "flex", justifyContent: "flex-end" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={selectedTypeSlug ? `Search in ${selectedTypeLabel}…` : "Search in All…"}
            style={{
              width: "min(360px, 100%)",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e6e6e6",
              outline: "none",
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>Loading materials…</div>
        ) : err ? (
          <div
            style={{
              padding: 14,
              border: "1px solid #ffb4b4",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#b00020",
            }}
          >
            <b>Failed to load:</b> {err}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12, color: "#444" }}>
            No materials to show
            {selectedTypeSlug ? (
              <>
                {" "}
                in <b>“{selectedTypeLabel}”</b>
              </>
            ) : null}
            {q.trim() ? (
              <>
                {" "}
                with search <b>“{q.trim()}”</b>
              </>
            ) : null}
            .
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
              marginTop: 10,
            }}
          >
            {filtered.map((l) => {
              const pg = l.product_group_id ? pgMap.get(l.product_group_id) : undefined;
              const title = l.title?.trim() || pg?.product_group_name || "Material";
              const badge = pg?.category_name || pg?.type_name || "Material";

              return (
                <div key={l.id} style={{ border: "1px solid #eee", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
                      <span
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid #e6e6e6",
                          background: "#f7f7f7",
                        }}
                      >
                        {badge}
                      </span>
                    </div>

                    <div style={{ marginTop: 10, color: "#444", lineHeight: 1.35 }}>
                      {clip(l.description, 95) || (pg?.full_path ? clip(pg.full_path, 95) : "—")}
                    </div>

                    <div style={{ marginTop: 10, fontWeight: 800 }}>
                      {money(l.price)}
                      {l.unit ? ` / ${l.unit}` : ""}
                    </div>

                    <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>{l.brand ? `Brand: ${l.brand}` : ""}</div>
                  </div>

                  <div style={{ padding: 14, borderTop: "1px solid #f1f1f1", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => router.push(`/materials/${l.id}`)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e6e6e6",
                        background: "#f5f7fb",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      View details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
