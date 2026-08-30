// app/materials/page.tsx
"use client";

import PublicVendorOpportunityBanner from "@/components/marketplace/PublicVendorOpportunityBanner";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { FilterBar, type FilterBarItem } from "@/components/ui/FilterBar";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MarketplaceIdentityHeader,
  useMarketplaceTrust,
} from "@/components/trust";
import { getMarketplaceIdentityFromMap } from "@/lib/trust";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";

type ListingRow = {
  id: string;
  vendor_user_id: string | null;
  product_group_id: string | null;

  title: string | null;
  local_name: string | null;
  sku: string | null;
  description: string | null;

  packaging_unit: string | null;
  attributes: any;

  is_public: boolean | null;
  is_active: boolean | null;
  status: string | null;

  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
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

type MaterialDiscoveryItem = {
  title: string;
  note: string;
  query: string;
  href: string;
};

const MATERIAL_DISCOVERY: MaterialDiscoveryItem[] = [
  {
    title: "Cement & Concrete",
    note: "Start here for slab, column, foundation and general construction.",
    query: "cement",
    href: "/materials?q=cement",
  },
  {
    title: "Steel & Structure",
    note: "TMT, rods, structural steel and reinforcement materials.",
    query: "steel",
    href: "/materials?q=steel",
  },
  {
    title: "Sand & Aggregates",
    note: "Sand, stone chips, gravel and site filling materials.",
    query: "sand",
    href: "/materials?q=sand",
  },
  {
    title: "Electrical",
    note: "Wires, switches, fittings and electrical construction items.",
    query: "electrical",
    href: "/materials?q=electrical",
  },
  {
    title: "Plumbing",
    note: "Pipes, tanks, sanitary and water line materials.",
    query: "plumbing",
    href: "/materials?q=plumbing",
  },
  {
    title: "Interior & Finishing",
    note: "Tiles, paint, ceiling, boards and finishing materials.",
    query: "tiles",
    href: "/materials?q=tiles",
  },
];

const MATERIAL_WORKFLOWS = [
  ["Check today’s rate", "/price-today"],
  ["Send bulk requirement", "/materials/rfq"],
  ["Find nearby vendors", "/vendor/discovery"],
  ["Add your material", "/materials/add"],
] as const;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function clip(s: string | null, n: number) {
  if (!s) return "";
  const t = s.trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trim() + "…";
}

function getAttr(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return null;
}

function getInventory(l: ListingRow) {
  return l.attributes?.inventory && typeof l.attributes.inventory === "object"
    ? l.attributes.inventory
    : null;
}

function moneyINR(v: any) {
  const num = typeof v === "number" ? v : v != null && String(v).trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(num)) return "₹ —";
  return `₹ ${num}`;
}

function priceTodayHref(title: string, pg?: PgRow) {
  const materialName =
    pg?.product_group_name ||
    pg?.subcategory_name ||
    pg?.category_name ||
    title ||
    "Material";

  const params = new URLSearchParams();
  params.set("category", "Materials");
  params.set("q", materialName);

  if (pg?.category_name) params.set("materialCategory", pg.category_name);
  if (pg?.subcategory_name) params.set("subcategory", pg.subcategory_name);
  if (pg?.product_group_name) params.set("productGroup", pg.product_group_name);

  return `/price-today?${params.toString()}`;
}

function createAnonSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

function safeClearExpiredSupabaseSessions() {
  try {
    if (typeof window === "undefined") return;

    const nowSec = Math.floor(Date.now() / 1000);
    const keys: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.includes("-auth-token")) keys.push(k);
      if (k === "supabase.auth.token") keys.push(k);
    }

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem(key);
        continue;
      }

      const expiresAt: number | null = typeof parsed?.expires_at === "number" ? parsed.expires_at : null;
      if (!expiresAt) continue;

      if (expiresAt <= nowSec - 30) {
        window.localStorage.removeItem(key);

        try {
          const prefix = key.replace(/-auth-token.*$/, "");
          const maybeRelated = [
            `${prefix}-auth-token`,
            `${prefix}-auth-token-code-verifier`,
            `${prefix}-auth-token-refresh-token`,
            `${prefix}-auth-token-expires-at`,
          ];
          for (const rk of maybeRelated) window.localStorage.removeItem(rk);
        } catch {}
      }
    }
  } catch {}
}

