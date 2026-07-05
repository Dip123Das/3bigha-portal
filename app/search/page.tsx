// app/search/page.tsx
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { OperationalEmptyState } from "@/components/ui/OperationalEmptyState";
import { parseAiSearchIntent } from "@/lib/search/ai-search-intent";
import { getAiSearchContent } from "@/lib/search/ai-search-content";
import { getSearchKeywordClusters } from "@/lib/search/search-keyword-clusters";
import {
  buildUnifiedMarketplaceRecommendations,
  getUnifiedMarketplaceSummary,
  scoreUnifiedMarketplaceResult,
} from "@/lib/search/unified-marketplace-brain";
import { computeMarketplaceGeoScore } from "@/lib/search/geo-marketplace-ranking";
import {
  getSearchWorkflowCards,
  workflowCardToneStyle,
} from "@/lib/search/search-workflow-cards";
import UnifiedSearchAutocomplete from "@/components/search/UnifiedSearchAutocomplete";
import SearchToRfqConversionCard from "@/components/search/SearchToRfqConversion";
import { buildSearchToRfqConversion } from "@/lib/search/search-to-rfq-engine";
const VendorLiquidityPanel = dynamic(
  () => import("@/components/search/VendorLiquidityPanel"),
  { ssr: false }
);
import { buildVendorLiquidityInsight } from "@/lib/search/vendor-liquidity-engine";
const ProcurementRecommendationSidebar = dynamic(
  () => import("@/components/search/ProcurementRecommendationSidebar"),
  { ssr: false }
);
const ProcurementDecisionPanel = dynamic(
  () => import("@/components/search/ProcurementDecisionPanel"),
  { ssr: false }
);
import { buildProcurementDecisionInsight } from "@/lib/search/procurement-decision-engine";
const VendorIntelligencePanel = dynamic(
  () => import("@/components/search/VendorIntelligencePanel"),
  { ssr: false }
);
import { buildVendorIntelligenceInsight } from "@/lib/search/vendor-intelligence-engine";
const VendorNegotiationPanel = dynamic(
  () => import("@/components/search/VendorNegotiationPanel"),
  { ssr: false }
);
import { buildVendorNegotiationInsight } from "@/lib/search/vendor-negotiation-engine";
const ProcurementActionCopilot = dynamic(
  () => import("@/components/search/ProcurementActionCopilot"),
  { ssr: false }
);
import { buildProcurementActionCopilot } from "@/lib/search/procurement-action-copilot";
const ProcurementMemoryTimeline = dynamic(
  () => import("@/components/procurement/ProcurementMemoryTimeline"),
  { ssr: false }
);
const ProcurementReEngagement = dynamic(
  () => import("@/components/procurement/ProcurementReEngagement"),
  { ssr: false }
);
const AIExecutionDrawer = dynamic(
  () => import("@/components/ai-execution/AIExecutionDrawer"),
  { ssr: false }
);
import UniversalWorkflowHeader from "@/components/operational/UniversalWorkflowHeader";

import ProcurementJourneyBar from "@/components/procurement/ProcurementJourneyBar";
import {
  buildSearchJourneyActions,
  saveProcurementJourneyAction,
  readProcurementJourneyActions,
  type ProcurementJourneyAction,
} from "@/lib/procurement/journey-actions";

import {
  saveConversationContext,
} from "@/lib/procurement/conversation-context";

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

type DiscoveryMemoryItem = {
  id: string;
  module: "property" | "materials" | "services" | "rentals";
  title: string;
  href: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  viewedAt: number;
};

function readDiscoveryMemory(): DiscoveryMemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("3bigha.discovery.memory.v1");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

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

  _geo_state_id?: string | null;
  _geo_district_id?: string | null;
  _geo_subdivision_id?: string | null;
  _geo_block_id?: string | null;
  _geo_place_id?: string | null;
  _geoScore?: number;
  _geoLevel?: string;

  _aiScore?: number;
  _aiReason?: string;
};

type AiRecommendation = {
  title: string;
  text: string;
  href: string;
  badge: string;
  icon: string;
};

type ProcurementSearchMemory = {
  query: string;
  module: ModFilter;
  timestamp: number;
};

