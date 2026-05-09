import { NextResponse } from "next/server";
import {
  runMarketplaceAiOrchestrator,
  type MarketplaceAiContext,
} from "@/lib/ai/marketplace-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const context: MarketplaceAiContext = body?.context || body || {};
    const options = body?.options || {};

    const result = await runMarketplaceAiOrchestrator(context, {
      smartDecision: options.smartDecision,
      pricePrediction: options.pricePrediction,
      rfqIntelligence: options.rfqIntelligence,
      quoteRisk: options.quoteRisk,
      vendorDiscovery: options.vendorDiscovery,
      procurementGraph: options.procurementGraph,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "marketplace-orchestrator-route",
        error: error?.message || "Marketplace AI Orchestrator failed.",
      },
      { status: 500 }
    );
  }
}