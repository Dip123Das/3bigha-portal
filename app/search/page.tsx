// app/search/page.tsx
"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseAiSearchIntent } from "@/lib/search/ai-search-intent";
import { getAiSearchContent } from "@/lib/search/ai-search-content";
import { getSearchKeywordClusters } from "@/lib/search/search-keyword-clusters";

type SearchModule = "property" | "materials" | "services" | "rentals" | "blog";
type ModFilter = "all" | SearchModule;

type PropertyIntent = "all" | "sell" | "rent" | "lease" | "pg";

type AiSearchIntent = {
  ok?: boolean;
  source?: "ai" | "fallback";
  query?: string;
  module?: ModFilter;
  intent?: PropertyIntent;
  min?: string;
  max?: string;
  near?: boolean;
  confidence?: number;
  explanation?: string;
  error?: string;
};

type ResultRow = {
  module: SearchModule;
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  meta?: string | null;

  _price?: number | null;
  _intent?: string | null;

  _lat?: number | null;
  _lng?: number | null;
};

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtINR(n: any) {
  const num = typeof n === "number" ? n : Number(String(n ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return "";
  try {
    return new Intl.NumberFormat("en-IN").format(num);
  } catch {
    return String(num);
  }
}

function moduleLabel(m: SearchModule) {
  if (m === "property") return "Property";
  if (m === "materials") return "Materials";
  if (m === "services") return "Services";
  if (m === "rentals") return "Rentals";
  return "Blog";
}

function parseNum(v: string | null) {
  const s = safeText(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Try multiple SELECT column-sets until one works (fixes “column does not exist” problems)
async function trySelectAny(
  supabase: any,
  tableOrView: string,
  candidates: string[],
  opts: {
    or?: string;
    eq?: [string, any][];
    limit?: number;
    orderBy?: { col: string; ascending?: boolean };
  }
) {
  let lastErr: any = null;

  for (const cols of candidates) {
    const q = supabase.from(tableOrView).select(cols);

    if (opts.eq) for (const [k, v] of opts.eq) q.eq(k, v);
    if (opts.or) q.or(opts.or);
    if (opts.orderBy) q.order(opts.orderBy.col, { ascending: opts.orderBy.ascending ?? true });
    if (opts.limit) q.limit(opts.limit);

    const res = await q;
    if (!res?.error) return res;

    lastErr = res.error;
    const msg = String(res.error?.message ?? "").toLowerCase();

    // only fallback for missing column / select issues
    if (msg.includes("does not exist") || msg.includes("column") || msg.includes("select")) {
      continue;
    }

    // for any other error, stop immediately
    return res;
  }

  return { data: null, error: lastErr };
}

function SearchPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // URL state
  const qFromUrl = safeText(sp.get("q"));
  const modFromUrl = (safeText(sp.get("module")) as ModFilter) || "all";

  // Filters (URL)
  const intentFromUrl = (safeText(sp.get("intent")) as PropertyIntent) || "all";
  const minPriceFromUrl = parseNum(sp.get("min"));
  const maxPriceFromUrl = parseNum(sp.get("max"));

  // Near-me (URL) optional
  const nearFromUrl = safeText(sp.get("near")) === "1";
  const latFromUrl = parseNum(sp.get("lat"));
  const lngFromUrl = parseNum(sp.get("lng"));
  const kmFromUrl = parseNum(sp.get("km")) ?? 20;

  // UI inputs
  const [qInput, setQInput] = useState(qFromUrl);
  const [modInput, setModInput] = useState<ModFilter>(modFromUrl);

  const [intentInput, setIntentInput] = useState<PropertyIntent>(intentFromUrl);
  const [minInput, setMinInput] = useState(minPriceFromUrl ? String(minPriceFromUrl) : "");
  const [maxInput, setMaxInput] = useState(maxPriceFromUrl ? String(maxPriceFromUrl) : "");

  const [nearOn, setNearOn] = useState(nearFromUrl);
  const [nearKm, setNearKm] = useState(String(kmFromUrl));

  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const aiAutoAppliedRef = useRef<string>("");

  // Sync inputs with URL changes
  useEffect(() => {
    setQInput(qFromUrl);
    setModInput(modFromUrl);
    setIntentInput(intentFromUrl);
    setMinInput(minPriceFromUrl ? String(minPriceFromUrl) : "");
    setMaxInput(maxPriceFromUrl ? String(maxPriceFromUrl) : "");
    setNearOn(nearFromUrl);
    setNearKm(String(kmFromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl, modFromUrl, intentFromUrl, minPriceFromUrl, maxPriceFromUrl, nearFromUrl, kmFromUrl]);

  function pushUrl(next: {
    q: string;
    module: ModFilter;
    intent: PropertyIntent;
    min: string;
    max: string;
    near: boolean;
    lat?: number | null;
    lng?: number | null;
    km: string;
  }) {
    const qs = new URLSearchParams();

    if (next.q) qs.set("q", next.q);
    if (next.module !== "all") qs.set("module", next.module);

    if (next.intent !== "all") qs.set("intent", next.intent);
    const minN = parseNum(next.min);
    const maxN = parseNum(next.max);
    if (minN != null) qs.set("min", String(minN));
    if (maxN != null) qs.set("max", String(maxN));

    if (next.near) {
      qs.set("near", "1");
      const kmN = parseNum(next.km);
      if (kmN != null) qs.set("km", String(kmN));
      if (next.lat != null && next.lng != null) {
        qs.set("lat", String(next.lat));
        qs.set("lng", String(next.lng));
      }
    }

    router.push(`/search?${qs.toString()}`);
  }

  function submitNow() {
    setNote(null);
    pushUrl({
      q: safeText(qInput),
      module: modInput,
      intent: intentInput,
      min: minInput,
      max: maxInput,
      near: nearOn,
      lat: latFromUrl,
      lng: lngFromUrl,
      km: nearKm,
    });
  }

  // Debounced auto-search
  useEffect(() => {
    const nextQ = safeText(qInput);
    if (!nextQ) return;

    const t = setTimeout(() => {
      if (
        nextQ !== qFromUrl ||
        modInput !== modFromUrl ||
        intentInput !== intentFromUrl ||
        safeText(minInput) !== safeText(sp.get("min")) ||
        safeText(maxInput) !== safeText(sp.get("max")) ||
        nearOn !== nearFromUrl ||
        safeText(nearKm) !== safeText(sp.get("km"))
      ) {
        submitNow();
      }
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput, modInput, intentInput, minInput, maxInput, nearOn, nearKm]);

  async function enableNearMe() {
    setNote(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setNote("Near Me is not supported in this browser/device.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLoading(false);
        setNearOn(true);

        pushUrl({
          q: safeText(qInput),
          module: modInput,
          intent: intentInput,
          min: minInput,
          max: maxInput,
          near: true,
          lat,
          lng,
          km: nearKm,
        });
      },
      () => {
        setLoading(false);
        setNote("Location permission denied. Please allow location to use Near Me.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  useEffect(() => {
    const query = safeText(qFromUrl);

  if (!query) return;

  const autoKey = query;

  if (aiAutoAppliedRef.current === autoKey) return;

  aiAutoAppliedRef.current = autoKey;

  const t = setTimeout(() => {
    applyAiSearchIntent(query);
  }, 120);

  return () => clearTimeout(t);

// eslint-disable-next-line react-hooks/exhaustive-deps
}, [qFromUrl]);

  function startVoice() {
    setNote(null);

    const w: any = typeof window !== "undefined" ? window : null;
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition;
    if (!SR) {
      setNote("Voice search is not supported in this browser. Try Chrome/Edge.");
      return;
    }

    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const text = safeText(e?.results?.[0]?.[0]?.transcript);
      if (text) setQInput(text);
    };

    rec.onerror = () => setNote("Voice search failed. Please try again.");
    rec.start();
  }

  async function applyAiSearchIntent(queryOverride?: string) {
    const query = safeText(queryOverride || qInput);

    if (!query) {
      setNote("Type what you are looking for, then use Smart AI Search.");
      return;
    }

    setAiBusy(true);
    setErr(null);
    setNote(null);

    try {
      const res = await fetch("/api/ai/search-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = (await res.json()) as AiSearchIntent;

      if (!res.ok || !data?.ok) {
        setNote(data?.error || "Smart AI Search could not understand this query.");
        return;
      }

      const nextQ = safeText(data.query) || query;
      const nextModule = data.module || "all";
      const nextIntent = data.intent || "all";
      const nextMin = safeText(data.min);
      const nextMax = safeText(data.max);
      const nextNear = Boolean(data.near);

      setQInput(nextQ);
      setModInput(nextModule);
      setIntentInput(nextIntent);
      setMinInput(nextMin);
      setMaxInput(nextMax);
      setNearOn(nextNear);

      setNote(data.explanation || "Smart AI Search applied better filters.");

      pushUrl({
        q: nextQ,
        module: nextModule,
        intent: nextIntent,
        min: nextMin,
        max: nextMax,
        near: nextNear,
        lat: latFromUrl,
        lng: lngFromUrl,
        km: nearKm,
      });
    } catch {
      setNote("Smart AI Search failed. Normal search is still available.");
    } finally {
      setAiBusy(false);
    }
  }

  // Search runner
  useEffect(() => {
    let alive = true;

    async function run() {
      setErr(null);
      setRows([]);
      setNote(null);

      const q = safeText(qFromUrl);
      if (!q) return;

      setLoading(true);

      try {
        const want: SearchModule[] =
          modFromUrl === "all"
            ? ["property", "materials", "services", "rentals", "blog"]
            : [modFromUrl as SearchModule];

        const out: ResultRow[] = [];
        const term = q;

        // PROPERTY (your view has NO latitude/longitude, so don’t select them)
if (want.includes("property")) {
  const or = [
    `title.ilike.%${term}%`,
    `locality.ilike.%${term}%`,
    `city.ilike.%${term}%`,
    `district.ilike.%${term}%`,
    `state.ilike.%${term}%`,
  ].join(",");

  const r = await supabase
    .from("v_property_listings_with_inventory")
    .select("id,title,locality,city,district,state,price,status,listing_intent")
    .or(or)
    .limit(40);

  if (r.error) throw r.error;

  for (const x of (r.data ?? []) as any[]) {
    const id = String(x.id);
    const title = safeText(x.title) || "Property";
    const addr = [x.locality, x.city, x.district, x.state].map(safeText).filter(Boolean).join(", ");
    const price = x.price != null ? `₹ ${fmtINR(x.price)}` : "";
    const intent = safeText(x.listing_intent);
    const meta = [intent ? intent.toUpperCase() : "", safeText(x.status), price].filter(Boolean).join(" • ");

    out.push({
      module: "property",
      id,
      title,
      subtitle: addr || null,
      meta: meta || null,
      href: `/property/${encodeURIComponent(id)}`,
      _price: x.price != null ? Number(x.price) : null,
      _intent: intent || null,
      _lat: null,
      _lng: null,
    });
  }
}

        // MATERIALS
        if (want.includes("materials")) {
          const r = await supabase
            .from("material_listings")
            .select("id,title,local_name,description,attributes,packaging_unit,is_public,is_active")
            .eq("is_public", true)
            .eq("is_active", true)
            .or([`title.ilike.%${term}%`, `local_name.ilike.%${term}%`, `description.ilike.%${term}%`].join(","))
            .limit(30);

          if (r.error) throw r.error;

          for (const x of (r.data ?? []) as any[]) {
            const title = safeText(x.title) || safeText(x.local_name) || "Material";
            const brand = safeText(x?.attributes?.brand || x?.attributes?.brand_name || x?.attributes?.make);
            const price = x?.attributes?.price ?? x?.attributes?.unit_price ?? x?.attributes?.mrp ?? x?.attributes?.rate;
            const priceLine =
              price != null ? `₹ ${fmtINR(price)}${x.packaging_unit ? ` / ${safeText(x.packaging_unit)}` : ""}` : "";

            const meta = [brand ? `Brand: ${brand}` : "", priceLine].filter(Boolean).join(" • ");

            out.push({
              module: "materials",
              id: String(x.id),
              title,
              subtitle: brand || null,
              meta: meta || null,
              href: `/materials/${encodeURIComponent(String(x.id))}`,
            });
          }
        }

        // SERVICES (your view uses provider_service_id + custom_service + service_description)
if (want.includes("services")) {
  const or = [
    `provider_name.ilike.%${term}%`,
    `custom_category.ilike.%${term}%`,
    `custom_subcategory.ilike.%${term}%`,
    `custom_service.ilike.%${term}%`,
    `service_description.ilike.%${term}%`,
    `city.ilike.%${term}%`,
    `district.ilike.%${term}%`,
    `state.ilike.%${term}%`,
    `segment.ilike.%${term}%`,
  ].join(",");

  const r = await supabase
    .from("v_service_listings")
    .select(
      [
        "provider_service_id",
        "provider_name",
        "custom_category",
        "custom_subcategory",
        "custom_service",
        "service_description",
        "city",
        "district",
        "state",
        "min_price",
        "max_price",
        "currency",
      ].join(",")
    )
    .or(or)
    .limit(30);

  if (r.error) throw r.error;

  for (const x of (r.data ?? []) as any[]) {
    const id = String(x.provider_service_id ?? "");
    if (!id) continue;

    const title =
      safeText(x.custom_service) ||
      safeText(x.custom_subcategory) ||
      safeText(x.custom_category) ||
      "Service";

    const area = [x.city, x.district, x.state].map(safeText).filter(Boolean).join(", ");

    const priceMeta =
      x.min_price != null || x.max_price != null
        ? `${x.currency ? safeText(x.currency) : "₹"} ${x.min_price != null ? fmtINR(x.min_price) : "—"} - ${x.max_price != null ? fmtINR(x.max_price) : "—"}`
        : null;

    const meta = [safeText(x.provider_name) ? `By: ${safeText(x.provider_name)}` : "", priceMeta || ""]
      .filter(Boolean)
      .join(" • ");

    out.push({
      module: "services",
      id,
      title,
      subtitle: area || null,
      meta: meta || null,
      href: `/services/${encodeURIComponent(id)}`,
    });
  }
}

        // RENTALS (safe version without price dependency)
if (want.includes("rentals")) {
  const or = [
    `title.ilike.%${term}%`,
    `description.ilike.%${term}%`,
    `city.ilike.%${term}%`,
    `district.ilike.%${term}%`,
    `state.ilike.%${term}%`,
  ].join(",");

  const r = await supabase
    .from("rental_listings_public")
    .select("id,title,description,city,district,state")
    .or(or)
    .limit(30);

  if (r.error) throw r.error;

  for (const x of (r.data ?? []) as any[]) {
    const title = safeText(x.title) || "Rental";
    const area = [x.city, x.district, x.state].map(safeText).filter(Boolean).join(", ");

    out.push({
      module: "rentals",
      id: String(x.id),
      title,
      subtitle: area || null,
      meta: null,
      href: `/rentals/${encodeURIComponent(String(x.id))}`,
      _lat: null,
      _lng: null,
    });
  }
}

        // BLOG
        if (want.includes("blog")) {
          const r = await supabase
            .from("blog_posts")
            .select("id,title,slug,excerpt,content")
            .or([`title.ilike.%${term}%`, `excerpt.ilike.%${term}%`, `content.ilike.%${term}%`].join(","))
            .limit(30);

          if (r.error) throw r.error;

          for (const x of (r.data ?? []) as any[]) {
            const title = safeText(x.title) || "Blog";
            const slug = safeText(x.slug);
            const href = slug ? `/blog/${encodeURIComponent(slug)}` : `/blog`;

            out.push({
              module: "blog",
              id: String(x.id),
              title,
              subtitle: slug ? `/${slug}` : null,
              meta: null,
              href,
            });
          }
        }

        // Client-side filtering (property intent + price)
        let filtered = out;

        const minN = parseNum(safeText(sp.get("min")));
        const maxN = parseNum(safeText(sp.get("max")));
        const intent = (safeText(sp.get("intent")) as PropertyIntent) || "all";

        if (intent !== "all") {
          filtered = filtered.filter((r) => r.module !== "property" || safeText(r._intent).toLowerCase() === intent);
        }
        if (minN != null) {
          filtered = filtered.filter((r) => r.module !== "property" || (r._price != null && r._price >= minN));
        }
        if (maxN != null) {
          filtered = filtered.filter((r) => r.module !== "property" || (r._price != null && r._price <= maxN));
        }

        // Near-me filter (only if lat/lng present in rows + URL has lat/lng)
        if (nearFromUrl && latFromUrl != null && lngFromUrl != null) {
          const km = kmFromUrl;
          const nearCap = Math.max(1, km);

          const anyGeo = out.some((x) => x._lat != null && x._lng != null);

          if (!anyGeo) {
            setNote(
              "Near Me needs latitude/longitude in listing views. Your view currently does not expose lat/lng, so Near Me cannot filter yet."
            );
          } else {
            const before = filtered.length;

            filtered = filtered
              .map((r) => {
                if (r._lat == null || r._lng == null) return { r, d: null as number | null };
                const d = haversineKm(latFromUrl, lngFromUrl, r._lat, r._lng);
                return { r, d };
              })
              .filter((x) => x.d == null || x.d <= nearCap)
              .sort((a, b) => {
                if (a.d == null && b.d == null) return 0;
                if (a.d == null) return 1;
                if (b.d == null) return -1;
                return a.d - b.d;
              })
              .map((x) => x.r);

            const after = filtered.length;
            if (before !== after) setNote(`Near Me applied (within ~${nearCap} km).`);
          }
        }

        // Sort by module
        const order: Record<SearchModule, number> = {
          property: 1,
          materials: 2,
          services: 3,
          rentals: 4,
          blog: 5,
        };
        filtered.sort((a, b) => (order[a.module] ?? 99) - (order[b.module] ?? 99));

        if (!alive) return;
        setRows(filtered);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Search failed.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [qFromUrl, modFromUrl, supabase, sp, nearFromUrl, latFromUrl, lngFromUrl, kmFromUrl]);

  const hasQuery = !!safeText(qFromUrl);

  const localSearchIntent = useMemo(
    () => parseAiSearchIntent(qFromUrl),
    [qFromUrl]
  );

  const aiSearchContent = useMemo(
    () => getAiSearchContent(localSearchIntent),
    [localSearchIntent]
  );

  const searchKeywordClusters = useMemo(
    () =>
      getSearchKeywordClusters({
        query: qFromUrl,
        module: localSearchIntent.module,
        area: localSearchIntent.areaHint || "your area",
      }),
    [qFromUrl, localSearchIntent]
  );

  return (
    <Container>
      <SectionHeader title="Search" subtitle="Find anything across 3Bigha.com" />

      <Card>
        <CardBody>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>Search</div>

              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNow();
                }}
                placeholder="Type: location, title, keyword…"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 12px",
                  minWidth: 260,
                  flex: "1 1 360px",
                }}
              />

              <select
                value={modInput}
                onChange={(e) => setModInput(e.target.value as ModFilter)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  fontWeight: 850,
                  minWidth: 160,
                }}
              >
                <option value="all">All</option>
                <option value="property">Property</option>
                <option value="materials">Materials</option>
                <option value="services">Services</option>
                <option value="rentals">Rentals</option>
                <option value="blog">Blog</option>
              </select>

              <button
                type="button"
                onClick={submitNow}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#111827",
                  color: "white",
                  fontWeight: 950,
                  padding: "0 16px",
                  cursor: "pointer",
                }}
              >
                Search
              </button>

              <Link
                href={`/vendor/discovery?q=${encodeURIComponent(
                  safeText(qInput) || "marketplace requirement"
                )}${modInput !== "all" ? `&module=${encodeURIComponent(modInput)}` : ""}`}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #bbf7d0",
                  background: "#16a34a",
                  color: "white",
                  fontWeight: 950,
                  padding: "0 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
                title="Open AI procurement assistant with vendor recommendations"
              >
                🤖 AI Procurement Assistant
              </Link>

              <button
                type="button"
                onClick={startVoice}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  fontWeight: 900,
                  padding: "0 14px",
                  cursor: "pointer",
                }}
                title="Voice search"
              >
                🎙️ Voice
              </button>

              <button
                type="button"
                onClick={enableNearMe}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: nearOn ? "#111827" : "white",
                  color: nearOn ? "white" : "#111827",
                  fontWeight: 950,
                  padding: "0 14px",
                  cursor: "pointer",
                }}
                title="Near me"
              >
                📍 Near Me
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900, opacity: 0.8 }}>Filters</div>

              <select
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value as PropertyIntent)}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  fontWeight: 850,
                  minWidth: 160,
                }}
                title="Property intent"
              >
                <option value="all">Property: Any</option>
                <option value="sell">Sell</option>
                <option value="rent">Rent</option>
                <option value="lease">Lease</option>
                <option value="pg">PG</option>
              </select>

              <input
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                placeholder="Min price"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  width: 130,
                }}
              />

              <input
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                placeholder="Max price"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  width: 130,
                }}
              />

              <input
                value={nearKm}
                onChange={(e) => setNearKm(e.target.value)}
                placeholder="Near km"
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  width: 110,
                }}
                title="Near Me radius (km)"
              />

              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>
                Tip: Start typing — auto-search runs. Press <b>Enter</b> to search instantly.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/property" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                Properties
              </Link>
              <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                Materials
              </Link>
              <Link href="/services" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                Services
              </Link>
              <Link href="/rentals" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                Rentals
              </Link>
              <Link href="/blog" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                Blog
              </Link>
            </div>

            {note ? (
              <div
                style={{
                  marginTop: 2,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "rgba(0,0,0,0.02)",
                  fontWeight: 800,
                }}
              >
                {note}
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <div style={{ height: 12 }} />

      {hasQuery ? (
        <Card>
          <CardBody>
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: 999,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                AI Search Landing
              </div>

              <div>
                <h2 style={{ margin: 0, color: "#0f172a", fontSize: 24 }}>
                  {aiSearchContent.heading}
                </h2>

                <p style={{ marginTop: 8, color: "#475569", lineHeight: 1.7, fontWeight: 650 }}>
                  {aiSearchContent.description}
                </p>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {aiSearchContent.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      margin: 0,
                      color: "#334155",
                      lineHeight: 1.8,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                {[
                  ...searchKeywordClusters.related.slice(0, 8),
                  ...searchKeywordClusters.price.slice(0, 4),
                ].map((item) => (
                  <Link
                    key={item}
                    href={`/search?q=${encodeURIComponent(item)}${
                      localSearchIntent.module ? `&module=${localSearchIntent.module}` : ""
                    }`}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 999,
                      padding: "9px 13px",
                      color: "#0f172a",
                      textDecoration: "none",
                      fontWeight: 850,
                      fontSize: 13,
                    }}
                  >
                    🔎 {item}
                  </Link>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {searchKeywordClusters.rfq.slice(0, 5).map((item) => (
                  <Link
                    key={item}
                    href={`/rfq/general/new?q=${encodeURIComponent(item)}${
                      localSearchIntent.module ? `&module=${localSearchIntent.module}` : ""
                    }`}
                    style={{
                      background: "#f5f3ff",
                      border: "1px solid #ddd6fe",
                      borderRadius: 999,
                      padding: "9px 13px",
                      color: "#4c1d95",
                      textDecoration: "none",
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    📝 {item}
                  </Link>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div style={{ height: 12 }} />

      {loading ? (
        <EmptyState message="Searching…" />
      ) : err ? (
        <EmptyState message={err} />
      ) : !hasQuery ? (
        <EmptyState message="Type a query above (example: Cooch Behar, Jalpaiguri, plot, cement) — results will appear automatically." />
      ) : rows.length === 0 ? (
        <EmptyState message="No results found." />
      ) : (
        <>
          <div style={{ marginBottom: 10, fontWeight: 900, opacity: 0.8 }}>Results: {rows.length}</div>

          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((r) => (
              <Card key={`${r.module}:${r.id}`}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>{r.title}</div>
                      {r.subtitle ? <div style={{ opacity: 0.8, fontWeight: 750 }}>{r.subtitle}</div> : null}
                      {r.meta ? (
                        <div style={{ marginTop: 6, opacity: 0.75, fontWeight: 850, fontSize: 12 }}>{r.meta}</div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 900, opacity: 0.75 }}>{moduleLabel(r.module)}</div>
                      <Link href={r.href} className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                        View →
                      </Link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Container><EmptyState message="Loading search…" /></Container>}>
      <SearchPageInner />
    </Suspense>
  );
}
