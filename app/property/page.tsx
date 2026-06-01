// app/property/page.tsx  (PUBLIC)
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { buildPropertyInvestmentIntel } from "@/lib/property-investment/investment-score";
import {
  readDiscoveryMemory,
  scorePersonalizedDiscoveryRow,
  type DiscoveryMemoryItem,
} from "@/lib/personalized-discovery/discovery-memory";

type Status = "draft" | "pending" | "approved" | "published" | "blocked" | "rejected" | string;

type PropertyTypeUI = "Land / Plot" | "House(s)";
type TypeFilterKey = "all" | "land" | "house";

type LandSubtypeUI = "Residential" | "Commercial" | "Agricultural" | "Industrial" | "Others";
type HouseSubtypeUI =
  | "Independent / Builder Floor"
  | "Independent House / Villa"
  | "Farm House"
  | "Bunglow"
  | "Office Space"
  | "Shop"
  | "Others";

type SubtypeUI = LandSubtypeUI | HouseSubtypeUI;
type SubKey = "all" | `sub:${SubtypeUI}`;

const LAND_SUBTYPES: LandSubtypeUI[] = ["Residential", "Commercial", "Agricultural", "Industrial", "Others"];
const HOUSE_SUBTYPES: HouseSubtypeUI[] = [
  "Independent / Builder Floor",
  "Independent House / Villa",
  "Farm House",
  "Bunglow",
  "Office Space",
  "Shop",
  "Others",
];

// ✅ We will NOT increase "limit".
// We'll keep a fixed page size (20) and load page-by-page while scrolling.
const PAGE_SIZE = 20;
async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  return await Promise.race([
    Promise.resolve(promiseLike),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function subtypeList(activeTypeKey: TypeFilterKey): SubtypeUI[] {
  if (activeTypeKey === "land") return LAND_SUBTYPES;
  if (activeTypeKey === "house") return HOUSE_SUBTYPES;
  return LAND_SUBTYPES;
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function money(v: number | null | undefined) {
  if (typeof v !== "number") return "₹ —";
  return `₹ ${v.toLocaleString("en-IN")}`;
}

function approxEmi(amount: number | null | undefined) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;

  const loanAmount = amount * 0.8;
  const monthlyRate = 0.085 / 12;
  const months = 20 * 12;

  const emi =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(emi);
}

function financeBadgeLabel(price: number | null | undefined) {
  const emi = approxEmi(price);
  if (!emi) return "AI Finance Ready";
  return `AI EMI ≈ ₹${emi.toLocaleString("en-IN")}/mo`;
}

function financeHref(price: number | null | undefined, title: string, city?: string | null) {
  const params = new URLSearchParams();
  if (typeof price === "number" && Number.isFinite(price)) params.set("propertyValue", String(price));
  if (title) params.set("property", title);
  if (city) params.set("location", city);
  params.set("source", "property-card");

  return `/emi-calculator?${params.toString()}`;
}

function propertyPriceTodayHref(p: ListingRow, typeName: string, subtypeName: string, title: string) {
  const itemName =
    subtypeName ||
    typeName ||
    title ||
    "Property";

  const params = new URLSearchParams();
  params.set("category", "Properties");
  params.set("q", itemName);

  if (typeName) params.set("propertyType", typeName);
  if (subtypeName) params.set("propertySubtype", subtypeName);
  if (p.city || p.state) params.set("location", p.city || p.state || "");

  return `/price-today?${params.toString()}`;
}

function looksLikeMissingColumnError(message: string) {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("could not find the") ||
    msg.includes("does not exist") ||
    msg.includes("unknown field")
  );
}

function extractMissingColumnName(message: string): string | null {
  const msg = message || "";

  const m1 = msg.match(/could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];

  const m2 = msg.match(/column "([^"]+)" .* does not exist/i);
  if (m2?.[1]) return m2[1];

  // Handles: column property_listings.vendor_user_id does not exist
  const m3 = msg.match(/column\s+([a-z0-9_.]+)\s+does not exist/i);
  if (m3?.[1]) {
    const full = m3[1];
    const parts = full.split(".");
    return parts[parts.length - 1] || null;
  }

  return null;
}

