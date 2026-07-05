// app/property/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import ProcurementKnowledgeGraphBlock from "@/app/components/ai/ProcurementKnowledgeGraphBlock";
import { buildProcurementKnowledgeGraph } from "@/lib/seo/procurement-knowledge-graph";
import InvestmentApplyButton from "./InvestmentApplyButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { createMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site";

import {
  buildAiSeoContent,
  buildFaqSchema,
} from "@/lib/seo/ai-search-content";

import { buildRelatedContent } from "@/lib/seo/related-content";
import { buildRelatedListings } from "@/lib/seo/related-listings";

import { buildRecommendations } from "@/lib/ai/recommendation-engine";
import { buildPropertyInvestmentIntel } from "@/lib/property-investment/investment-score";
import { buildPropertyCrossModuleSuggestions } from "@/lib/marketplace-orchestration/property-cross-module";
import MemoryEventTracker from "@/app/components/ai/MemoryEventTracker";
import MemoryLink from "@/app/components/ai/MemoryLink";
import PropertyDiscoveryMemoryTracker from "./PropertyDiscoveryMemoryTracker";
import FinanceAssistanceCta from "@/components/finance/FinanceAssistanceCta";
import NearbyMarketplace from "@/components/geography/NearbyMarketplace";
import { resolveGeoCoordinates } from "@/lib/geography/resolveCoordinates";

type AnyRow = Record<string, any>;

type InvestmentPlanInfo = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  source: "listing" | "project";
};

