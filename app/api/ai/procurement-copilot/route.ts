import { NextResponse } from "next/server";
import {
  runMarketplaceAiOrchestrator,
  type MarketplaceAiContext,
} from "@/lib/ai/marketplace-orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackReply(message: string) {
  return {
    reply:
      "I understood your procurement requirement. Please confirm quantity, delivery location, timeline, and budget range so I can prepare a better RFQ.",
    extracted: {
      title: message.slice(0, 80),
      intent: message,
      missingFields: ["quantity", "delivery location", "timeline"],
    },
    nextQuestions: [
      "What quantity do you need?",
      "Where should it be delivered?",
      "When do you need it?",
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const message = String(
      body?.message || body?.text || body?.requirement || ""
    ).trim();

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error: "Message is required.",
        },
        { status: 400 }
      );
    }

    const context: MarketplaceAiContext = {
      module: body?.module || "marketplace",
      category: body?.category || null,
      buyerIntent: message,
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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        copilot: fallbackReply(message),
        orchestrator,
      });
    }

    const prompt = `
You are the AI Procurement Copilot of 3Bigha marketplace.

The buyer says:
${message}

Marketplace intelligence:
${JSON.stringify(orchestrator?.intelligence || {}, null, 2)}

Return STRICT JSON ONLY:

{
  "reply": "short helpful buyer-facing answer",
  "extracted": {
    "title": "RFQ title",
    "intent": "buyer intent summary",
    "category": "procurement category",
    "module": "materials/services/rentals/property/marketplace",
    "city": null,
    "district": null,
    "locality": null,
    "items": [
      { "item": "cement", "qty": 500, "unit": "bags" }
    ],
    "missingFields": ["timeline"]
  },
  "nextQuestions": [
    "question 1",
    "question 2"
  ],
  "recommendedActions": [
    "action 1",
    "action 2"
  ]
}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content: prompt }],
      }),
    });

    const json = await aiRes.json();

    const text =
      json?.output_text ||
      json?.output
        ?.flatMap((item: any) => item?.content || [])
        ?.map((content: any) => content?.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "";

    let copilot = fallbackReply(message);

    try {
      copilot = JSON.parse(text);
    } catch {}

    return NextResponse.json({
      ok: true,
      source: "ai-procurement-copilot",
      copilot,
      orchestrator,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "ai-procurement-copilot",
        error: error?.message || "AI procurement copilot failed.",
      },
      { status: 500 }
    );
  }
}