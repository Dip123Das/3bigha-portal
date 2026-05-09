import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

type RecommendationSide = "buyer" | "vendor" | "admin" | "platform";

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function heuristicRecommendation(body: any) {
  const side = String(body?.side || "buyer").toLowerCase() as RecommendationSide;
  const rfqCount = safeNumber(body?.rfqCount);
  const activeRfqs = safeNumber(body?.activeRfqs);
  const vendorCount = safeNumber(body?.vendorCount);
  const unreadCount = safeNumber(body?.unreadCount);
  const priceTrend = String(body?.priceTrend || "stable").toLowerCase();
  const momentumScore = safeNumber(body?.momentumScore, 50);
  const budgetRisk = String(body?.budgetRisk || "medium");

  const demandScore = clamp(
    rfqCount * 8 +
      activeRfqs * 12 +
      vendorCount * 5 +
      unreadCount * 10 +
      (priceTrend.includes("up") ? 18 : priceTrend.includes("down") ? 6 : 10)
  );

  const supplierPrediction =
    vendorCount >= 3
      ? "Strong supplier availability. Compare multiple vendors before decision."
      : vendorCount >= 1
        ? "Limited supplier availability. Negotiate clearly and seek one more quote."
        : "Low supplier availability. Improve RFQ details or expand vendor discovery.";

  const buyerNextAction =
    unreadCount > 0
      ? "Reply to pending vendor conversations and confirm price, timeline and payment terms."
      : activeRfqs > 0
        ? "Open RFQ command center and compare active quotes."
        : "Create a new AI procurement RFQ from current requirement.";

  const vendorNextAction =
    momentumScore < 45
      ? "Improve response speed, update profile, add price updates and consider visibility boost."
      : unreadCount > 0
        ? "Open vendor alerts and respond to pending RFQs quickly."
        : "Maintain fast RFQ replies and keep price updates fresh.";

  return {
    ok: true,
    source: "heuristic",
    recommendationScore: clamp(demandScore * 0.6 + momentumScore * 0.4),
    demandSignal:
      demandScore >= 75 ? "High demand" : demandScore >= 45 ? "Moderate demand" : "Early demand",
    budgetRisk,
    supplierPrediction,
    recurringProcurementHint:
      rfqCount >= 3
        ? "Recurring procurement pattern may exist. Save this as a repeat RFQ template."
        : "Not enough repeat activity yet for recurring procurement prediction.",
    conversionInsight:
      vendorCount >= 2 && unreadCount === 0
        ? "Good conversion potential if buyer compares and negotiates soon."
        : unreadCount > 0
          ? "Conversion depends on fast reply and clear final terms."
          : "More vendor response data is needed for stronger conversion prediction.",
    nextAction:
      side === "vendor"
        ? vendorNextAction
        : side === "admin" || side === "platform"
          ? "Monitor RFQ volume, vendor response quality, price signals and conversion gaps."
          : buyerNextAction,
    cards: [
      {
        title: "Best supplier prediction",
        detail: supplierPrediction,
      },
      {
        title: "Procurement demand signal",
        detail: demandScore >= 75 ? "Demand pressure is strong." : demandScore >= 45 ? "Demand is developing." : "Demand is still early.",
      },
      {
        title: "Forecasting summary",
        detail:
          priceTrend.includes("up")
            ? "Price pressure is rising. Early procurement may reduce cost risk."
            : priceTrend.includes("down")
              ? "Market may allow negotiation. Compare vendors before finalizing."
              : "Market looks stable. Proceed after confirming final terms.",
      },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fallback = heuristicRecommendation(body);

    if (!client) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are the AI Procurement Recommendation Engine for 3bigha.com.

Return ONLY valid JSON with this structure:
{
  "ok": true,
  "source": "openai",
  "recommendationScore": number,
  "demandSignal": string,
  "budgetRisk": string,
  "supplierPrediction": string,
  "recurringProcurementHint": string,
  "conversionInsight": string,
  "nextAction": string,
  "cards": [
    { "title": string, "detail": string }
  ]
}

Context:
${JSON.stringify(body, null, 2)}

Rules:
- Be practical for Indian local marketplace procurement.
- Focus on RFQs, vendors, quotes, price trend, budget risk, response speed and conversion.
- Do not invent exact data not provided.
- Keep each text short and action-oriented.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You return strict JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      ...fallback,
      ...parsed,
      ok: true,
      source: "openai",
    });
  } catch (e: any) {
    return NextResponse.json(heuristicRecommendation({}));
  }
}