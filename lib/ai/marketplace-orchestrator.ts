import {
  buildMarketplaceDiscovery,
  filterVendorsForDiscovery,
} from "@/lib/seo/marketplace-discovery-engine";
import { getMarketplaceDiscoveryVendors } from "@/lib/seo/marketplace-discovery-data";
import { buildProcurementKnowledgeGraph } from "@/lib/seo/procurement-knowledge-graph";export type MarketplaceModule =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "investment"
  | "marketplace"
  | string;

export type MarketplaceAiContext = {
  module?: MarketplaceModule;
  category?: string | null;
  city?: string | null;
  locality?: string | null;
  district?: string | null;
  pincode?: string | null;
  urgency?: string | null;
  budget?: number | string | null;
  buyerIntent?: string | null;
  rfqId?: string | null;
  quoteId?: string | null;
  vendorId?: string | null;
  vendors?: any[];
  items?: any[];
  priceData?: any;
  quote?: any;
  rfq?: any;
  messages?: any[];
  meta?: any;
};

export type MarketplaceAiResult = {
  ok: boolean;
  source: "orchestrator";
  generatedAt: string;
  context: {
    module: string;
    category: string | null;
    city: string | null;
    rfqId: string | null;
    quoteId: string | null;
    vendorId: string | null;
  };
  intelligence: {
    smartDecision?: any;
    pricePrediction?: any;
    rfqIntelligence?: any;
    quoteRisk?: any;
    vendorDiscovery?: any;
    procurementGraph?: any;
  };
  summary: {
    decisionLabel: string;
    riskLevel: "low" | "medium" | "high" | "unknown";
    confidence: number;
    recommendedAction: string;
  };
};