type InvestmentOpportunityInfo = {
  id: string;
  min_investment: number | null;
  max_investment: number | null;
  expected_holding_months: number | null;
  risk_level: string | null;
  status: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadId(v?: string | null) {
  const s = String(v ?? "").trim();
  return !s || s === "id" || s === "[id]" || s === "<id>" || !UUID_RE.test(s);
}

function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtDate(iso: any) {
  const s = safeText(iso);
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function fmtMoney(v: any) {
  if (v === null || v === undefined || v === "") return "—";

  const n = Number(v);
  if (!Number.isFinite(n)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id || "");

  if (isBadId(id)) {
    return createMetadata({
      title: "Property Not Available",
      description: "The requested property listing is not available on 3bigha.com.",
      path: `/property/${encodeURIComponent(id)}`,
      noIndex: true,
    });
  }

  const supabase = getSupabaseServer();

  const tables = ["property_listings_public", "property_listings"];

  let row: AnyRow | null = null;

  for (const t of tables) {
    const res = await supabase.from(t).select("*").eq("id", id).maybeSingle();

    if (!res.error && res.data) {
      row = res.data;
      break;
    }
  }

  if (!row) {
    return createMetadata({
      title: "Property Not Found",
      description: "This property listing could not be found on 3bigha.com.",
      path: `/property/${encodeURIComponent(id)}`,
      noIndex: true,
    });
  }

  const title = safeText(row.title) || "Property Listing";

  const location = [row.city, row.district, row.state]
    .filter(Boolean)
    .join(", ");

  const description =
    safeText(row.description) ||
    `Explore this property listing${location ? ` in ${location}` : ""} on 3bigha.com. Compare, enquire and connect with the seller, owner, builder or vendor.`;

  return createMetadata({
    title: `${title}${location ? ` in ${location}` : ""}`,

    description:
      description.slice(0, 155) ||
      `Explore ${title}${location ? ` in ${location}` : ""} on 3bigha.com.`,

    path: `/property/${encodeURIComponent(id)}`,

    image:
      safeText(row.cover_image) ||
      safeText(row.image_url) ||
      "/og-image-new.jpg",

    city: safeText(row.city),
    district: safeText(row.district),
    locality: safeText(row.locality),

    category:
      safeText(row.property_type) ||
      safeText(row.category) ||
      "Property",

    type: safeText(row.listing_type),

    publishedTime:
      row.published_at ||
      row.created_at ||
      undefined,

    modifiedTime:
      row.updated_at ||
      undefined,

    keywords: [
      title,

      safeText(row.property_type),
      safeText(row.category),
      safeText(row.listing_type),

      "property listing",
      "real estate",
      "land for sale",
      "house for sale",
      "commercial property",
      "property investment",

      safeText(row.city),
      safeText(row.locality),
      safeText(row.district),

      location,

      `${safeText(row.property_type || "property")} in ${safeText(row.city)}`,
      `${safeText(row.property_type || "property")} in ${safeText(row.locality || row.city)}`,

      "3bigha property",
    ].filter(Boolean),
  });
}

export default async function PropertyPublicDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { mode?: string };
}) {
  const id = decodeURIComponent(params.id || "");

  const activeBuyerMode = ["investor", "family", "budget", "rental"].includes(
    String(searchParams?.mode || "")
  )
    ? String(searchParams?.mode)
    : "investor";

  const buyerModes = [
    { key: "investor", label: "Investor" },
    { key: "family", label: "Family" },
    { key: "budget", label: "Budget" },
    { key: "rental", label: "Rental Income" },
  ];

  if (isBadId(id)) {
    notFound();
  }

  const supabase = getSupabaseServer();

  const tables = ["property_listings_public", "property_listings"];

  let row: AnyRow | null = null;
  let sourceTable: string | null = null;

  for (const t of tables) {
    const res = await supabase.from(t).select("*").eq("id", id).maybeSingle();
    if (!res.error && res.data) {
      row = res.data;
      sourceTable = t;
      break;
    }
  }

  if (!row) {
    notFound();
  }

  const nearbyCoordinates = await resolveGeoCoordinates({
    supabase,
    geo_place_id: row.geo_place_id,
    geo_block_id: row.geo_block_id,
    geo_subdivision_id: row.geo_subdivision_id,
    geo_district_id: row.geo_district_id,
    geo_state_id: row.geo_state_id,
  });

  const titleQuality = safeText(row.title);
  const locationQuality = [row.locality, row.city, row.district, row.state]
    .map(safeText)
    .filter(Boolean)
    .join(" ");

  if (
    titleQuality.length < 6 ||
    (!safeText(row.description) && locationQuality.length < 4)
  ) {
    notFound();
  }

    let resolvedVendorUserId =
    safeText(row.vendor_user_id) ||
    safeText(row.owner_id) ||
    null;

  // Important:
  // If the row came from property_listings_public, that view may not expose vendor_user_id.
  // In that case, do one safe read from the base table only for vendor linkage fields.
  if (!resolvedVendorUserId && sourceTable === "property_listings_public") {
    const vendorRes = await supabase
      .from("property_listings")
      .select("vendor_user_id, owner_id")
      .eq("id", id)
      .maybeSingle();

    if (!vendorRes.error && vendorRes.data) {
      resolvedVendorUserId =
        safeText((vendorRes.data as AnyRow).vendor_user_id) ||
        safeText((vendorRes.data as AnyRow).owner_id) ||
        null;
    }
  }

    let resolvedBuilderProjectId =
    safeText(row.builder_project_id) ||
    null;

  let resolvedInvestmentPlan: InvestmentPlanInfo | null = null;
    let resolvedInvestmentOpportunity: InvestmentOpportunityInfo | null = null;

  // Read safe base listing fields when the public view may not expose them
  if (
    sourceTable === "property_listings_public" &&
    (!resolvedBuilderProjectId || !safeText(row.investment_plan_master_id))
  ) {
    const baseListingRes = await supabase
      .from("property_listings")
      .select("builder_project_id, investment_plan_master_id")
      .eq("id", id)
      .maybeSingle();

    if (!baseListingRes.error && baseListingRes.data) {
      resolvedBuilderProjectId =
        safeText((baseListingRes.data as AnyRow).builder_project_id) ||
        resolvedBuilderProjectId;

      const listingPlanId = safeText((baseListingRes.data as AnyRow).investment_plan_master_id);
      if (listingPlanId) {
        const planRes = await supabase
          .from("investment_plan_master")
          .select("id,title,category,status")
          .eq("id", listingPlanId)
          .maybeSingle();

        if (!planRes.error && planRes.data) {
          resolvedInvestmentPlan = {
            id: String((planRes.data as AnyRow).id),
            title: (planRes.data as AnyRow).title ?? null,
            category: (planRes.data as AnyRow).category ?? null,
            status: (planRes.data as AnyRow).status ?? null,
            source: "listing",
          };
        }
      }
    }
  }

  // If the current row itself already has a direct plan, prefer it
  if (!resolvedInvestmentPlan) {
    const rowPlanId = safeText(row.investment_plan_master_id);
    if (rowPlanId) {
      const planRes = await supabase
        .from("investment_plan_master")
        .select("id,title,category,status")
        .eq("id", rowPlanId)
        .maybeSingle();

      if (!planRes.error && planRes.data) {
        resolvedInvestmentPlan = {
          id: String((planRes.data as AnyRow).id),
          title: (planRes.data as AnyRow).title ?? null,
          category: (planRes.data as AnyRow).category ?? null,
          status: (planRes.data as AnyRow).status ?? null,
          source: "listing",
        };
      }
    }
  }

  let hasInvestmentOpportunity = false;

  const oppCheckRes = await supabase
    .from("investment_opportunities")
    .select(`
      id,
      min_investment,
      max_investment,
      expected_holding_months,
      risk_level,
      status
    `)
    .eq("source_type", "property")
    .eq("source_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!oppCheckRes.error && oppCheckRes.data?.length) {
    const opp = oppCheckRes.data[0] as AnyRow;

    hasInvestmentOpportunity = true;
    resolvedInvestmentOpportunity = {
      id: String(opp.id),
      min_investment: opp.min_investment ?? null,
      max_investment: opp.max_investment ?? null,
      expected_holding_months: opp.expected_holding_months ?? null,
      risk_level: opp.risk_level ?? null,
      status: opp.status ?? null,
    };
  }

  // Otherwise fall back to project-level default plan
  if (!resolvedInvestmentPlan && resolvedBuilderProjectId) {
    const projectPlanRes = await supabase
      .from("builder_projects")
      .select(`
        investment_plan_master_id,
        investment_plan_master:investment_plan_master_id (
          id,
          title,
          category,
          status
        )
      `)
      .eq("id", resolvedBuilderProjectId)
      .maybeSingle();

    if (!projectPlanRes.error && projectPlanRes.data) {
      const projectPlan = (projectPlanRes.data as AnyRow).investment_plan_master as AnyRow | null;
      if (projectPlan?.id) {
        resolvedInvestmentPlan = {
          id: String(projectPlan.id),
          title: projectPlan.title ?? null,
          category: projectPlan.category ?? null,
          status: projectPlan.status ?? null,
          source: "project",
        };
      }
    }
  }

  const title = safeText(row.title) || "Property";

  const location = [row.city, row.district, row.state]
    .filter(Boolean)
    .join(", ");

  const investmentMin =
    resolvedInvestmentOpportunity?.min_investment ?? null;

  const investmentMax =
    resolvedInvestmentOpportunity?.max_investment ?? null;

  const investmentHoldingMonths =
    resolvedInvestmentOpportunity?.expected_holding_months ?? null;

  const investmentRiskLevel =
    resolvedInvestmentOpportunity?.risk_level ?? null;

  const canonicalUrl = `${siteConfig.url}/property/${encodeURIComponent(id)}`;

  const aiSeo = buildAiSeoContent({
  module: "property",

  title,

  category:
    safeText(row.property_type) ||
    safeText(row.category),

  type: safeText(row.listing_type),

  city: safeText(row.city),
  district: safeText(row.district),
  locality: safeText(row.locality),

  price:
    row.price ||
    row.expected_price ||
    null,

  listingType:
    safeText(row.listing_type),
});

const faqSchema = buildFaqSchema(aiSeo.faq);

const relatedContent = buildRelatedContent({
  module: "property",

  title,

  category:
    safeText(row.property_type) ||
    safeText(row.category) ||
    "Property",

  type: safeText(row.listing_type),

  city: safeText(row.city),
  district: safeText(row.district),
  locality: safeText(row.locality),
});

const relatedRes = await supabase
  .from("property_listings_public")
  .select(
    "id,title,city,district,locality,property_type,category,listing_type,price,expected_price,updated_at,created_at"
  )
  .neq("id", id)
  .or(
    [
      `city.eq.${safeText(row.city)}`,
      `district.eq.${safeText(row.district)}`,
      `locality.eq.${safeText(row.locality)}`,
      `property_type.eq.${safeText(row.property_type)}`,
      `category.eq.${safeText(row.category)}`,
    ]
      .filter((x) => !x.endsWith(".eq."))
      .join(",")
  )
  .limit(12);

const relatedListings = buildRelatedListings({
  module: "property",
  currentId: id,
  rows: relatedRes.data || [],
  city: safeText(row.city),
  district: safeText(row.district),
  locality: safeText(row.locality),
  category:
    safeText(row.property_type) ||
    safeText(row.category) ||
    "Property",
});

const investmentIntel = buildPropertyInvestmentIntel({
  price:
    row.price ||
    row.expected_price ||
    null,
  propertyType:
    safeText(row.property_type) ||
    safeText(row.category),
  category:
    safeText(row.category),
  listingType:
    safeText(row.listing_type),
  city:
    safeText(row.city),
  district:
    safeText(row.district),
  locality:
    safeText(row.locality),
});

const crossModuleSuggestions = buildPropertyCrossModuleSuggestions({
  title,
  propertyType:
    safeText(row.property_type) ||
    safeText(row.category),
  category:
    safeText(row.category),
  city:
    safeText(row.city),
  district:
    safeText(row.district),
  locality:
    safeText(row.locality),
});

const aiWhyPropertyReasons = [
  `${investmentIntel.recommendationLabel}: this listing is currently classified as ${investmentIntel.bestForLabel.toLowerCase()}.`,
  `${investmentIntel.hotDealLabel}: bargain opportunity is ${investmentIntel.bargainOpportunityIndex}/99 with fair value signal around ₹${investmentIntel.fairValueEstimate.toLocaleString("en-IN")}.`,
  `${investmentIntel.marketPulseLabel}: market heat is ${investmentIntel.areaHeatIndex}/99 and timing score is ${investmentIntel.marketTimingScore}/99.`,
  `${investmentIntel.hyperlocalProfileLabel}: hyperlocal desirability is ${investmentIntel.hyperlocalDesirabilityIndex}/99 with livability score ${investmentIntel.livabilityIndex}/99.`,
];

const scoreMeter = (
  label: string,
  value: number,
  max = 99,
  caption?: string
) => {
  const percent = Math.max(4, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 11,
          fontWeight: 900,
          opacity: 0.82,
        }}
      >
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 12,
          background: "rgba(255,255,255,0.16)",
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 12,
            background:
              percent >= 78
                ? "linear-gradient(90deg,#22c55e,#a3e635)"
                : percent >= 58
                  ? "linear-gradient(90deg,#38bdf8,#2563eb)"
                  : "linear-gradient(90deg,#f59e0b,#ef4444)",
          }}
        />
      </div>

      {caption ? (
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 7 }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
};