type ListingRow = {
  id: string;
  title: string | null;
  slug: string | null;

  listing_intent: string | null;

  type_id: string | null;
  subtype_id: string | null;

  expected_price: number | null;
  price?: number | null;

  city: string | null;
  district?: string | null;
  locality?: string | null;
  state: string | null;

  owner_id?: string | null;
  owner_user_id?: string | null;

  status: Status;
  updated_at: string;

  published_at?: string | null;
  is_public?: boolean | null;
};

function normalizeListing(x: any): ListingRow | null {
  if (!x || typeof x !== "object") return null;

  const id = x.id != null ? String(x.id) : "";
  const status = x.status != null ? String(x.status) : "";
  const updated_at = x.updated_at != null ? String(x.updated_at) : "";

  if (!id || !status || !updated_at) return null;

  return {
    id,
    title: x.title == null ? null : String(x.title),
    slug: x.slug == null ? null : String(x.slug),

    listing_intent: x.listing_intent == null ? null : String(x.listing_intent),

    type_id: x.type_id == null ? null : String(x.type_id),
    subtype_id: x.subtype_id == null ? null : String(x.subtype_id),

    expected_price: x.expected_price == null ? null : Number(x.expected_price),

    city: x.city == null ? null : String(x.city),
    district: x.district == null ? null : String(x.district),
    locality: x.locality == null ? null : String(x.locality),
    state: x.state == null ? null : String(x.state),

    price: x.price == null ? null : Number(x.price),

    owner_id: x.owner_id == null ? null : String(x.owner_id),
    owner_user_id: x.owner_user_id == null ? null : String(x.owner_user_id),

    status,
    updated_at,

    published_at: x.published_at == null ? null : String(x.published_at),
    is_public:
      typeof x.is_public === "boolean"
        ? x.is_public
        : x.is_public == null
        ? null
        : Boolean(x.is_public),
  };
}

type TypeMap = Record<string, { name: string; slug: string | null }>;
type SubtypeMap = Record<string, { name: string; slug: string | null; type_id: string | null }>;

function chipStyle(active: boolean) {
  return {
    height: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: active ? "rgba(37,99,235,0.10)" : "white",
    color: active ? "#1d4ed8" : "#111827",
    cursor: "pointer",
    fontWeight: 800 as const,
    fontSize: 13,
  };
}

export const revalidate = 300;