function readProcurementSearchMemory(): ProcurementSearchMemory[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem("3bigha.procurement.search.memory.v1");
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveProcurementSearchMemory(item: ProcurementSearchMemory) {
  if (typeof window === "undefined") return;

  try {
    const prev = readProcurementSearchMemory();

    const next = [
      item,
      ...prev.filter(
        (x) =>
          !(
            x.query.toLowerCase() === item.query.toLowerCase() &&
            x.module === item.module
          )
      ),
    ].slice(0, 8);

    window.localStorage.setItem(
      "3bigha.procurement.search.memory.v1",
      JSON.stringify(next)
    );
  } catch {}
}

function searchTokens(input: string) {
  return safeText(input)
    .toLowerCase()
    .replace(/coochbehar/g, "cooch behar")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && !["near", "with", "from", "into", "land"].includes(x))
    .slice(0, 6);
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function pickGeoFromQuery(sp: { get: (key: string) => string | null }) {
  return {
    buyerGeoStateId: safeText(sp.get("geo_state_id")) || null,
    buyerGeoDistrictId: safeText(sp.get("geo_district_id")) || null,
    buyerGeoSubdivisionId: safeText(sp.get("geo_subdivision_id")) || null,
    buyerGeoBlockId: safeText(sp.get("geo_block_id")) || null,
    buyerGeoPlaceId: safeText(sp.get("geo_place_id")) || null,
  };
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

function moduleEmoji(m: SearchModule) {
  if (m === "property") return "🏠";
  if (m === "materials") return "🧱";
  if (m === "services") return "🛠️";
  if (m === "rentals") return "🚜";
  return "📰";
}

function moduleTrustLabel(m: SearchModule) {
  if (m === "property") return "Location match";
  if (m === "materials") return "Procurement ready";
  if (m === "services") return "Provider match";
  if (m === "rentals") return "Availability signal";
  return "Knowledge result";
}

function resultActionHref(r: ResultRow, q: string) {
  if (r.module === "materials") return `/rfq/general/new?query=${encodeURIComponent(q || r.title)}`;
  if (r.module === "services") return `/vendor/discovery?q=${encodeURIComponent(q || r.title)}&module=services`;
  if (r.module === "rentals") return `/rentals?search=${encodeURIComponent(q || r.title)}`;
  if (r.module === "property") return `/search?module=property&q=${encodeURIComponent(q || r.title)}`;
  return r.href;
}

function fallbackRecommendations(q: string, module: ModFilter): AiRecommendation[] {
  const clean = encodeURIComponent(q || "marketplace requirement");
  const moduleLabelText = module === "all" ? "marketplace" : module;

  return [
    {
      title: "Create a smart RFQ",
      text: "Convert this search into a requirement and get vendor responses.",
      href: `/rfq/general/new?query=${clean}`,
      badge: "Procurement action",
      icon: "⚡",
    },
    {
      title: "Find matching vendors",
      text: `Discover nearby vendors related to this ${moduleLabelText} search.`,
      href: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
      badge: "Vendor discovery",
      icon: "🎯",
    },
    {
      title: "Check price movement",
      text: "Use Price Today before buying, selling or negotiating.",
      href: `/price-today?q=${clean}`,
      badge: "Price intelligence",
      icon: "📊",
    },
  ];
}

function parseNum(v: string | null) {
  const s = safeText(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function buildConversationalMarketplaceSuggestions(input: {
  query: string;
  module: ModFilter;
}) {
  const q = safeText(input.query).toLowerCase();

  const suggestions: {
    label: string;
    href: string;
    tone: "blue" | "green" | "purple" | "amber";
  }[] = [];

  const encoded = encodeURIComponent(input.query);

  if (/cement|tmt|rod|brick|sand|stone/.test(q)) {
    suggestions.push(
      {
        label: "Need transport also?",
        href: `/services?q=${encoded} transport`,
        tone: "blue",
      },
      {
        label: "Need unloading labour?",
        href: `/services?q=${encoded} labour`,
        tone: "green",
      },
      {
        label: "Want branded materials?",
        href: `/search?q=branded ${encoded}&module=materials`,
        tone: "purple",
      },
      {
        label: "Create bulk RFQ",
        href: `/rfq/general/new?query=${encoded}`,
        tone: "amber",
      }
    );
  }

  if (/land|plot|flat|house|property/.test(q)) {
    suggestions.push(
      {
        label: "Check investment potential",
        href: `/investment/opportunities?q=${encoded}`,
        tone: "green",
      },
      {
        label: "Need construction estimate?",
        href: `/house-construction-cost`,
        tone: "blue",
      },
      {
        label: "Find nearby contractors",
        href: `/vendor/discovery?q=contractor&module=services`,
        tone: "purple",
      }
    );
  }

  if (/mason|contractor|electrician|plumber|rajmistri/.test(q)) {
    suggestions.push(
      {
        label: "Create hiring RFQ",
        href: `/rfq/general/new?query=${encoded}`,
        tone: "amber",
      },
      {
        label: "Compare local vendors",
        href: `/vendor/discovery?q=${encoded}&module=services`,
        tone: "green",
      },
      {
        label: "Need material suppliers too?",
        href: `/search?q=materials for ${encoded}&module=materials`,
        tone: "blue",
      }
    );
  }

  if (/jcb|machine|rental|rent/.test(q)) {
    suggestions.push(
      {
        label: "Check rental availability",
        href: `/rentals?search=${encoded}`,
        tone: "amber",
      },
      {
        label: "Need operator also?",
        href: `/services?q=machine operator`,
        tone: "green",
      }
    );
  }

  if (!suggestions.length) {
    suggestions.push(
      {
        label: "Create smart RFQ",
        href: `/rfq/general/new?query=${encoded}`,
        tone: "blue",
      },
      {
        label: "Find matching vendors",
        href: `/vendor/discovery?q=${encoded}`,
        tone: "green",
      }
    );
  }

  return suggestions.slice(0, 5);
}

function conversationalSuggestionTone(
  tone: "blue" | "green" | "purple" | "amber"
) {
  if (tone === "green") {
    return {
      background: "#ecfdf5",
      border: "#bbf7d0",
      color: "#047857",
    };
  }

  if (tone === "purple") {
    return {
      background: "#f5f3ff",
      border: "#ddd6fe",
      color: "#5b21b6",
    };
  }

  if (tone === "amber") {
    return {
      background: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    };
  }

  return {
    background: "#eff6ff",
    border: "#bfdbfe",
    color: "#1d4ed8",
  };
}

function detectLightweightSearchIntent(query: string) {
  const q = safeText(query).toLowerCase();

  return {
    wantsProperty:
      /land|plot|flat|house|home|property|জমি|বাড়ি|फ्लैट|जमीन/.test(q),
    wantsMaterials:
      /cement|rod|tmt|brick|sand|stone|tiles|paint|সিমেন্ট|রড|ইট|बालू/.test(q),
    wantsServices:
      /mason|rajmistri|contractor|electrician|plumber|architect|service|মিস্ত্রি|রাজমিস্ত্রি|ठेकेदार/.test(q),
    wantsRentals:
      /jcb|rental|rent|mixer|scaffold|machine|ভাড়া|किराया/.test(q),
    wantsCheap:
      /cheap|budget|low price|কম দাম|সস্তা|सस्ता|budget/.test(q),
    wantsInvestment:
      /investment|growth|future|return|bargain|high growth|বিনিয়োগ|लाभ/.test(q),
    wantsNearby:
      /near me|nearby|near|local|লোকাল|पास|नजदीक/.test(q),
  };
}

function scoreSearchResultForUser(input: {
  row: ResultRow;
  query: string;
  memory: DiscoveryMemoryItem[];
  moduleFilter: ModFilter;
}) {
  const { row, query, memory, moduleFilter } = input;
  const intent = detectLightweightSearchIntent(query);
  const text = `${row.title || ""} ${row.subtitle || ""} ${row.meta || ""}`.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  if (moduleFilter !== "all" && row.module === moduleFilter) {
    score += 18;
    reasons.push("module match");
  }

  if (text.includes(query.toLowerCase())) {
    score += 20;
    reasons.push("exact query match");
  }

  for (const token of query.toLowerCase().split(/\s+/).filter((x) => x.length >= 3).slice(0, 8)) {
    if (text.includes(token)) score += 5;
  }

  if (intent.wantsProperty && row.module === "property") {
    score += 18;
    reasons.push("property intent");
  }
  if (intent.wantsMaterials && row.module === "materials") {
    score += 18;
    reasons.push("material intent");
  }
  if (intent.wantsServices && row.module === "services") {
    score += 18;
    reasons.push("service intent");
  }
  if (intent.wantsRentals && row.module === "rentals") {
    score += 18;
    reasons.push("rental intent");
  }

  if (intent.wantsCheap && row._price != null && row._price > 0) {
    score += 8;
    reasons.push("budget signal");
  }

  if (intent.wantsInvestment && row.module === "property") {
    score += 10;
    reasons.push("investment signal");
  }

  for (const item of memory.slice(0, 8)) {
    const mText = `${item.locality || ""} ${item.city || ""} ${item.district || ""} ${item.title || ""}`.toLowerCase();
    const recency = Math.max(0.35, 1 - (Date.now() - Number(item.viewedAt || 0)) / 1000 / 60 / 60 / 24 / 14);

    if (item.module === row.module) {
      score += Math.round(5 * recency);
    }

    for (const place of [item.locality, item.city, item.district].filter(Boolean)) {
      const p = String(place).toLowerCase();
      if (p && text.includes(p)) {
        score += Math.round(14 * recency);
        reasons.push("near recent interest");
        break;
      }
    }

    if (mText && query.toLowerCase().includes(mText)) {
      score += Math.round(6 * recency);
    }
  }

  return {
    score,
    reason: reasons[0] || "marketplace match",
  };
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
function SearchInsightSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: any;
}) {
  return (
    <details
      open={defaultOpen}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        background: "#ffffff",
        boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          padding: "12px 15px",
          background: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        <span>
          {title}
          {subtitle ? (
            <span
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 12,
                fontWeight: 750,
                color: "#64748b",
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </span>

        <span
          style={{
            borderRadius: 12,
            background: "#dbeafe",
            color: "#1e40af",
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          Open details
        </span>
      </summary>

      <div style={{ padding: "0 12px 12px" }}>{children}</div>
    </details>
  );
}
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


function CompactSearchPanel({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          border: 0,
          background: open ? "#f8fafc" : "#ffffff",
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 950, color: "#0f172a" }}>
            {title}
          </span>
          {subtitle ? (
            <span
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 12,
                fontWeight: 750,
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </span>

        <span
          style={{
            flex: "0 0 auto",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            padding: "4px 8px",
            fontSize: 12,
            fontWeight: 950,
            color: "#334155",
            background: "#ffffff",
          }}
        >
          {open ? "Hide" : "More"}
        </span>
      </button>

      {open ? <div style={{ padding: 12, borderTop: "1px solid #e2e8f0" }}>{children}</div> : null}
    </div>
  );
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
  const [recentDiscovery, setRecentDiscovery] = useState<DiscoveryMemoryItem[]>([]);
  const [recentProcurementSearches, setRecentProcurementSearches] = useState<
    ProcurementSearchMemory[]
  >([]);

  const [journeyActions, setJourneyActions] = useState<
    ProcurementJourneyAction[]
  >([]);
  const [note, setNote] = useState<string | null>(null);
  const [lastAiIntent, setLastAiIntent] = useState<AiSearchIntent | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendation[]>([]);
  const [recommendationSummary, setRecommendationSummary] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const aiAutoAppliedRef = useRef<string>("");
  const [isCompactSearchLayout, setIsCompactSearchLayout] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleResultCount, setVisibleResultCount] = useState(12);

  useEffect(() => {
    setVisibleResultCount(12);
  }, [qFromUrl, modFromUrl]);

  useEffect(() => {
    function updateSearchLayout() {
      const compact = window.innerWidth < 980;
      setIsCompactSearchLayout(compact);
      if (!compact) setFiltersOpen(true);
    }

    updateSearchLayout();
    window.addEventListener("resize", updateSearchLayout);
    return () => window.removeEventListener("resize", updateSearchLayout);
  }, []);

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

  useEffect(() => {
    if (!qFromUrl) return;

    try {
      const workflow = {
        query: qFromUrl,
        module: modFromUrl,
        stage: "search",
        title: `Search: ${qFromUrl}`,
        href: `/search?q=${encodeURIComponent(qFromUrl)}${
          modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""
        }`,
        rfqHref: `/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`,
        vendorHref: `/vendor/discovery?q=${encodeURIComponent(qFromUrl)}${
          modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""
        }`,
        priceHref: `/price-today?q=${encodeURIComponent(qFromUrl)}`,
        updatedAt: Date.now(),
      };

      window.localStorage.setItem(
        "3bigha_active_workflow",
        JSON.stringify(workflow)
      );
    } catch {
      // ignore localStorage errors
    }
  }, [qFromUrl, modFromUrl]);

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

  // Keep auto-search active, but do not auto-rewrite filters while typing.
  // Auto AI rerouting caused repeated URL/filter changes and layout jumping.

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
      setNote("Type what you are looking for, then use Smart Smart Search.");
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
        setNote(data?.error || "Smart Smart Search could not understand this query.");
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

      setLastAiIntent(data);
      setNote(data.explanation || "Smart Smart Search applied better filters.");

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
      setNote("Smart Smart Search failed. Normal search is still available.");
    } finally {
      setAiBusy(false);
    }
  }

  // Search runner
  useEffect(() => {
    let alive = true;

    async function run() {
      setErr(null);
      setNote(null);

      const q = safeText(qFromUrl);
      if (!q) {
        setRows([]);
        return;
      }

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
  const propertyTerms = [
    term,
    term.replace(/coochbehar/gi, "cooch behar"),
    ...searchTokens(term),
  ].filter(Boolean);

  const or = propertyTerms
    .flatMap((t) => [
      `title.ilike.%${t}%`,
      `locality.ilike.%${t}%`,
      `city.ilike.%${t}%`,
      `district.ilike.%${t}%`,
      `state.ilike.%${t}%`,
    ])
    .join(",");

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

        // AI Dynamic Search Intelligence: lightweight local ranking
        const order: Record<SearchModule, number> = {
          property: 1,
          materials: 2,
          services: 3,
          rentals: 4,
          blog: 5,
        };

        const memory = readDiscoveryMemory();

        filtered = filtered
          .map((row) => {
            const ai = scoreSearchResultForUser({
              row,
              query: q,
              memory,
              moduleFilter: modFromUrl,
            });

            const unified = scoreUnifiedMarketplaceResult({
              module: row.module,
              title: row.title,
              subtitle: row.subtitle,
              meta: row.meta,
              price: row._price,
              query: q,
              moduleFilter: modFromUrl,
            });

            const geo = computeMarketplaceGeoScore({
              ...pickGeoFromQuery(sp),
              listingGeoStateId: row._geo_state_id,
              listingGeoDistrictId: row._geo_district_id,
              listingGeoSubdivisionId: row._geo_subdivision_id,
              listingGeoBlockId: row._geo_block_id,
              listingGeoPlaceId: row._geo_place_id,
            });

            let distanceBonus = 0;

            if (
              latFromUrl != null &&
              lngFromUrl != null &&
              row._lat != null &&
              row._lng != null
            ) {
              const km = haversineKm(
                latFromUrl,
                lngFromUrl,
                row._lat,
                row._lng
              );

              if (km <= 5) distanceBonus = 30;
              else if (km <= 15) distanceBonus = 20;
              else if (km <= 30) distanceBonus = 10;
            }

            return {
              ...row,
              _geoScore: geo.score + distanceBonus,
              _geoLevel: geo.level,
              _aiScore: ai.score + unified.score + geo.score + distanceBonus,
              _aiReason:
                geo.score > 0
                  ? `geo ${geo.level} match`
                  : unified.score > 0
                  ? unified.reason
                  : ai.reason,
            };
          })
          .sort((a, b) => {
            const aiDiff = (b._aiScore || 0) - (a._aiScore || 0);
            if (aiDiff !== 0) return aiDiff;
            return (order[a.module] ?? 99) - (order[b.module] ?? 99);
          });

        if (!alive) return;

        setRows(filtered);

        if (q && filtered.length > 0) {
          saveProcurementSearchMemory({
            query: q,
            module: modFromUrl,
            timestamp: Date.now(),
          });

          setRecentProcurementSearches(readProcurementSearchMemory());

          const nextActions = buildSearchJourneyActions(q, modFromUrl);

          nextActions.forEach((action) => {
            saveProcurementJourneyAction(action);
          });

          setJourneyActions(readProcurementJourneyActions());
        }
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

  useEffect(() => {
    let alive = true;

    async function loadRecommendations() {
      const q = safeText(qFromUrl);

      if (!q) {
        setAiRecommendations([]);
        setRecommendationSummary("");
        return;
      }

      setAiRecommendations(buildUnifiedMarketplaceRecommendations(q, modFromUrl));
      setRecommendationSummary(getUnifiedMarketplaceSummary(q));

      try {
        const params = new URLSearchParams();
        params.set("q", q);
        if (modFromUrl !== "all") params.set("category", modFromUrl);

        const res = await fetch(`/api/ai/marketplace-discovery?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        const discovery = data?.discovery || null;

        if (!alive || !discovery) return;

        const vendors = Array.isArray(discovery?.vendors) ? discovery.vendors : [];
        const categories = Array.isArray(discovery?.categories) ? discovery.categories : [];

        const next: AiRecommendation[] = [
          {
            title: vendors.length > 0 ? `${vendors.length} vendor signals found` : "Vendor network ready",
            text:
              discovery?.summary ||
              "3bigha AI found marketplace discovery signals related to your search.",
            href: `/vendor/discovery?q=${encodeURIComponent(q)}${modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""}`,
            badge: "Live discovery",
            icon: "🎯",
          },
          {
            title: categories?.[0]?.name || "Related marketplace category",
            text: "Continue discovery with category-aware Recommendations.",
            href: `/search?q=${encodeURIComponent(q)}${modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""}`,
            badge: "Related opportunity",
            icon: "🧠",
          },
          {
            title: "Turn search into RFQ",
            text: "If this is a buying or service requirement, send it to vendors as an RFQ.",
            href: `/rfq/general/new?query=${encodeURIComponent(q)}`,
            badge: "Next best action",
            icon: "⚡",
          },
        ];

        setAiRecommendations(next);
        setRecommendationSummary(
          discovery?.summary ||
            "Recommendation engine connected search, vendors, categories and RFQ actions."
        );
      } catch {
        if (!alive) return;
        setAiRecommendations(fallbackRecommendations(q, modFromUrl));
        setRecommendationSummary(getUnifiedMarketplaceSummary(q));
      }
    }

    loadRecommendations();

    return () => {
      alive = false;
    };
  }, [qFromUrl, modFromUrl]);

  useEffect(() => {
    setRecentDiscovery(readDiscoveryMemory());
    setRecentProcurementSearches(readProcurementSearchMemory());
    setJourneyActions(readProcurementJourneyActions());
  }, []);

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
        module:
          modFromUrl === "property" ||
          modFromUrl === "materials" ||
          modFromUrl === "services" ||
          modFromUrl === "rentals"
            ? modFromUrl
            : null,
        area: localSearchIntent.areaHint || undefined,
      }),
    [qFromUrl, modFromUrl, localSearchIntent.areaHint]
  );

  const rfqConversion = useMemo(
    () =>
      buildSearchToRfqConversion({
        query: qFromUrl,
        module: modFromUrl,
      }),
    [qFromUrl, modFromUrl]
  );

  const vendorLiquidity = useMemo(() => {

    return buildVendorLiquidityInsight({
        query: qFromUrl,
        module: modFromUrl,
        resultCount: rows.length,
      });
  }, [qFromUrl, modFromUrl, rows.length]
  );

  const procurementDecision = useMemo(() => {

    return buildProcurementDecisionInsight({
        query: qFromUrl,
        module: modFromUrl,
        resultCount: rows.length,
        vendorLiquidityScore: vendorLiquidity.score,
      });
  }, [qFromUrl, modFromUrl, rows.length, vendorLiquidity.score]
  );

  const vendorIntelligence = useMemo(() => {

    return buildVendorIntelligenceInsight({
        query: qFromUrl,
        module: modFromUrl,
        resultCount: rows.length,
        liquidityScore: vendorLiquidity.score,
        procurementReadinessScore: procurementDecision.readinessScore,
      });
  }, [
      qFromUrl,
      modFromUrl,
      rows.length,
      vendorLiquidity.score,
      procurementDecision.readinessScore,
    ]
  );

  const vendorNegotiation = useMemo(() => {

    return buildVendorNegotiationInsight({
        query: qFromUrl,
        module: modFromUrl,
        resultCount: rows.length,
        vendorLiquidityScore: vendorLiquidity.score,
        procurementReadinessScore: procurementDecision.readinessScore,
        vendorQualityScore: vendorIntelligence.qualityScore,
      });
  }, [
      qFromUrl,
      modFromUrl,
      rows.length,
      vendorLiquidity.score,
      procurementDecision.readinessScore,
      vendorIntelligence.qualityScore,
    ]
  );

    const currentJourneyActions = useMemo(() => {
    const seen = new Set<string>();

    return buildSearchJourneyActions(qFromUrl, modFromUrl).filter((action) => {
      const normalizedLabel = action.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

      const actionFamily =
        action.href.includes("/price-today")
          ? "price"
          : action.href.includes("/vendor/discovery")
          ? "vendor"
          : action.href.includes("/rfq")
          ? "rfq"
          : normalizedLabel;

      const key = `${actionFamily}-${action.href.split("?")[0]}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [qFromUrl, modFromUrl]);

  const procurementActionCopilot = useMemo(() => {

    return buildProcurementActionCopilot({
        query: qFromUrl,
        module: modFromUrl,
        readinessScore: procurementDecision.readinessScore,
        negotiationScore: vendorNegotiation.negotiationScore,
      });
  }, [
      qFromUrl,
      modFromUrl,
      procurementDecision.readinessScore,
      vendorNegotiation.negotiationScore,
    ]
  );

  const procurementQuickSignals = [
    {
      label: "Readiness",
      value: `${procurementDecision.readinessScore || 0}/100`,
      tone: "#eff6ff",
      color: "#1d4ed8",
    },
    {
      label: "Vendor liquidity",
      value: `${vendorLiquidity.score || 0}/100`,
      tone: "#ecfdf5",
      color: "#047857",
    },
    {
      label: "Vendor quality",
      value: `${vendorIntelligence.qualityScore || 0}/100`,
      tone: "#f5f3ff",
      color: "#5b21b6",
    },
    {
      label: "Negotiation",
      value: `${vendorNegotiation.negotiationScore || 0}/100`,
      tone: "#fffbeb",
      color: "#92400e",
    },
    {
      label: "Results",
      value: String(rows.length),
      tone: "#f8fafc",
      color: "#334155",
    },
  ];

  const conversationalSuggestions = useMemo(
    () =>
      buildConversationalMarketplaceSuggestions({
        query: qFromUrl,
        module: modFromUrl,
      }),
    [qFromUrl, modFromUrl]
  );

  const executionRailActions = [
    {
      label: "Create RFQ",
      href: `/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`,
      icon: "⚡",
      primary: true,
    },
    {
      label: "Find Vendors",
      href: `/vendor/discovery?q=${encodeURIComponent(qFromUrl)}${
        modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""
      }`,
      icon: "🎯",
      primary: false,
    },
    {
      label: "Check Price",
      href: `/price-today?q=${encodeURIComponent(qFromUrl)}`,
      icon: "📊",
      primary: false,
    },
    {
      label: "Help",
      href: `/vendor/discovery?q=${encodeURIComponent(qFromUrl)}${
        modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""
      }`,
      icon: "🤖",
      primary: false,
    },
  ];

  return (
    <Container>
      <SectionHeader title="Marketplace Search" subtitle="Start with what you need. 3Bigha will guide discovery, comparison, RFQ and vendor workflow." />

      <Card>
        <CardBody>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>Search</div>

              <div
                style={{
                  position: "relative",
                  minWidth: 260,
                  flex: "1 1 360px",
                }}
                onBlur={() => {
                  window.setTimeout(() => setAutocompleteOpen(false), 140);
                }}
              >
                <input
                  value={qInput}
                  onFocus={() => setAutocompleteOpen(true)}
                  onChange={(e) => {
                    setQInput(e.target.value);
                    setAutocompleteOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setAutocompleteOpen(false);
                      submitNow();
                    }
                    if (e.key === "Escape") {
                      setAutocompleteOpen(false);
                    }
                  }}
                  placeholder="Type: cement price, 500 bags cement, rajmistri, 2 katha land…"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: "0 12px",
                    width: "100%",
                  }}
                />

                {autocompleteOpen ? (
                  <UnifiedSearchAutocomplete
                    query={qInput}
                    module={modInput}
                    recentLocations={recentDiscovery
                      .map((item) => item.locality || item.city || item.district || "")
                      .filter(Boolean)
                      .slice(0, 4)}
                    onApply={(suggestion) => {
                      setAutocompleteOpen(false);
                      setQInput(suggestion.query);
                      if (suggestion.module && suggestion.module !== "all") {
                        setModInput(suggestion.module as ModFilter);
                      }

                      pushUrl({
                        q: suggestion.query,
                        module: (suggestion.module as ModFilter) || modInput,
                        intent: intentInput,
                        min: minInput,
                        max: maxInput,
                        near: nearOn,
                        lat: latFromUrl,
                        lng: lngFromUrl,
                        km: nearKm,
                      });
                    }}
                  />
                ) : null}
              </div>

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
                title="Open workflow assistant with vendor recommendations"
              >
                Workflow Assistant
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

            <div style={{ display: "grid", gap: 8 }}>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                style={{
                  width: "fit-content",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                ⚙ Filters {filtersOpen ? "Hide" : "More"}
              </button>

              {filtersOpen ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
              ) : null}
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

      {loading && rows.length === 0 ? (
        <EmptyState message="Searching…" />
      ) : err ? (
        <EmptyState message={err} />
      ) : hasQuery && rows.length > 0 ? (
        <>
          <div style={{ marginBottom: 6, fontWeight: 950, color: "#0f172a" }}>
            Matching results: {rows.length}
          </div>

          <div style={{ display: "grid", gap: 5 }}>
            {rows.slice(0, visibleResultCount).map((r) => (
              <Card key={`quick:${r.module}:${r.id}`}>
                <CardBody style={{ padding: isCompactSearchLayout ? 6 : 8 }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 13 }}>{moduleEmoji(r.module)}</span>
                          <span style={{ borderRadius: 999, background: "#eef6ff", color: "#0b57d0", padding: "2px 6px", fontSize: 9, fontWeight: 950 }}>
                            {moduleLabel(r.module)}
                          </span>
                          {(r._aiScore || 0) > 0 ? (
                            <span style={{ borderRadius: 999, background: "#fef3c7", color: "#92400e", padding: "2px 6px", fontSize: 9, fontWeight: 950 }}>
                              Best match
                            </span>
                          ) : null}
                        </div>

                        <div style={{ marginTop: 1, fontSize: 12.8, fontWeight: 950, color: "#020617", lineHeight: 1.12 }}>
                          {r.title}
                        </div>

                        {r.subtitle ? (
                          <div style={{ marginTop: 0, color: "#475569", fontSize: 10.5, fontWeight: 800, lineHeight: 1.15 }}>
                            📍 {r.subtitle}
                          </div>
                        ) : null}

                        {r.meta ? (
                          <div style={{ marginTop: 0, color: "#64748b", fontSize: 10, fontWeight: 850, lineHeight: 1.1 }}>
                            {r.meta}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Link href={r.href} className="topBtn topBtnGhost" style={{ textDecoration: "none", fontSize: 10, padding: "4px 7px", minHeight: 24 }}>
                          View
                        </Link>
                        <Link href={resultActionHref(r, qFromUrl)} className="topBtn" style={{ textDecoration: "none", fontSize: 10, padding: "4px 7px", minHeight: 24 }}>
                          {r.module === "materials" ? "RFQ" : r.module === "services" ? "Vendors" : r.module === "rentals" ? "Rental" : "Next"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {visibleResultCount < rows.length ? (
            <button
              type="button"
              onClick={() => setVisibleResultCount((v) => Math.min(v + 12, rows.length))}
              style={{
                marginTop: 12,
                width: "100%",
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: 14,
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Show more results ({Math.min(visibleResultCount + 12, rows.length)} of {rows.length})
            </button>
          ) : null}

          <div style={{ height: 12 }} />

          <details style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#ffffff", padding: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 950, color: "#0f172a" }}>
              Continue Your Search
            </summary>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <CompactSearchPanel title="⚡ RFQ" subtitle="Create requirement from this search">
                <Link href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                  Create RFQ
                </Link>
              </CompactSearchPanel>

              <CompactSearchPanel title="🎯 Vendors" subtitle="Find vendors for this requirement">
                <Link href={`/vendor/discovery?q=${encodeURIComponent(qFromUrl)}${modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""}`} className="topBtn" style={{ textDecoration: "none" }}>
                  Find Vendors
                </Link>
              </CompactSearchPanel>

              <CompactSearchPanel title="📊 Price" subtitle="Check current market price">
                <Link href={`/price-today?q=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                  Check Price
                </Link>
              </CompactSearchPanel>

              {(modFromUrl === "property" || modFromUrl === "all") ? (
                <>
                  <CompactSearchPanel title="🏗️ Construction Cost" subtitle="Estimate house/building cost">
                    <Link href={`/construction-cost?q=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                      Open Construction Cost
                    </Link>
                  </CompactSearchPanel>

                  <CompactSearchPanel title="🏦 EMI" subtitle="Calculate loan EMI">
                    <Link href={`/emi-calculator?q=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                      Open EMI Calculator
                    </Link>
                  </CompactSearchPanel>

                  <CompactSearchPanel title="📈 Investment" subtitle="Explore investment opportunity context">
                    <Link href={`/investment/opportunities?q=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                      Explore Investment
                    </Link>
                  </CompactSearchPanel>
                </>
              ) : null}

              <CompactSearchPanel title="🧠 AI Insights" subtitle="Open detailed marketplace intelligence only if needed">
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 900 }}>Results: {rows.length}</div>
                  <div style={{ color: "#64748b", fontWeight: 750 }}>
                    Use RFQ, vendor discovery and price tools when you want to continue from this search.
                  </div>
                </div>
              </CompactSearchPanel>
            </div>
          </details>

          <div style={{ height: 12 }} />
        </>
      ) : hasQuery && !loading && rows.length === 0 ? (
        <>
          <EmptyState message="No results found. Try a broader keyword or choose All category." />
          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery ? (
        <>
          <UniversalWorkflowHeader
            eyebrow="Search Workflow"
            title={`You are searching: ${qFromUrl}`}
            status={`${rows.length} result(s) found in ${modFromUrl === "all" ? "marketplace" : moduleLabel(modFromUrl as SearchModule)}.`}
            nextAction={
              modFromUrl === "materials"
                ? "Create RFQ or compare suppliers before buying."
                : modFromUrl === "property"
                  ? "Review matching listings, then check construction or legal workflow."
                  : modFromUrl === "services"
                    ? "Compare providers and confirm scope of work."
                    : modFromUrl === "rentals"
                      ? "Check availability, duration and operator support."
                      : "Choose the best result or create a requirement."
            }
            steps={[
              { label: "Search", done: true },
              { label: "Vendor Discovery", active: true },
              { label: "Negotiation" },
              { label: "Confirmation" },
              { label: "Delivery" },
              { label: "Complete" },
            ]}
            actions={executionRailActions.map((action) => ({
              label: `${action.icon} ${action.label}`,
              href: action.href,
              primary: action.primary,
            }))}
          />

          <div style={{ height: 12 }} />

          <div
            style={{
              position: "sticky",
              top: isCompactSearchLayout ? 8 : 84,
              zIndex: 40,
              border: "1px solid #dbeafe",
              borderRadius: 18,
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
              padding: isCompactSearchLayout ? 10 : 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 4,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
                  Execution Workspace
                </div>

                <span
                  style={{
                    borderRadius: 12,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "4px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {modFromUrl === "all" ? "Marketplace" : moduleLabel(modFromUrl as SearchModule)}
                </span>

                <span
                  style={{
                    borderRadius: 12,
                    background: "#ecfdf5",
                    color: "#047857",
                    padding: "4px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  Readiness {(procurementDecision.readinessScore || 0)}/100
                </span>

                <span
                  style={{
                    borderRadius: 12,
                    background: "#f5f3ff",
                    color: "#5b21b6",
                    padding: "4px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {rows.length} Results
                </span>
              </div>

              <div
                style={{
                  marginTop: 1,
                  fontSize: 13,
                  fontWeight: 850,
                  color: "#334155",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isCompactSearchLayout ? "100%" : 520,
                }}
              >
                🔎 {qFromUrl}
              </div>

              <div
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  fontWeight: 850,
                  color: "#334155",
                }}
              >
                Continue this search through RFQ, vendor discovery or price check.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: isCompactSearchLayout ? "auto" : "visible",
                maxWidth: isCompactSearchLayout ? "100%" : "none",
                paddingBottom: isCompactSearchLayout ? 2 : 0,
              }}
            >
              {executionRailActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    textDecoration: "none",
                    borderRadius: 12,
                    border: action.primary ? "1px solid #0f172a" : "1px solid #bfdbfe",
                    background: action.primary ? "#0f172a" : "#eff6ff",
                    color: action.primary ? "#ffffff" : "#1d4ed8",
                    padding: "9px 13px",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.icon} {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery ? (
        <>
          <AIExecutionDrawer
            input={{
              query: qFromUrl,
              module: modFromUrl,
              source: "search",
              readinessScore: procurementDecision.readinessScore,
              negotiationScore: vendorNegotiation.negotiationScore,
              resultCount: rows.length,
            }}
          />

          <div style={{ height: 12 }} />

          <Card>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  borderRadius: 18,
                  background: "#ffffff",
                  border: "1px solid #bfdbfe",
                  padding: isCompactSearchLayout ? 12 : 14,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#1d4ed8",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Workflow Focus
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: isCompactSearchLayout ? 16 : 18,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {qFromUrl}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    Best next step: create RFQ, compare vendors, check price, or continue search results.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Link
                    href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`}
                    style={{
                      textDecoration: "none",
                      borderRadius: 12,
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "9px 13px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    ⚡ Create RFQ
                  </Link>

                  <Link
                    href={`/vendor/discovery?q=${encodeURIComponent(qFromUrl)}${
                      modFromUrl !== "all" ? `&module=${encodeURIComponent(modFromUrl)}` : ""
                    }`}
                    style={{
                      textDecoration: "none",
                      borderRadius: 12,
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #bbf7d0",
                      padding: "9px 13px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    🎯 Vendors
                  </Link>

                  <Link
                    href={`/price-today?q=${encodeURIComponent(qFromUrl)}`}
                    style={{
                      textDecoration: "none",
                      borderRadius: 12,
                      background: "#f5f3ff",
                      color: "#5b21b6",
                      border: "1px solid #ddd6fe",
                      padding: "9px 13px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    📊 Price
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && !loading && rows.length === 0 ? (
        <>
          <EmptyState message="No results found. Try a broader keyword or choose All category." />
          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && conversationalSuggestions.length > 0 ? (
        <>
          <CompactSearchPanel
            title="✨ Suggested next steps for this workflow"
            subtitle="Optional next-step prompts for procurement, vendors, RFQ and pricing"
          >
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 950,
                      color: "#0b57d0",
                    }}
                  >
                    Marketplace Workflow Suggestions
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Suggested next steps for this workflow
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#64748b",
                      fontWeight: 750,
                    }}
                  >
                    Continue with practical next actions for RFQ, vendors, pricing and execution.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {conversationalSuggestions.map((item) => {
                    const tone = conversationalSuggestionTone(item.tone);

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        style={{
                          textDecoration: "none",
                          border: `1px solid ${tone.border}`,
                          background: tone.background,
                          color: tone.color,
                          borderRadius: 12,
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 950,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✨ {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
          </CompactSearchPanel>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && currentJourneyActions.length > 0 ? (
        <>
          <ProcurementJourneyBar actions={currentJourneyActions} />

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && rows.length > 0 ? (
        <>
          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 950, color: "#0b57d0" }}>
                    Procurement Insights
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Compact execution guidance
                  </div>
                  <div style={{ marginTop: 4, color: "#64748b", fontWeight: 750 }}>
                    Key signals first. Open detailed intelligence cards only when needed.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 8,
                  }}
                >
                  {procurementQuickSignals.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        background: item.tone,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 950,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 16,
                          fontWeight: 800,
                          color: item.color,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {procurementDecision.show ? (
                  <CompactSearchPanel
                    title="🧠 Procurement Decision"
                    subtitle="Readiness, complexity, vendor count and RFQ probability"
                  >
                    <ProcurementDecisionPanel insight={procurementDecision} />
                  </CompactSearchPanel>
                ) : null}

                {rfqConversion.show ? (
                  <CompactSearchPanel
                    title="⚡ Search-to-RFQ Conversion"
                    subtitle="Convert this search into a structured requirement"
                  >
                    <SearchToRfqConversionCard conversion={rfqConversion} />
                  </CompactSearchPanel>
                ) : null}

                {vendorLiquidity.show ? (
                  <CompactSearchPanel
                    title="🎯 Vendor Liquidity"
                    subtitle="Active vendors, fast responders and response expectation"
                  >
                    <VendorLiquidityPanel insight={vendorLiquidity} />
                  </CompactSearchPanel>
                ) : null}

                {vendorIntelligence.show ? (
                  <CompactSearchPanel
                    title="🏅 Vendor Insights"
                    subtitle="Vendor quality, fit, locality and procurement suitability"
                  >
                    <VendorIntelligencePanel insight={vendorIntelligence} />
                  </CompactSearchPanel>
                ) : null}

                {vendorNegotiation.show ? (
                  <CompactSearchPanel
                    title="🤝 Negotiation Intelligence"
                    subtitle="RFQ acceptance, risk and best negotiation strategy"
                  >
                    <VendorNegotiationPanel insight={vendorNegotiation} />
                  </CompactSearchPanel>
                ) : null}

                {procurementActionCopilot.show ? (
                  <CompactSearchPanel
                    title="🚀 Workflow Suggestions"
                    subtitle="RFQ strengthening and next best actions"
                  >
                    <ProcurementActionCopilot insight={procurementActionCopilot} />
                  </CompactSearchPanel>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && lastAiIntent ? (
        <>
          <Card>
            <CardBody>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  background: "#ffffff",
                  color: "#ffffff",
                  borderRadius: 18,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 950, color: "#bfdbfe" }}>
                  Search Decision Engine
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>
                      {moduleEmoji((lastAiIntent?.module === "all" ? "property" : lastAiIntent?.module) as SearchModule)}{" "}
                      {lastAiIntent?.module === "all" ? "All Marketplace" : moduleLabel(lastAiIntent?.module as SearchModule)}
                    </div>
                    <div style={{ marginTop: 6, color: "rgba(255,255,255,0.78)", fontWeight: 750 }}>
                      {lastAiIntent?.explanation || "3Bigha selected the best search workflow for this query."}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ borderRadius: 12, background: "rgba(255,255,255,0.12)", padding: "8px 10px", fontWeight: 950 }}>
                      {Math.round(Number(lastAiIntent?.confidence || 0.75) * 100)}% confidence
                    </span>
                    {lastAiIntent?.near ? (
                      <span style={{ borderRadius: 12, background: "rgba(34,197,94,0.20)", padding: "8px 10px", fontWeight: 950 }}>
                        📍 Near me
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`} className="topBtn" style={{ textDecoration: "none" }}>
                    ⚡ Create RFQ
                  </Link>
                  <Link href={`/price-today?q=${encodeURIComponent(qFromUrl)}`} className="topBtn topBtnGhost" style={{ textDecoration: "none", background: "rgba(255,255,255,0.12)", color: "#ffffff" }}>
                    📊 Check Price
                  </Link>
                  <Link href={`/vendor/discovery?q=${encodeURIComponent(qFromUrl)}`} className="topBtn topBtnGhost" style={{ textDecoration: "none", background: "rgba(255,255,255,0.12)", color: "#ffffff" }}>
                    🎯 Find Vendors
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery && rows.length > 0 && aiRecommendations.length > 0 ? (
        <>
          <CompactSearchPanel
            title="✨ Marketplace Recommendations"
            subtitle="Related vendors, categories and next-step actions"
          >
              <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 950, color: "#0b57d0" }}>
                      Marketplace Recommendation Engine
                    </div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: "#0f172a" }}>
                      Recommended next steps for this search
                    </div>
                    <div style={{ marginTop: 4, color: "#64748b", fontWeight: 750 }}>
                      {recommendationSummary || "3Bigha is connecting search intent with RFQ, vendor and price workflows."}
                    </div>
                  </div>

                  <Link
                    href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`}
                    className="topBtn"
                    style={{ textDecoration: "none", alignSelf: "flex-start" }}
                  >
                    ⚡ Start RFQ
                  </Link>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {aiRecommendations.map((item) => (
                    <Link
                      key={`${item.badge}-${item.title}`}
                      href={item.href}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 14,
                        background: "#ffffff",
                        textDecoration: "none",
                        color: "inherit",
                        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span
                          style={{
                            borderRadius: 12,
                            background: "#eef6ff",
                            color: "#0b57d0",
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 950,
                            height: "fit-content",
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 950, color: "#0f172a" }}>
                        {item.title}
                      </div>
                      <div style={{ marginTop: 6, color: "#64748b", fontSize: 13, lineHeight: 1.5, fontWeight: 750 }}>
                        {item.text}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
          </CompactSearchPanel>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {false && hasQuery ? (
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
                  borderRadius: 12,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Search Discovery Guide
              </div>

              <div>
                <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20 }}>
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
                  ...searchKeywordClusters.related.slice(0, 5),
                  ...searchKeywordClusters.price.slice(0, 3),
                ].map((item) => (
                  <Link
                    key={item}
                    href={`/search?q=${encodeURIComponent(item)}${
                      localSearchIntent.module ? `&module=${localSearchIntent.module}` : ""
                    }`}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
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
                {searchKeywordClusters.rfq.slice(0, 3).map((item) => (
                  <Link
                    key={item}
                    href={`/rfq/general/new?q=${encodeURIComponent(item)}${
                      localSearchIntent.module ? `&module=${localSearchIntent.module}` : ""
                    }`}
                    style={{
                      background: "#f5f3ff",
                      border: "1px solid #ddd6fe",
                      borderRadius: 12,
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

      {!hasQuery ? (
        <>
          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
                    Marketplace Starter Workflows
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Start with a real need
                  </div>
                  <div style={{ marginTop: 4, color: "#64748b", fontWeight: 750 }}>
                    Choose a common property, material, service or rental need. 3Bigha will guide the next practical step.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    ["🧱 500 bags cement", "/search?q=500 bags cement&module=materials"],
                    ["🏠 2 katha land", "/search?q=2 katha land&module=property"],
                    ["👷 Need rajmistri", "/search?q=rajmistri for house&module=services"],
                    ["🚜 JCB rental", "/search?q=jcb rental&module=rentals"],
                    ["📊 Cement price", "/price-today?q=cement"],
                    ["⚡ Create RFQ", "/rfq/general/new"],
                  ].map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      style={{
                        textDecoration: "none",
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 12,
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <div style={{ height: 12 }} />

          <ProcurementReEngagement />

          <div style={{ height: 12 }} />

          <ProcurementMemoryTimeline />

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {!hasQuery && journeyActions.length > 0 ? (
        <>
          <ProcurementJourneyBar actions={journeyActions} />

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {!hasQuery && recentProcurementSearches.length ? (
        <>
          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    🔄 Continue procurement journey
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Resume recent marketplace searches, RFQ discovery and procurement workflows.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {recentProcurementSearches.map((item) => (
                    <Link
                      key={`${item.query}-${item.module}`}
                      href={`/search?q=${encodeURIComponent(item.query)}${
                        item.module !== "all"
                          ? `&module=${encodeURIComponent(item.module)}`
                          : ""
                      }`}
                      style={{
                        textDecoration: "none",
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        borderRadius: 12,
                        padding: "8px 12px",
                        color: "#1d4ed8",
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      🔎 {item.query}
                    </Link>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <div style={{ height: 12 }} />
        </>
      ) : null}

      {!hasQuery && recentDiscovery.length ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 800, color: "#1e3a8a" }}>✨ Continue your discovery</div>
            <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
              Recently viewed properties and localities can help you search faster.
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {recentDiscovery.slice(0, 6).map((item) => (
                <Link
                  key={`${item.module}:${item.id}`}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    borderRadius: 12,
                    padding: "8px 12px",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 950,
                  }}
                >
                  {item.locality || item.city || item.title}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div style={{ height: 12 }} />

      {false && hasQuery ? (
        <Card>
          <CardBody>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: "#1e3a8a" }}>🧠 Dynamic Search Intelligence</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                  Results are ranked using query intent, locality signals, marketplace fit and recent discovery memory.
                </div>
              </div>

              <Link
                href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`}
                style={{
                  textDecoration: "none",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                Convert to RFQ →
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : null}

            {false && hasQuery ? (
        <div
          style={{
            position: "sticky",
            left: isCompactSearchLayout ? 10 : 24,
            right: isCompactSearchLayout ? 10 : "auto",
            bottom: 12,
            zIndex: 80,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            borderRadius: 12,
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(12px)",
            padding: "10px 12px",
            boxShadow: "0 16px 40px rgba(15,23,42,0.22)",
          }}
        >
          <Link
            href={`/rfq/general/new?query=${encodeURIComponent(qFromUrl)}`}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              background: "#ffffff",
              color: "#0f172a",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            ⚡ RFQ
          </Link>

          <Link
            href={`/vendor/discovery?q=${encodeURIComponent(qFromUrl)}`}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              background: "#1d4ed8",
              color: "#ffffff",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            🎯 Vendors
          </Link>

          <Link
            href={`/price-today?q=${encodeURIComponent(qFromUrl)}`}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              background: "#7c3aed",
              color: "#ffffff",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            📊 Price
          </Link>

          <Link
            href={`/search?q=${encodeURIComponent(qFromUrl)}`}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              background: "#16a34a",
              color: "#ffffff",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Help
          </Link>
        </div>
      ) : null}

      <div style={{ height: 12 }} />

      {loading && rows.length > 0 ? (
        <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 900, color: "#64748b" }}>
          Searching latest results…
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <EmptyState message="Searching…" />
      ) : err ? (
        <EmptyState message={err} />
      ) : true ? null : !hasQuery ? null : rows.length === 0 ? null : (
        <>
          <div style={{ marginBottom: 10, fontWeight: 900, opacity: 0.8 }}>Matching results: {rows.length}</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompactSearchLayout ? "1fr" : "minmax(0, 1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
              {Object.entries(
                rows.reduce((acc, row) => {
                  if (!acc[row.module]) acc[row.module] = [];
                  acc[row.module].push(row);
                  return acc;
                }, {} as Record<string, ResultRow[]>)
              ).map(([group, groupRows]) => (
                <div
                  key={group}
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      position: "sticky",
                      top: isCompactSearchLayout ? 62 : 132,
                      zIndex: 12,
                      background: "rgba(248,250,252,0.92)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: "#0f172a",
                        fontSize: 14,
                      }}
                    >
                      {moduleEmoji(group as SearchModule)}{" "}
                      {moduleLabel(group as SearchModule)}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 950,
                        color: "#64748b",
                      }}
                    >
                      {groupRows.length} results
                    </div>
                  </div>

                  {groupRows.map((r) => {
              const workflowCards = getSearchWorkflowCards({
                query: qFromUrl,
                module: r.module,
                title: r.title,
                subtitle: r.subtitle,
                meta: r.meta,
                moduleFilter: modFromUrl,
              });

              return (
              <Card key={`${r.module}:${r.id}`}>
                <CardBody style={{ padding: isCompactSearchLayout ? 12 : 14 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 20 }}>{moduleEmoji(r.module)}</span>
                          <span
                            style={{
                              borderRadius: 12,
                              background: "#eef6ff",
                              color: "#0b57d0",
                              padding: "5px 8px",
                              fontSize: 11,
                              fontWeight: 950,
                            }}
                          >
                            {moduleLabel(r.module)}
                          </span>
                          <span
                            style={{
                              borderRadius: 12,
                              background: "#ecfdf5",
                              color: "#047857",
                              padding: "5px 8px",
                              fontSize: 11,
                              fontWeight: 950,
                            }}
                          >
                            {moduleTrustLabel(r.module)}
                          </span>

                          {(r._aiScore || 0) > 0 ? (
                            <span
                              style={{
                                borderRadius: 12,
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "5px 8px",
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              Best match +{r._aiScore} • {r._aiReason}
                            </span>
                          ) : null}
                        </div>

                        <div style={{ marginTop: 4, fontWeight: 800, fontSize: 16.5, color: "#020617", lineHeight: 1.32 }}>
                          {r.title}
                        </div>
                        {r.subtitle ? (
                          <div
                            style={{
                              marginTop: 2,
                              color: "#475569",
                              fontWeight: 800,
                              fontSize: 13,
                              lineHeight: 1.4,
                            }}
                          >
                            📍 {r.subtitle}
                          </div>
                        ) : null}
                        {r.meta ? (
                          <div
                            style={{
                              marginTop: 3,
                              color: "#64748b",
                              fontWeight: 900,
                              fontSize: 11.5,
                              lineHeight: 1.4,
                            }}
                          >
                            {r.meta}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={r.href}
                          className="topBtn topBtnGhost"
                          onClick={() => {
                            saveConversationContext({
                              query: qFromUrl,
                              module: modFromUrl,
                              source: "search",
                              href: r.href,
                              title: r.title,
                              timestamp: Date.now(),
                            });
                          }}
                          style={{
                            textDecoration: "none",
                            fontSize: 12,
                            padding: "7px 11px",
                            minHeight: 34,
                          }}
                        >
                          View →
                        </Link>

                        <Link
                          href={resultActionHref(r, qFromUrl)}
                          className="topBtn"
                          onClick={() => {
                            saveConversationContext({
                              query: qFromUrl,
                              module: modFromUrl,
                              source: "search",
                              href: resultActionHref(r, qFromUrl),
                              title: r.title,
                              timestamp: Date.now(),
                            });
                          }}
                          style={{
                            textDecoration: "none",
                            background: r.module === "materials" ? "#7c3aed" : "#0b57d0",
                            fontSize: 12,
                            padding: "7px 11px",
                            minHeight: 34,
                          }}
                        >
                          {r.module === "materials"
                            ? "Send RFQ"
                            : r.module === "services"
                              ? "Find Vendors"
                              : r.module === "rentals"
                                ? "Check Rental"
                                : "Next Step"}
                        </Link>
                      </div>
                    </div>

                    <details
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        background: "#f8fafc",
                        padding: "8px 10px",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 950,
                          color: "#1d4ed8",
                        }}
                      >
                        Why this result?
                      </summary>

                      <div
                        style={{
                          marginTop: 8,
                          display: "grid",
                          gap: 6,
                          fontSize: 12,
                          color: "#475569",
                          lineHeight: 1.6,
                          fontWeight: 750,
                        }}
                      >
                        <div>
                          • Match relevance score:{" "}
                          <b>{r._aiScore || 0}</b>
                        </div>

                        <div>
                          • Marketplace signal:{" "}
                          <b>{r._aiReason || "workflow match"}</b>
                        </div>

                        <div>
                          • Module intelligence:{" "}
                          <b>{moduleLabel(r.module)}</b>
                        </div>

                        <div>
                          • Search workflow matched against procurement,
                          vendor discovery and execution intent.
                        </div>
                      </div>
                    </details>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {workflowCards.map((card) => {
                        const toneStyle = workflowCardToneStyle(card.tone);

                        return (
                          <Link
                            key={`${r.module}:${r.id}:${card.label}`}
                            href={card.href}
                            style={{
                              ...toneStyle,
                              borderRadius: 12,
                              padding: "8px 9px",
                              textDecoration: "none",
                              display: "grid",
                              gap: 4,
                              minHeight: 50,
                            }}
                          >
                            <strong style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>
                              {card.icon} {card.label}
                            </strong>
                            <span style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 800, color: "#475569" }}>
                              {card.text.length > 72 ? `${card.text.slice(0, 72)}…` : card.text}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </CardBody>
              </Card>
              );
            })}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
                position: isCompactSearchLayout ? "static" : "sticky",
                top: isCompactSearchLayout ? "auto" : 84,
                alignSelf: "start",
              }}
            >
              <ProcurementReEngagement />

              <ProcurementMemoryTimeline />

              <ProcurementRecommendationSidebar
                query={qFromUrl}
                module={modFromUrl}
              />
            </div>
          </div>
        </>
      )}
      <div style={{ height: hasQuery ? 96 : 24 }} />
    </Container>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Container>
          <div style={{ paddingTop: 18 }}>
            <SectionSkeleton cards={5} />
          </div>
        </Container>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