const aiRecommendations = buildRecommendations({
  module: "property",

  currentId: id,

  rows: relatedRes.data || [],

  city: safeText(row.city),
  district: safeText(row.district),
  locality: safeText(row.locality),

  category:
    safeText(row.property_type) ||
    safeText(row.category) ||
    "Property",

  type: safeText(row.listing_type),

  minPrice:
    Number(row.price || row.expected_price || 0) * 0.7,

  maxPrice:
    Number(row.price || row.expected_price || 0) * 1.3,

  userIntent:
    safeText(row.property_type) ||
    "property discovery",
});

const aiSimilarMatches = (relatedRes.data || [])
  .map((item: AnyRow) => {
    const intel = buildPropertyInvestmentIntel({
      price: item.price || item.expected_price || null,
      propertyType:
        safeText(item.property_type) ||
        safeText(item.category),
      category: safeText(item.category),
      listingType: safeText(item.listing_type),
      city: safeText(item.city),
      district: safeText(item.district),
      locality: safeText(item.locality),
    });

    const modeScore =
      activeBuyerMode === "family"
        ? intel.familyMatchScore
        : activeBuyerMode === "budget"
          ? intel.budgetFitScore
          : activeBuyerMode === "rental"
            ? intel.rentalIncomeMatchScore
            : intel.investorMatchScore;

    const modeReason =
      activeBuyerMode === "family"
        ? `Family fit ${intel.familyMatchScore}/99 with livability ${intel.livabilityIndex}/99`
        : activeBuyerMode === "budget"
          ? `Budget fit ${intel.budgetFitScore}/99 with bargain ${intel.bargainOpportunityIndex}/99`
          : activeBuyerMode === "rental"
            ? `Rental income fit ${intel.rentalIncomeMatchScore}/95 with absorption ${intel.rentalAbsorptionScore}/95`
            : `Investor fit ${intel.investorMatchScore}/99 with liquidity ${intel.resaleLiquidityScore}/99`;

    return {
      id: String(item.id),
      href: `/property/${encodeURIComponent(String(item.id))}`,
      title: safeText(item.title) || "Property Opportunity",
      location: [item.locality, item.city, item.district].filter(Boolean).join(", "),
      priceText:
        item.price || item.expected_price
          ? `₹${Number(item.price || item.expected_price).toLocaleString("en-IN")}`
          : "Price on request",
      score: modeScore,
      reason: modeReason,
      label: intel.recommendationLabel,
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 4);

  const propertyDetailSchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title,
    description:
      safeText(row.description) ||
      `Property listing${location ? ` in ${location}` : ""} on 3bigha.com.`,
    url: canonicalUrl,
    dateModified: row.updated_at || row.published_at || row.created_at || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: safeText(row.city) || undefined,
      addressRegion: safeText(row.state) || undefined,
      addressCountry: "IN",
    },
    offers:
      row.price || row.expected_price
        ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price: Number(row.price || row.expected_price || 0),
            availability: "https://schema.org/InStock",
            url: canonicalUrl,
          }
        : undefined,
  };

  {relatedListings.length ? (
  <div
    style={{
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #e5e7eb",
    }}
  >
    <div
      style={{
        fontWeight: 900,
        fontSize: 18,
        marginBottom: 14,
      }}
    >
      Similar Properties Nearby
      {aiRecommendations.length ? (
  <div
    style={{
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      background: "#fff",
      border: "1px solid #e5e7eb",
    }}
  >
    <div
      style={{
        fontWeight: 900,
        fontSize: 18,
        marginBottom: 14,
      }}
    >
      AI Recommended Opportunities
    </div>

    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      {aiRecommendations.map((item) => (
        <MemoryLink
            key={item.id}
            href={item.href}
            module="property"
            entityId={item.id}
            entityTitle={item.title}
            category={item.category}
            type={item.type}
            city={item.city}
            district={item.district}
            locality={item.locality}
            source="property_ai_recommended_opportunities"
            score={item.score}
            style={{
              display: "block",
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "inherit",
            }}
          >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontWeight: 900,
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#2563eb",
              }}
            >
              AI Score {item.score}
            </div>
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              opacity: 0.8,
              lineHeight: 1.5,
            }}
          >
            {item.reason}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            {[item.locality, item.city, item.district]
              .filter(Boolean)
              .join(", ")}
          </div>
        </MemoryLink>
      ))}
    </div>
  </div>
) : null}
    </div>

    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      {relatedListings.map((item) => (
        <MemoryLink
            key={item.id}
            href={item.href}
            module="property"
            entityId={item.id}
            entityTitle={item.title}
            source="property_similar_properties_nearby"
            style={{
              display: "block",
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "inherit",
            }}
          >
          <div
            style={{
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              lineHeight: 1.5,
            }}
          >
            {[item.location, item.priceText].filter(Boolean).join(" • ")}
          </div>
        </MemoryLink>
      ))}
    </div>
  </div>
) : null}

  return (
    <Container>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: siteConfig.url },
            { name: "Property", url: `${siteConfig.url}/property` },
            { name: title, url: canonicalUrl },
          ]),

          propertyDetailSchema,

          faqSchema,
        ]}
      />
      <MemoryEventTracker
        eventType="listing_view"
        module="property"
        entityId={id}
        entityTitle={title}
        category={
          safeText(row.property_type) ||
          safeText(row.category) ||
          "Property"
        }
        type={safeText(row.listing_type)}
        city={safeText(row.city)}
        district={safeText(row.district)}
        locality={safeText(row.locality)}
        metadata={{
          source: "property_detail_page",
          price:
            row.price ||
            row.expected_price ||
            null,
        }}
      />
      <PropertyDiscoveryMemoryTracker
        id={id}
        title={title}
        city={safeText(row.city)}
        district={safeText(row.district)}
        locality={safeText(row.locality)}
        type={safeText(row.property_type) || safeText(row.listing_type)}
        category={safeText(row.category)}
        price={Number(row.price || row.expected_price || 0) || null}
      />

      <SectionHeader title={title} subtitle="Property details" />

      <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <Link href="/property">← Back</Link>
        {row.status ? <Badge>{row.status}</Badge> : null}
        {row.updated_at ? <Badge>Updated: {fmtDate(row.updated_at)}</Badge> : null}
        {location ? <Badge>{location}</Badge> : null}
      </div>

      <div className="propGrid">

        <Card>
          <CardBody>
            {row.description ? (
              <div style={{ whiteSpace: "pre-wrap" }}>
                {row.description}
              </div>
            ) : (
              <div style={{ opacity: 0.7 }}>
                No description provided.
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                padding: 12,
                borderRadius: 12,
                background: "#ffffff",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                    AI Property Investment Score
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 4 }}>
                    {investmentIntel.investmentScore}/99
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.82 }}>
                    {investmentIntel.rating} investment profile
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                    EMI Stress
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4 }}>
                    {investmentIntel.emiStress}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.82 }}>
                    Safer salary ₹{investmentIntel.safeSalaryRequired.toLocaleString("en-IN")}/mo
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                  marginTop: 16,
                }}
                className="investmentMiniGrid"
              >
                {scoreMeter("AI Match", investmentIntel.overallRecommendationScore, 99, investmentIntel.recommendationLabel)}
                {scoreMeter("Investment", investmentIntel.investmentScore, 99, investmentIntel.rating)}
                {scoreMeter("Market Heat", investmentIntel.areaHeatIndex, 99, investmentIntel.marketPulseLabel)}
                {scoreMeter("Bargain", investmentIntel.bargainOpportunityIndex, 99, investmentIntel.hotDealLabel)}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12,minmax(0,1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Appreciation</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.appreciationPotential}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Rent Yield</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.rentalYieldPercent}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Rent Est.</div>
                  <div style={{ fontWeight: 900 }}>₹{investmentIntel.estimatedMonthlyRent.toLocaleString("en-IN")}/mo</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Rent vs EMI</div>
                  <div style={{ fontWeight: 900 }}>
                    {investmentIntel.betterThanRent ? "Positive" : "Check EMI"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Locality Growth</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.investorConfidenceIndex}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Growth Type</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.localityGrowthRating}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Price Signal</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.hotDealLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Bargain Index</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.bargainOpportunityIndex}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Liquidity</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.resaleLiquidityScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Asset Type</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.wealthCompounderLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Market Pulse</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.marketPulseLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Timing</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.marketTimingScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Hyperlocal</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.hyperlocalDesirabilityIndex}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Locality Type</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.hyperlocalProfileLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>AI Match</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.overallRecommendationScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Best For</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.bestForLabel}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 8 }}>
                Why this property?
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {aiWhyPropertyReasons.map((reason) => (
                  <div
                    key={reason}
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "#334155",
                      padding: 10,
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 950 }}>
                  AI Similar Property Matches
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {buyerModes.map((mode) => (
                    <Link
                      key={mode.key}
                      href={`/property/${encodeURIComponent(id)}?mode=${mode.key}`}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 900,
                        textDecoration: "none",
                        color:
                          activeBuyerMode === mode.key
                            ? "#ffffff"
                            : "#0f172a",
                        background:
                          activeBuyerMode === mode.key
                            ? "linear-gradient(90deg,#2563eb,#16a34a)"
                            : "#f8fafc",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {mode.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                {aiSimilarMatches.map((item) => (
                  <MemoryLink
                    key={item.id}
                    href={item.href}
                    module="property"
                    entityId={item.id}
                    entityTitle={item.title}
                    source={`property_ai_similar_${activeBuyerMode}`}
                    score={item.score}
                    style={{
                      display: "block",
                      padding: 12,
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      <span>{item.label}</span>
                      <span>{item.score}/99</span>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        opacity: 0.75,
                        lineHeight: 1.45,
                      }}
                    >
                      {[item.location, item.priceText].filter(Boolean).join(" • ")}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#334155",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.reason}
                    </div>
                  </MemoryLink>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Property Recommendation & Matchmaking
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Overall Match</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.overallRecommendationScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Investor Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.investorMatchScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>End-user Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.endUserMatchScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Budget Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.budgetFitScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Family Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.familyMatchScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Rental Income Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.rentalIncomeMatchScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Lifestyle Fit</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.lifestyleMatchScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Recommendation</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.recommendationLabel}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Hyperlocal Property Intelligence
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>School Access</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.schoolAccessibilityScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Hospital Access</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.hospitalAccessibilityScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Market Access</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.marketConvenienceIndex}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Transport</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.transportConnectivityScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Livability</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.livabilityIndex}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Family Settlement</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.familySettlementScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Student Rental</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.studentRentalSuitability}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Smart Growth</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.smartCityGrowthProbability}/95</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Property Market Pulse
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Area Heat</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.areaHeatIndex}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Demand Imbalance</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.supplyDemandImbalance}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Buyer Momentum</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.buyerActivityMomentum}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Seller Pressure</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.sellerCompetitionPressure}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Market Timing</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.marketTimingScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Inventory Saturation</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.inventorySaturationScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Price Momentum</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.priceTrendMomentum}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Negotiation Leverage</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.negotiationLeverageIndex}/99</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Liquidity & Buyer Demand Signals
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Buyer Demand</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.buyerDemandIntensity}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Resale Liquidity</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.resaleLiquidityScore}/99</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Exit Probability</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.investorExitProbability}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Rental Absorption</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.rentalAbsorptionScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Family Demand</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.familyFriendlyScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Commercial Activity</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.commercialActivityScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Growth Velocity</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.appreciationVelocityScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Holding Strength</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.longTermHoldingStrength}/99</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Price Undervaluation Signals
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Fair Value</div>
                  <div style={{ fontWeight: 900 }}>
                    ₹{investmentIntel.fairValueEstimate.toLocaleString("en-IN")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Price Gap</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.priceGapPercent}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Fast Selling</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.fastSellingProbability}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Confidence</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.priceConfidenceScore}/96</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                AI Locality Growth Signals
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 10,
                }}
                className="investmentMiniGrid"
              >
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Highway Access</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.highwayScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Railway Access</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.railwayScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Demand Hotspot</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.demandHotspotScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Urban Expansion</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.urbanExpansionScore}/95</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Infrastructure</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.infrastructureGrowthScore}/100</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>Emerging Area</div>
                  <div style={{ fontWeight: 900 }}>{investmentIntel.emergingAreaScore}/95</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  marginBottom: 10,
                }}
              >
                AI Locality & Investment Insight
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                {aiSeo.summary}
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                {aiSeo.investmentInsight}
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                }}
              >
                {aiSeo.demandInsight}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  marginBottom: 14,
                }}
              >
                Frequently Asked Questions
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                {aiSeo.faq.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      paddingBottom: 12,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                    >
                      {item.question}
                    </div>

                    <div
                      style={{
                        opacity: 0.85,
                        lineHeight: 1.6,
                      }}
                    >
                      {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {(resolvedInvestmentPlan || hasInvestmentOpportunity) ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 8 }}>
                  Investment Opportunity
                </div>

                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                  {safeText(resolvedInvestmentPlan?.title) || "Investment Plan Available"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {resolvedInvestmentPlan?.category ? <Badge>{resolvedInvestmentPlan.category}</Badge> : null}
                  {resolvedInvestmentPlan?.status ? <Badge>{resolvedInvestmentPlan.status}</Badge> : null}
                  {resolvedInvestmentPlan?.source ? (
                    <Badge>
                      {resolvedInvestmentPlan.source === "listing"
                        ? "Unit-specific plan"
                        : "Project default plan"}
                    </Badge>
                  ) : (
                    <Badge>Property-linked opportunity</Badge>
                  )}
                  {resolvedInvestmentOpportunity?.risk_level ? (
                    <Badge>{resolvedInvestmentOpportunity.risk_level}</Badge>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Min Investment
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentMin !== null
                        ? `₹ ${fmtMoney(investmentMin)}`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Max Investment
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentMax !== null
                        ? `₹ ${fmtMoney(investmentMax)}`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Expected Holding
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentHoldingMonths !== null
                        ? `${investmentHoldingMonths} months`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Risk Level
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {safeText(investmentRiskLevel) || "—"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 12,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 18,
                      marginBottom: 14,
                    }}
                  >
                    Related Property Discovery
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {relatedContent.map((item, index) => (
                      <Link
                        key={index}
                        href={item.href}
                        style={{
                          display: "block",
                          padding: 14,
                          borderRadius: 12,
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            opacity: 0.75,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.description}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 13, opacity: 0.82 }}>
                  {resolvedInvestmentOpportunity?.id
                    ? "This property is linked with an investment opportunity and may be available for investor participation."
                    : "This property is showing a project-level investment plan. Invest Now will appear after a property-level investment opportunity is created for this listing."}
                </div>
              </div>
            ) : null}

            {nearbyCoordinates ? (
              <NearbyMarketplace
                latitude={nearbyCoordinates.latitude}
                longitude={nearbyCoordinates.longitude}
                radiusKm={25}
                limit={5}
                title="Around this Property"
              />
            ) : null}

            <div style={{ fontWeight: 950, marginBottom: 8, marginTop: 18 }}>
              Send Enquiry
            </div>

            {!resolvedVendorUserId && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Vendor account not linked to this listing.
              </div>
            )}

            <SendEnquiryButton
              module="property"
              refId={String(row.id)}
              title={title}
              priceText={row.price ? `₹ ${row.price}` : undefined}
              vendorUserId={resolvedVendorUserId}
              nextUrl={`/property/${encodeURIComponent(id)}`}
            />

            <div style={{ marginTop: 14 }}>
              <FinanceAssistanceCta
                title="Need loan help for this property?"
                description="Check EMI, loan eligibility, property loan assistance and verified banker support before sending enquiry."
                budget={row.price || row.expected_price || null}
                source="property-detail"
              />
            </div>

            <Link
              href={`/vendor/discovery?q=${encodeURIComponent(
                title || "property dealer"
              )}`}
              className="topBtn topBtnGhost"
              style={{ textDecoration: "none", marginTop: 10 }}
            >
              AI Recommended Vendors →
            </Link>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ fontWeight: 950, color: "#1e3a8a" }}>
                You may also need
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "#475569",
                  fontWeight: 800,
                }}
              >
                Smart next steps from this property view.
              </div>

              <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                {crossModuleSuggestions.slice(0, 5).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 11,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 20 }}>{item.icon}</div>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 950,
                            color: "#2563eb",
                            marginBottom: 3,
                          }}
                        >
                          {item.badge}
                        </div>
                        <div style={{ fontWeight: 950, fontSize: 13 }}>
                          {item.title}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.45,
                          }}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <ProcurementKnowledgeGraphBlock
              graph={buildProcurementKnowledgeGraph({
                title,
                module: "property",
                category: row.property_type || row.category || "Property",
                city: row.city || "Cooch Behar",
                district: row.district || "Cooch Behar",
                locality: row.locality || "Khagrabari",
              })}
            />

            {resolvedInvestmentOpportunity?.id ? (
              <div style={{ marginTop: 10 }}>
                <InvestmentApplyButton
                  listingId={String(row.id)}
                  opportunityId={resolvedInvestmentOpportunity.id}
                  title={title}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

      </div>

      <style>{`
        .propGrid{
          display:grid;
          grid-template-columns:2fr 1fr;
          gap:14px;
        }
        @media (max-width:980px){
          .propGrid{grid-template-columns:1fr}
          .investmentMiniGrid{grid-template-columns:1fr 1fr !important}
        }
      `}</style>
    </Container>
  );
}