export default function MaterialsPage() {
  const router = useRouter();
  const supabaseAnon = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createAnonSupabase();
  }, []);

  const [checkingAdd, setCheckingAdd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [pgMap, setPgMap] = useState<Map<string, PgRow>>(new Map());
  const [allTypes, setAllTypes] = useState<TypeRow[]>([]);

  const vendorUserIds = useMemo(
    () => listings.map((listing) => listing.vendor_user_id),
    [listings]
  );

  const { trustByUserId } = useMarketplaceTrust(
    vendorUserIds,
    { subject: "business" }
  );

  const [typeSlug, setTypeSlug] = useState<string>("all");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlQ = params.get("q");
    const materialCategory = params.get("materialCategory");

    if (urlQ) {
      setQ(urlQ);
    }

    if (materialCategory) {
      const normalized = materialCategory
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      setTypeSlug(normalized);
    }
  }, []);
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    safeClearExpiredSupabaseSessions();
  }, []);

  async function loadProductGroupsBestEffort(): Promise<PgRow[]> {
    if (!supabaseAnon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    try {
      const { data, error } = await (supabaseAnon as any).rpc("get_public_material_product_groups");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {}

    try {
      const { data, error } = await (supabaseAnon as any)
        .from("v_public_material_product_groups")
        .select("product_group_id,product_group_name,subcategory_name,category_name,type_name,full_path");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {}

    try {
      const { data, error } = await (supabaseAnon as any)
        .from("v_material_product_group_hierarchy")
        .select("product_group_id,product_group_name,subcategory_name,category_name,type_name,full_path");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {}

    try {
      const { data, error } = await (supabaseAnon as any)
        .from("v_material_product_groups")
        .select("product_group_id,product_group_name,subcategory_name,category_name,type_name,full_path");
      if (!error && Array.isArray(data)) return data as PgRow[];
    } catch {}

    throw new Error(
      "Product group source not found. Expected: get_public_material_product_groups RPC OR v_public_material_product_groups OR v_material_product_group_hierarchy."
    );
  }

  async function loadAllOnce() {
    setLoading(true);
    setErr(null);

    if (!supabaseAnon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const tRes = await (supabaseAnon as any)
      .from("material_taxons")
      .select("id,name,slug,sort_order")
      .eq("kind", "type")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(0, 9999);

    if (tRes.error) throw new Error(tRes.error.message);

    const pgData = await loadProductGroupsBestEffort();
    const map = new Map<string, PgRow>();
    pgData.forEach((r) => map.set(r.product_group_id, r));

    const liRes = await (supabaseAnon as any)
      .from("material_listings")
      .select(
        [
          "id",
          "vendor_user_id",
          "product_group_id",
          "title",
          "local_name",
          "sku",
          "description",
          "attributes",
          "packaging_unit",
          "is_public",
          "is_active",
          "status",
          "published_at",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("is_active", true)
      .or("is_public.eq.true,published_at.not.is.null,status.ilike.published,status.ilike.active")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (liRes.error) throw new Error(liRes.error.message);

    setAllTypes(((tRes.data as any) ?? []) as TypeRow[]);
    setPgMap(map);
    setListings(((liRes.data as any) ?? []) as ListingRow[]);
  }

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      setErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    let alive = true;

    (async () => {
      try {
        await loadAllOnce();
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("jwt expired")) {
          safeClearExpiredSupabaseSessions();
          try {
            await loadAllOnce();
            if (!alive) return;
            setLoading(false);
            return;
          } catch (e2: any) {
            if (!alive) return;
            setErr(String(e2?.message || "Failed to load materials."));
            setListings([]);
            setPgMap(new Map());
            setAllTypes([]);
            setLoading(false);
            return;
          }
        }

        if (!alive) return;
        setErr(msg || "Failed to load materials.");
        setListings([]);
        setPgMap(new Map());
        setAllTypes([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseAnon]);

  const typeItems: FilterBarItem[] = useMemo(() => {
    const items: FilterBarItem[] = [{ key: "all", label: "All" }];
    for (const t of allTypes) items.push({ key: t.slug, label: t.name });
    return items;
  }, [allTypes]);

  const filtered = useMemo(() => {
    const query = norm(q);
    return listings.filter((l) => {
      const pg = l.product_group_id ? pgMap.get(l.product_group_id) : undefined;

      if (typeSlug !== "all") {
        const tName = pg?.type_name ? norm(pg.type_name) : "";
        const tSlugFromName = tName
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        if (tSlugFromName !== typeSlug) return false;
      }

      if (!query) return true;

      const brand = getAttr(l.attributes, ["brand", "brand_name", "make"]);
      const price = getAttr(l.attributes, ["price", "unit_price", "mrp", "rate"]);

      const haystack = [
        l.title,
        l.local_name,
        l.sku,
        l.description,
        l.packaging_unit,
        String(brand ?? ""),
        String(price ?? ""),
        pg?.type_name,
        pg?.category_name,
        pg?.subcategory_name,
        pg?.product_group_name,
        pg?.full_path,
      ]
        .map((x) => norm(String(x ?? "")))
        .join(" ");

      return haystack.includes(query);
    });
  }, [listings, pgMap, typeSlug, q]);

  async function handleAddClick() {
    setCheckingAdd(true);
    try {
      const supabaseAuth = getSupabaseBrowser();
      const { data, error } = await supabaseAuth.auth.getSession();
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

  return (
    <main>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Materials", url: "https://www.3bigha.com/materials" },
        ])}
      />

      <Container>
        <SectionHeader
          title="Materials"
          subtitle="Start with a simple material group, then use search and filters for exact products."
        />

        <PublicVendorOpportunityBanner module="materials" />

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {MATERIAL_DISCOVERY.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setQ(item.query);
                setTypeSlug("all");
              }}
              style={{
                textAlign: "left",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 16,
                background: "#fff",
                padding: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>{item.note}</div>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 900, opacity: 0.75 }}>
            Next useful actions:
          </span>
          {MATERIAL_WORKFLOWS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 999,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
                color: "inherit",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={handleAddClick}
            disabled={checkingAdd}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              cursor: checkingAdd ? "not-allowed" : "pointer",
              opacity: checkingAdd ? 0.75 : 1,
            }}
          >
            {checkingAdd ? "Checking…" : "Add Material"}
          </button>

          <ActionButton href="/materials/my" variant="secondary">
            My Materials
          </ActionButton>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionHeader eyebrow="Live Listings" title="Public Listings" subtitle="Filter by type and search across title, brand, price and category path." />

          <div style={{ marginTop: 12 }}>
            <FilterBar
              items={typeItems}
              activeKey={typeSlug}
              onChange={(k) => {
                setTypeSlug(String(k));
                setQ("");
              }}
              ariaLabel="Material types"
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "0 1 320px", display: "flex", justifyContent: "flex-end", marginLeft: "auto" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={typeSlug === "all" ? "Search materials…" : "Search in selected type…"}
                style={{
                  width: "min(360px, 100%)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 13,
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {loading ? (
              <EmptyState message="Loading materials…" />
            ) : err ? (
              <EmptyState message={`Material load failed: ${err}`} />
            ) : (
              <>
                <Grid min={260} gap={14}>
                  {filtered.map((l) => {
                    const pg = l.product_group_id ? pgMap.get(l.product_group_id) : undefined;

                    const brand = getAttr(l.attributes, ["brand", "brand_name", "make"]);
                    const price = getAttr(l.attributes, ["price", "unit_price", "mrp", "rate"]);
                    const inventory = getInventory(l);

                    const title = l.title?.trim() || l.local_name?.trim() || pg?.product_group_name || "Material";
                    const badge = pg?.category_name || pg?.type_name || "Material";

                    const desc =
                      clip(l.description, 120) ||
                      (pg?.full_path ? clip(pg.full_path, 120) : "Details will be available on the material page.");

                    const priceText =
                      price != null ? `${moneyINR(price)}${l.packaging_unit ? ` / ${l.packaging_unit}` : ""}` : "";

                    const marketplaceIdentity =
                      getMarketplaceIdentityFromMap(
                        {
                          module: "materials",
                          ownerUserId: l.vendor_user_id,
                          displayName: "Material vendor",
                          subject: "business",
                        },
                        trustByUserId
                      );

                    return (
                      <Card key={l.id}>
                        <CardBody>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <h3 style={{ margin: 0, lineHeight: 1.2 }}>{title}</h3>
                            <Badge>{badge}</Badge>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <MarketplaceIdentityHeader
                              identity={marketplaceIdentity}
                              compact
                              showName={false}
                            />
                          </div>

                          <p style={{ margin: "10px 0 0", color: "#5b6472" }}>{desc}</p>

                          <div
                            style={{
                              marginTop: 10,
                              color: "#5b6472",
                              fontSize: 13,
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            {pg?.type_name ? <span>Type: {pg.type_name}</span> : null}
                            {pg?.subcategory_name ? <span>Subcategory: {pg.subcategory_name}</span> : null}
                            {brand ? <span>Brand: {String(brand)}</span> : null}
                            {priceText ? <span>Price: {priceText}</span> : null}
                            {inventory?.current_stock ? (
                              <span>
                                Stock: {inventory.current_stock} {inventory.stock_unit || ""}
                              </span>
                            ) : null}
                            {inventory?.rack_no ? <span>Rack: {inventory.rack_no}</span> : null}
                            {inventory?.vehicle_number ? <span>Vehicle: {inventory.vehicle_number}</span> : null}
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <SendEnquiryButton
                              module="material"
                              refId={String(l.id)}
                              title={title}
                              priceText={priceText}
                              vendorUserId={l.vendor_user_id ?? null}
                              nextUrl={`/materials/${encodeURIComponent(String(l.id))}`}
                              buttonLabel="Send Enquiry"
                            />
                          </div>
                        </CardBody>

                        <CardFooter>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <ActionButton href={priceTodayHref(title, pg)} variant="primary">
                              Compare Price →
                            </ActionButton>

                            <ActionButton href={`/materials/${encodeURIComponent(String(l.id))}`} variant="secondary">
                              View details →
                            </ActionButton>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </Grid>

                {filtered.length === 0 ? (
                  <EmptyState message={q.trim() ? "No materials found for this search." : "No materials found for this type."} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