function n(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function s(v: unknown, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function postAi(path: string, payload: any) {
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      return {
        ok: false,
        source: "orchestrator-fallback",
        error: data?.error || `Failed: ${path}`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      ok: false,
      source: "orchestrator-fallback",
      error: error?.message || `Failed: ${path}`,
    };
  }
}

export function buildRfqPayload(ctx: MarketplaceAiContext) {
  const rfq = ctx.rfq || {};

  return {
    module: ctx.module || rfq.module || "marketplace",
    category: ctx.category || rfq.category || rfq.subject_type || null,
    title: rfq.title || ctx.buyerIntent || null,
    description: rfq.description || ctx.buyerIntent || null,
    city: ctx.city || rfq.city || null,
    locality: ctx.locality || rfq.locality || null,
    district: ctx.district || rfq.district || null,
    pincode: ctx.pincode || rfq.pincode || null,
    quantity: rfq.quantity || ctx.meta?.quantity || null,
    budget: ctx.budget || ctx.meta?.budget || null,
    urgency: ctx.urgency || ctx.meta?.urgency || null,
    items: ctx.items || [],
    meta: ctx.meta || {},
  };
}

export function buildQuoteRiskPayload(ctx: MarketplaceAiContext) {
  const quote = ctx.quote || {};

  return {
    module: ctx.module || "marketplace",
    category: ctx.category || null,
    vendorId: ctx.vendorId || quote.vendor_id || null,
    quoteId: ctx.quoteId || quote.quote_id || quote.id || null,
    quotePrice: quote.grand_total ?? quote.price ?? quote.quoted_price ?? null,
    grand_total: quote.grand_total ?? null,
    subtotal: quote.subtotal ?? null,
    gst_amount: quote.gst_amount ?? null,
    marketAverage:
      ctx.priceData?.averagePrice ??
      ctx.priceData?.avgPrice ??
      ctx.priceData?.marketPrice ??
      null,
    trustScore: quote.trust_score ?? null,
    aiScore: quote.ai_score ?? null,
    vendorRisk: quote.risk_score ?? null,
    deliveryDays: quote.delivery_days ?? null,
    validTill: quote.valid_till ?? null,
  };
}

export function buildPricePredictionPayload(ctx: MarketplaceAiContext) {
  return {
    module: ctx.module || "marketplace",
    category: ctx.category || null,
    city: ctx.city || null,
    locality: ctx.locality || null,
    currentPrice:
      ctx.priceData?.currentPrice ??
      ctx.priceData?.latestPrice ??
      ctx.priceData?.averagePrice ??
      ctx.priceData?.marketPrice ??
      null,
    previousPrice:
      ctx.priceData?.previousPrice ??
      ctx.priceData?.oldPrice ??
      ctx.priceData?.lastWeekPrice ??
      null,
    demandScore: ctx.priceData?.demandScore ?? null,
    supplyScore: ctx.priceData?.supplyScore ?? null,
    rfqDemand: ctx.priceData?.rfqDemand ?? null,
  };
}

export function buildSmartDecisionPayload(ctx: MarketplaceAiContext) {
  return {
    module: ctx.module || "marketplace",
    category: ctx.category || null,
    city: ctx.city || null,
    locality: ctx.locality || null,
    district: ctx.district || null,
    pincode: ctx.pincode || null,
    urgency: ctx.urgency || null,
    budget: ctx.budget || null,
    buyerIntent: ctx.buyerIntent || ctx.rfq?.description || ctx.rfq?.title || null,
    rfqId: ctx.rfqId || null,
    vendors: ctx.vendors || [],
    items: ctx.items || [],
    priceData: ctx.priceData || {},
  };
}

function summarize(intelligence: MarketplaceAiResult["intelligence"]) {
  const risk =
    intelligence.quoteRisk?.riskLevel ||
    intelligence.smartDecision?.riskLevel ||
    "unknown";

  const confidence = Math.round(
    Math.max(
      n(intelligence.smartDecision?.confidence, 0),
      n(intelligence.pricePrediction?.confidence, 0),
      n(intelligence.rfqIntelligence?.rfqHealthScore, 0),
      n(intelligence.quoteRisk?.confidence, 0)
    )
  );

  const recommendedAction =
    s(intelligence.smartDecision?.recommendedAction) ||
    s(intelligence.quoteRisk?.recommendedAction) ||
    s(intelligence.rfqIntelligence?.recommendedAction) ||
    s(intelligence.pricePrediction?.recommendation) ||
    "Review available AI signals before making a final marketplace decision.";

  const decisionLabel =
    s(intelligence.smartDecision?.bestVendor?.business_name) ||
    s(intelligence.smartDecision?.bestVendor?.vendor_business_name) ||
    s(intelligence.smartDecision?.bestVendor?.name) ||
    s(intelligence.pricePrediction?.prediction) ||
    "Marketplace AI decision ready";

  return {
    decisionLabel,
    riskLevel: risk as "low" | "medium" | "high" | "unknown",
    confidence,
    recommendedAction,
  };
}

export async function runMarketplaceAiOrchestrator(
  ctx: MarketplaceAiContext,
  options?: {
    smartDecision?: boolean;
    pricePrediction?: boolean;
    rfqIntelligence?: boolean;
    quoteRisk?: boolean;
    vendorDiscovery?: boolean;
    procurementGraph?: boolean;
  }
): Promise<MarketplaceAiResult> {
  const shouldRun = {
    smartDecision: options?.smartDecision ?? true,
    pricePrediction: options?.pricePrediction ?? Boolean(ctx.priceData),
    rfqIntelligence: options?.rfqIntelligence ?? Boolean(ctx.rfq || ctx.rfqId),
    quoteRisk: options?.quoteRisk ?? Boolean(ctx.quote || ctx.quoteId),
    vendorDiscovery: options?.vendorDiscovery ?? true,
    procurementGraph: options?.procurementGraph ?? true,
  };

  const [smartDecision, pricePrediction, rfqIntelligence, quoteRisk] =
    await Promise.all([
      shouldRun.smartDecision
        ? postAi("/api/ai/smart-decision", buildSmartDecisionPayload(ctx))
        : undefined,
      shouldRun.pricePrediction
        ? postAi("/api/ai/price-prediction", buildPricePredictionPayload(ctx))
        : undefined,
      shouldRun.rfqIntelligence
        ? postAi("/api/ai/rfq-intelligence", buildRfqPayload(ctx))
        : undefined,
      shouldRun.quoteRisk
        ? postAi("/api/ai/quote-risk-analysis", buildQuoteRiskPayload(ctx))
        : undefined,
    ]);

  const discoveryVendors = shouldRun.vendorDiscovery
    ? await getMarketplaceDiscoveryVendors()
    : [];

  const discoveryQuery =
    ctx.buyerIntent ||
    ctx.rfq?.title ||
    ctx.rfq?.description ||
    ctx.category ||
    ctx.module ||
    "marketplace vendors";

  const filteredDiscoveryVendors = shouldRun.vendorDiscovery
    ? filterVendorsForDiscovery(discoveryVendors, discoveryQuery)
    : [];

  const vendorDiscovery = shouldRun.vendorDiscovery
    ? buildMarketplaceDiscovery({
        query: String(discoveryQuery),
        city: ctx.city || null,
        district: ctx.district || null,
        locality: ctx.locality || null,
        category: ctx.category || null,
        vendors:
          filteredDiscoveryVendors.length > 0
            ? filteredDiscoveryVendors
            : discoveryVendors,
      })
    : undefined;

  const procurementGraph = shouldRun.procurementGraph
    ? buildProcurementKnowledgeGraph({
        title: String(discoveryQuery),
        module: String(ctx.module || "marketplace"),
        category: ctx.category || null,
        city: ctx.city || null,
        district: ctx.district || null,
        locality: ctx.locality || null,
      })
    : undefined;

  const intelligence = {
    smartDecision,
    pricePrediction,
    rfqIntelligence,
    quoteRisk,
    vendorDiscovery,
    procurementGraph,
  };

  return {
    ok: true,
    source: "orchestrator",
    generatedAt: new Date().toISOString(),
    context: {
      module: String(ctx.module || "marketplace"),
      category: ctx.category || null,
      city: ctx.city || null,
      rfqId: ctx.rfqId || null,
      quoteId: ctx.quoteId || null,
      vendorId: ctx.vendorId || null,
    },
    intelligence,
    summary: summarize(intelligence),
  };
}