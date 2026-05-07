import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

type VendorInput = {
  id?: string;
  vendorId?: string;
  name?: string;
  business_name?: string;
  price?: number;
  quoted_price?: number;
  city?: string;
  locality?: string;
  district?: string;
  rating?: number;
  trust_score?: number;
  ai_score?: number;
  risk_score?: number;
  response_time_minutes?: number;
  delivery_days?: number;
  subscription_plan?: string;
  boost_priority?: number;
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function text(v: unknown, fallback = "") {
  return typeof v === "string" ? v.trim() : fallback;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function scoreVendor(v: VendorInput, marketAvgPrice: number) {
  const price = num(v.price ?? v.quoted_price, 0);
  const trust = Math.min(100, Math.max(0, num(v.trust_score ?? v.rating, 50)));
  const aiScore = Math.min(100, Math.max(0, num(v.ai_score, 50)));
  const risk = Math.min(100, Math.max(0, num(v.risk_score, 20)));
  const boost = Math.min(20, Math.max(0, num(v.boost_priority, 0)));
  const deliveryDays = num(v.delivery_days, 5);
  const responseMinutes = num(v.response_time_minutes, 180);

  let priceScore = 55;
  if (price > 0 && marketAvgPrice > 0) {
    const deviation = ((price - marketAvgPrice) / marketAvgPrice) * 100;
    if (deviation <= -8) priceScore = 88;
    else if (deviation <= -3) priceScore = 78;
    else if (deviation <= 5) priceScore = 68;
    else if (deviation <= 12) priceScore = 52;
    else priceScore = 35;
  }

  const deliveryScore =
    deliveryDays <= 1 ? 90 : deliveryDays <= 3 ? 78 : deliveryDays <= 7 ? 62 : 42;

  const responseScore =
    responseMinutes <= 30
      ? 90
      : responseMinutes <= 120
        ? 75
        : responseMinutes <= 360
          ? 58
          : 40;

  const finalScore =
    priceScore * 0.25 +
    trust * 0.22 +
    aiScore * 0.2 +
    deliveryScore * 0.13 +
    responseScore * 0.1 +
    boost * 0.1 -
    risk * 0.18;

  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

function heuristicDecision(body: any) {
  const vendors: VendorInput[] = Array.isArray(body?.vendors) ? body.vendors : [];
  const priceData = body?.priceData || {};

  const marketAvgPrice =
    num(priceData.averagePrice) ||
    num(priceData.avgPrice) ||
    num(priceData.marketPrice) ||
    0;

  const scored = vendors
    .map((v) => ({
      ...v,
      smart_decision_score: scoreVendor(v, marketAvgPrice),
    }))
    .sort((a, b) => b.smart_decision_score - a.smart_decision_score);

  const best = scored[0] || null;
  const bestPrice = best ? num(best.price ?? best.quoted_price, 0) : 0;

  let riskLevel: "low" | "medium" | "high" = "medium";
  if (best && num(best.risk_score, 20) <= 25 && best.smart_decision_score >= 70) riskLevel = "low";
  if (best && (num(best.risk_score, 20) >= 60 || best.smart_decision_score < 45)) riskLevel = "high";

  let marketSituation = "Market data is limited. Compare at least 3 vendor quotes before final decision.";
  if (marketAvgPrice > 0 && bestPrice > 0) {
    const diff = ((bestPrice - marketAvgPrice) / marketAvgPrice) * 100;
    if (diff <= -5) marketSituation = "Best quote appears below current market average.";
    else if (diff <= 5) marketSituation = "Best quote appears close to current market average.";
    else marketSituation = "Best quote appears higher than current market average. Negotiation is recommended.";
  }

  return {
    ok: true,
    source: "heuristic",
    module: text(body?.module, "marketplace"),
    bestVendor: best,
    confidence: best ? Math.max(50, Math.min(95, best.smart_decision_score)) : 45,
    negotiationAdvice:
      bestPrice > 0
        ? "Ask the vendor to confirm final price, delivery charge, invoice, delivery timeline, and payment terms before closing."
        : "Ask vendors for final quote, delivery timeline, location coverage, and payment terms.",
    marketSituation,
    recommendedAction: best
      ? "Shortlist this vendor, negotiate final terms, and proceed only after written confirmation."
      : "Collect more vendor quotes before making a decision.",
    riskLevel,
    aiReasoning: best
      ? "Decision is based on price, trust, AI score, delivery confidence, response speed, boost signal, and risk indicators."
      : "Not enough vendor data was provided for a strong recommendation.",
    savingsPotential:
      marketAvgPrice > 0 && bestPrice > 0
        ? Math.max(0, Math.round(((marketAvgPrice - bestPrice) / marketAvgPrice) * 100))
        : 0,
    urgencyAdvice:
      text(body?.urgency).toLowerCase() === "high"
        ? "Because urgency is high, prefer reliable and fast-response vendors over the cheapest option."
        : "Compare price and reliability before final confirmation.",
    rankedVendors: scored,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fallback = heuristicDecision(body);

    if (!openai) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are Smart Decision AI for 3bigha.com, an Indian real-estate, materials, services, rentals and RFQ marketplace.

Your job:
Choose the best decision for the user using vendor data, price data, urgency, budget, city, category and buyer intent.

Return ONLY valid JSON with this exact shape:

{
  "ok": true,
  "source": "openai",
  "module": "string",
  "bestVendor": object or null,
  "confidence": number,
  "negotiationAdvice": "string",
  "marketSituation": "string",
  "recommendedAction": "string",
  "riskLevel": "low" | "medium" | "high",
  "aiReasoning": "string",
  "savingsPotential": number,
  "urgencyAdvice": "string",
  "rankedVendors": array
}

Rules:
- Do not invent unavailable facts.
- If data is weak, say confidence is low.
- Prefer reliable vendor over cheapest vendor if risk is high.
- Keep language practical for Indian marketplace users.
- rankedVendors must include best vendors first.
- Every ranked vendor should include smart_decision_score if possible.

Input JSON:
${JSON.stringify(body).slice(0, 12000)}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content || "";
    const parsed = safeJsonParse(content);

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(fallback);
    }

    return NextResponse.json({
      ...fallback,
      ...parsed,
      ok: true,
      source: "openai",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Smart Decision AI failed.",
      },
      { status: 500 }
    );
  }
}