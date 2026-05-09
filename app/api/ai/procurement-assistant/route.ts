import { NextResponse } from "next/server";
import {
  runMarketplaceAiOrchestrator,
  type MarketplaceAiContext,
} from "@/lib/ai/marketplace-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildAssistantAnswer(result: any) {
  const intelligence = result?.intelligence || {};

  const vendorDiscovery = intelligence.vendorDiscovery;
  const procurementGraph = intelligence.procurementGraph;
  const smartDecision = intelligence.smartDecision;
  const pricePrediction = intelligence.pricePrediction;
  const rfqIntelligence = intelligence.rfqIntelligence;

  return {
    summary:
      vendorDiscovery?.summary ||
      procurementGraph?.summary ||
      "AI procurement assistant prepared marketplace guidance.",
    recommendedVendors:
      vendorDiscovery?.recommendedVendors?.slice?.(0, 5) || [],
    procurementGraph,
    smartDecision,
    pricePrediction,
    rfqIntelligence,
    nextActions: [
      "Compare recommended vendors",
      "Create RFQ with clear quantity, location and timeline",
      "Check price trend before negotiation",
      "Prefer verified vendors with strong marketplace signals",
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const context: MarketplaceAiContext = {
      module: body?.module || "marketplace",
      category: body?.category || null,
      buyerIntent: body?.query || body?.buyerIntent || body?.requirement || null,
      city: body?.city || null,
      district: body?.district || null,
      locality: body?.locality || null,
      rfq: body?.rfq || null,
      priceData: body?.priceData || null,
      quote: body?.quote || null,
    } as MarketplaceAiContext;

    const orchestrator = await runMarketplaceAiOrchestrator(context, {
      smartDecision: true,
      pricePrediction: Boolean(body?.priceData),
      rfqIntelligence: Boolean(body?.rfq),
      quoteRisk: Boolean(body?.quote),
      vendorDiscovery: true,
      procurementGraph: true,
    });

    return NextResponse.json({
      ok: true,
      source: "ai-procurement-assistant",
      context,
      orchestrator,
      assistant: buildAssistantAnswer(orchestrator),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "ai-procurement-assistant",
        error: error?.message || "AI procurement assistant failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const context: MarketplaceAiContext = {
      module: url.searchParams.get("module") || "marketplace",
      category: url.searchParams.get("category"),
      buyerIntent:
        url.searchParams.get("q") ||
        url.searchParams.get("query") ||
        url.searchParams.get("requirement"),
      city: url.searchParams.get("city"),
      district: url.searchParams.get("district"),
      locality: url.searchParams.get("locality"),
    } as MarketplaceAiContext;

    const orchestrator = await runMarketplaceAiOrchestrator(context, {
      smartDecision: true,
      pricePrediction: false,
      rfqIntelligence: false,
      quoteRisk: false,
      vendorDiscovery: true,
      procurementGraph: true,
    });

    return NextResponse.json({
      ok: true,
      source: "ai-procurement-assistant",
      method: "GET",
      context,
      orchestrator,
      assistant: buildAssistantAnswer(orchestrator),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "ai-procurement-assistant",
        error: error?.message || "AI procurement assistant failed.",
      },
      { status: 500 }
    );
  }
}