export default function PropertyPublicListPage() {
  // ✅ ONLY public client here (no session, no JWT refresh)
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabasePublicBrowser> | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const client = getSupabasePublicBrowser();
      setSupabase(client);
    } catch (e: any) {
      setErr(e?.message || "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  }, []);

  useEffect(() => {
    setDiscoveryMemory(readDiscoveryMemory());
  }, []);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [discoveryMemory, setDiscoveryMemory] = useState<DiscoveryMemoryItem[]>([]);
  const [typeMap, setTypeMap] = useState<TypeMap>({});
  const [subtypeMap, setSubtypeMap] = useState<SubtypeMap>({});

  const [q, setQ] = useState("");
  const [typeKey, setTypeKey] = useState<TypeFilterKey>("all");
  const [subKey, setSubKey] = useState<SubKey>("all");

  // pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // The set of columns we will attempt in order, removing missing optional columns if needed
  const [cols, setCols] = useState<string[]>([
    "id",
    "title",
    "slug",
    "listing_intent",
    "type_id",
    "subtype_id",
    "expected_price",
    "price",
    "city",
    "district",
    "locality",
    "state",
    "owner_id", // main owner fallback
    "owner_user_id", // optional fallback
    "status",
    "updated_at",
    "published_at", // optional
    "is_public", // optional
  ]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSubKey("all");
  }, [typeKey]);

  // -----------------------------
  // Fetch helpers (paged, 20 rows each)
  // -----------------------------
    async function safeSelectPublishedPublicPage(nextPage: number, currentCols: string[]) {
    try {
      const res = await withTimeout(
        fetch(`/api/property/public-listings?page=${nextPage}&pageSize=${PAGE_SIZE}`, {
          method: "GET",
          cache: "no-store",
        }),
        15000,
        "public listings API fetch"
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          data: [],
          error: new Error(json?.error || `Public listings API failed with status ${res.status}`),
          usedCols: currentCols,
        };
      }

      return {
        data: Array.isArray(json?.data) ? json.data : [],
        error: null,
        usedCols: Array.isArray(json?.usedCols) ? json.usedCols : currentCols,
      };
    } catch (e: any) {
      return {
        data: [],
        error: e instanceof Error ? e : new Error(e?.message || "Could not load public listings"),
        usedCols: currentCols,
      };
    }
  }

  async function loadTypeAndSubtypeMaps(nextListings: ListingRow[]) {
    if (!supabase) return;
    const typeIds = Array.from(new Set(nextListings.map((x) => x.type_id).filter(Boolean))) as string[];
    const subtypeIds = Array.from(new Set(nextListings.map((x) => x.subtype_id).filter(Boolean))) as string[];

    const missingTypeIds = typeIds.filter((id) => !typeMap[id]);
    const missingSubtypeIds = subtypeIds.filter((id) => !subtypeMap[id]);

    const jobs: Promise<void>[] = [];

    if (missingTypeIds.length) {
      jobs.push(
        (async () => {
          try {
            const res = await withTimeout(
              supabase.from("property_types").select("id,name,slug").in("id", missingTypeIds),
              8000,
              "property_types fetch"
            );

            const tRows = (res as any)?.data ?? [];
            setTypeMap((prev) => {
              const next: TypeMap = { ...prev };
              (tRows ?? []).forEach((t: any) => {
                if (!t?.id) return;
                next[String(t.id)] = {
                  name: String(t.name ?? ""),
                  slug: t.slug == null ? null : String(t.slug),
                };
              });
              return next;
            });
          } catch (e) {
            console.warn("property_types map load skipped:", e);
          }
        })()
      );
    }

    if (missingSubtypeIds.length) {
      jobs.push(
        (async () => {
          try {
            const res = await withTimeout(
              supabase
                .from("property_subtypes")
                .select("id,type_id,name,slug")
                .in("id", missingSubtypeIds),
              8000,
              "property_subtypes fetch"
            );

            const sRows = (res as any)?.data ?? [];
            setSubtypeMap((prev) => {
              const next: SubtypeMap = { ...prev };
              (sRows ?? []).forEach((s: any) => {
                if (!s?.id) return;
                next[String(s.id)] = {
                  name: String(s.name ?? ""),
                  slug: s.slug == null ? null : String(s.slug),
                  type_id: s.type_id == null ? null : String(s.type_id),
                };
              });
              return next;
            });
          } catch (e) {
            console.warn("property_subtypes map load skipped:", e);
          }
        })()
      );
    }

    await Promise.allSettled(jobs);
  }

  async function loadPage(nextPage: number, isFirst: boolean) {
    if (loadingMore) return;
    if (!hasMore && !isFirst) return;

    if (isFirst) {
      setInitialLoading(true);
      setErr(null);
      setHasMore(true);
      setPage(0);
      setListings([]);
      setTypeMap({});
      setSubtypeMap({});
    } else {
      setLoadingMore(true);
    }

    try {
      console.log("PROPERTY_PUBLIC_PAGE_LOAD_START", { nextPage, isFirst });

      const { data, error, usedCols } = await safeSelectPublishedPublicPage(nextPage, cols);

      if (usedCols.join(",") !== cols.join(",")) setCols(usedCols);

      if (error) {
        setErr(error.message);
        return;
      }

      const normalized = (data ?? []).map(normalizeListing).filter(Boolean) as ListingRow[];

      setListings((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const row of normalized) {
          if (!seen.has(row.id)) merged.push(row);
        }
        return merged;
      });

      if (normalized.length < PAGE_SIZE) setHasMore(false);

      void loadTypeAndSubtypeMaps(normalized);
    } catch (e: any) {
      setErr(e?.message || "Could not load published properties.");
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }

  // first load
  useEffect(() => {
    if (!supabase) return;
    console.log("PROPERTY_PUBLIC_PAGE_LOAD_START");
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // infinite scroll observer
  useEffect(() => {
    if (!supabase) return;

    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        // Only load more when:
        // - not initial loading
        // - not currently loading more
        // - hasMore is true
        if (initialLoading) return;
        if (loadingMore) return;
        if (!hasMore) return;

        const next = page + 1;
        setPage(next);
        loadPage(next, false);
      },
      { rootMargin: "900px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [page, initialLoading, loadingMore, hasMore]); // keep

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const wantedSubtypeName = subKey.startsWith("sub:") ? subKey.slice(4) : "";

    return listings
      .filter((p) => {
        const typeName = p.type_id ? typeMap[p.type_id]?.name : "";
        const subtypeName = p.subtype_id ? subtypeMap[p.subtype_id]?.name : "";

        if (typeKey === "land" && typeName !== "Land / Plot") return false;
        if (typeKey === "house" && typeName !== "House(s)") return false;

        if (wantedSubtypeName) {
          if (subtypeName !== wantedSubtypeName) return false;
        }

        if (!qq) return true;
        const hay = `${p.title ?? ""} ${p.locality ?? ""} ${p.city ?? ""} ${p.district ?? ""} ${p.state ?? ""} ${typeName} ${subtypeName}`.toLowerCase();
        return hay.includes(qq);
      })
      .sort((a, b) => {
        const aType = a.type_id ? typeMap[a.type_id]?.name : "";
        const bType = b.type_id ? typeMap[b.type_id]?.name : "";

        const aIntel = buildPropertyInvestmentIntel({
          price: a.expected_price ?? a.price ?? null,
          propertyType: aType,
          city: a.city,
          district: a.district,
          locality: a.locality,
        });

        const bIntel = buildPropertyInvestmentIntel({
          price: b.expected_price ?? b.price ?? null,
          propertyType: bType,
          city: b.city,
          district: b.district,
          locality: b.locality,
        });

        const aScore =
          aIntel.investmentScore * 0.34 +
          aIntel.investorConfidenceIndex * 0.16 +
          aIntel.bargainOpportunityIndex * 0.1 +
          aIntel.resaleLiquidityScore * 0.1 +
          aIntel.marketTimingScore * 0.08 +
          aIntel.hyperlocalDesirabilityIndex * 0.1 +
          aIntel.overallRecommendationScore * 0.12;

        const bScore =
          bIntel.investmentScore * 0.34 +
          bIntel.investorConfidenceIndex * 0.16 +
          bIntel.bargainOpportunityIndex * 0.1 +
          bIntel.resaleLiquidityScore * 0.1 +
          bIntel.marketTimingScore * 0.08 +
          bIntel.hyperlocalDesirabilityIndex * 0.1 +
          bIntel.overallRecommendationScore * 0.12;

        const aPersonal = scorePersonalizedDiscoveryRow(
          {
            id: a.id,
            title: a.title,
            city: a.city,
            district: a.district,
            locality: a.locality,
            type: aType,
            category: a.subtype_id ? subtypeMap[a.subtype_id]?.name : "",
            price: a.expected_price ?? a.price ?? null,
          },
          discoveryMemory
        );

        const bPersonal = scorePersonalizedDiscoveryRow(
          {
            id: b.id,
            title: b.title,
            city: b.city,
            district: b.district,
            locality: b.locality,
            type: bType,
            category: b.subtype_id ? subtypeMap[b.subtype_id]?.name : "",
            price: b.expected_price ?? b.price ?? null,
          },
          discoveryMemory
        );

        return bScore + bPersonal - (aScore + aPersonal);
      });
  }, [listings, q, typeKey, subKey, typeMap, subtypeMap, discoveryMemory]);

  return (
    <Container>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Property", url: "https://www.3bigha.com/property" },
        ])}
      />

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <SectionHeader
            title="Property Listings"
            subtitle="Showing only published public listings. Sell / Rent / Lease / PG will be chosen only when a vendor lists a property."
          />
        </div>

        {/* ✅ Header actions: Browse Projects + Post Property */}
        <div style={{ paddingTop: 8, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link
            href="/property/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              background: "white",
              color: "#111827",
              fontWeight: 900,
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.14)",
            }}
          >
            Browse Projects
          </Link>

          <Link
            href="/property/add"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              background: "#1d4ed8",
              color: "white",
              fontWeight: 900,
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            Post Property
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search in All..."
          style={{
            width: "100%",
            height: 40,
            borderRadius: 12,
            padding: "0 14px",
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" onClick={() => setTypeKey("all")} style={chipStyle(typeKey === "all")}>
          All
        </button>
        <button type="button" onClick={() => setTypeKey("land")} style={chipStyle(typeKey === "land")}>
          Land / Plot
        </button>
        <button type="button" onClick={() => setTypeKey("house")} style={chipStyle(typeKey === "house")}>
          House(s)
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" onClick={() => setSubKey("all")} style={chipStyle(subKey === "all")}>
          All
        </button>

        {subtypeList(typeKey).map((s) => {
          const key = `sub:${s}` as SubKey;
          return (
            <button key={s} type="button" onClick={() => setSubKey(key)} style={chipStyle(subKey === key)}>
              {s}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        {err ? (
          <MessageBox title="Could not load" description={err} />
        ) : initialLoading ? (
          <MessageBox title="Loading..." description="Fetching published properties..." />
        ) : filtered.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 8 }}>
            No published properties found. Try changing filters or search terms.
          </div>
        ) : (
          <>
            <Grid>
              {filtered.map((p: ListingRow) => {
                const typeName = p.type_id ? typeMap[p.type_id]?.name : "";
                const subtypeName = p.subtype_id ? subtypeMap[p.subtype_id]?.name : "";

                const title = (p.title ?? "").trim() || "Untitled property";
                const place = `${p.city ?? "—"}${p.state ? `, ${p.state}` : ""}`;

                const finalPrice = p.expected_price ?? p.price ?? null;
                const priceText = finalPrice != null ? money(finalPrice) : "Price not set";
                const vendorUserId =
                  p.owner_id ?? p.owner_user_id ?? null;

                const investmentIntel = buildPropertyInvestmentIntel({
                  price: finalPrice,
                  propertyType: typeName,
                  category: subtypeName,
                  city: p.city,
                  district: p.district,
                  locality: p.locality,
                });

                return (
                  <Card key={p.id}>
                    <CardBody>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                        <Badge>Published</Badge>
                        {typeName ? <Badge>{typeName}</Badge> : null}
                        {subtypeName ? <Badge>{subtypeName}</Badge> : null}
                        <Badge>Updated: {fmt(p.updated_at)}</Badge>
                        <Badge>{financeBadgeLabel(p.expected_price ?? p.price ?? null)}</Badge>
                        <Badge>AI Invest {investmentIntel.investmentScore}/99</Badge>
                        <Badge>{investmentIntel.hotDealLabel}</Badge>
                        <Badge>{investmentIntel.recommendationLabel}</Badge>
                      </div>

                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
                      <div style={{ opacity: 0.8 }}>
                        {place} • {priceText}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 12,
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#0f172a",
                          }}
                        >
                          <span>🎯 {investmentIntel.recommendationLabel}</span>
                          <span>{investmentIntel.overallRecommendationScore}/99</span>
                        </div>

                        <div
                          style={{
                            height: 7,
                            borderRadius: 12,
                            background: "#e5e7eb",
                            overflow: "hidden",
                            marginTop: 8,
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(4, Math.min(100, investmentIntel.overallRecommendationScore))}%`,
                              height: "100%",
                              borderRadius: 12,
                              background: "#ffffff",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "grid",
                            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#334155",
                          }}
                        >
                          <span>📈 {investmentIntel.rating}</span>
                          <span>🔥 Locality {investmentIntel.investorConfidenceIndex}/99</span>
                          <span>💎 Bargain {investmentIntel.bargainOpportunityIndex}/99</span>
                          <span>📊 Market {investmentIntel.areaHeatIndex}/99</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link
                          href={propertyPriceTodayHref(p, typeName, subtypeName, title)}
                          style={{ fontWeight: 900, color: "#2563eb" }}
                        >
                          Compare Price →
                        </Link>

                        <Link
                          href={financeHref(finalPrice, title, p.city)}
                          style={{ fontWeight: 900, color: "#16a34a" }}
                        >
                          Check EMI →
                        </Link>

                        <Link href={`/property/${p.id}`} style={{ fontWeight: 900 }}>
                          View →
                        </Link>
                      </div>

                      {/* ✅ NEW: Send Enquiry on listing card (public browsing, login required only when sending) */}
                                            <div style={{ marginTop: 12 }}>
                        <SendEnquiryButton
                          module="property"
                          refId={String(p.id)}
                          title={title}
                          priceText={priceText}
                          vendorUserId={vendorUserId}
                          nextUrl={`/property/${encodeURIComponent(String(p.id))}`}
                          buttonLabel="Send Enquiry"
                        />
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: 10 }} />

            {loadingMore ? (
              <div style={{ marginTop: 14 }}>
                <MessageBox title="Loading more..." description="Fetching next published properties..." />
              </div>
            ) : null}

            {!hasMore ? (
              <div style={{ marginTop: 12, opacity: 0.7, fontWeight: 700 }}>You have reached the end.</div>
            ) : null}
          </>
        )}
      </div>
    </Container>
  );
}