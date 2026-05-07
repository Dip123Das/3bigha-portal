import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function heuristicPrediction(body: any) {
  const currentPrice =
    num(body?.currentPrice) ||
    num(body?.price) ||
    num(body?.latestPrice) ||
    num(body?.averagePrice);

  const previousPrice =
    num(body?.previousPrice) ||
    num(body?.oldPrice) ||
    num(body?.lastWeekPrice) ||
    currentPrice;

  const demandScore = Math.max(0, Math.min(100, num(body?.demandScore, 50)));
  const supplyScore = Math.max(0, Math.min(100, num(body?.supplyScore, 50)));
  const rfqDemand = Math.max(0, Math.min(100, num(body?.rfqDemand, 50)));

  const priceChange =
    previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

  let direction: "up" | "down" | "stable" = "stable";
  let expectedChange = priceChange * 0.4 + (demandScore - supplyScore) * 0.05 + (rfqDemand - 50) * 0.03;

  if (expectedChange > 2) direction = "up";
  if (expectedChange < -2) direction = "down";

  expectedChange = Math.max(-15, Math.min(15, expectedChange));

  const low = currentPrice > 0 ? Math.round(currentPrice * (1 + (expectedChange - 2) / 100)) : null;
  const high = currentPrice > 0 ? Math.round(currentPrice * (1 + (expectedChange + 2) / 100)) : null;

  const recommendation =
    direction === "up"
      ? "Buy or finalize soon if requirement is confirmed."
      : direction === "down"
        ? "Wait or negotiate harder if purchase is not urgent."
        : "Compare vendors and proceed only after checking delivery and final terms.";

  return {
    ok: true,
    source: "heuristic",
    module: body?.module || "marketplace",
    category: body?.category || null,
    city: body?.city || null,
    prediction: direction === "up" ? "Price may rise" : direction === "down" ? "Price may fall" : "Price may remain stable",
    direction,
    confidence: Math.round(Math.min(88, Math.max(45, 55 + Math.abs(expectedChange) * 2))),
    expectedRange: {
      low,
      high,
    },
    expectedChangePercent: Number(expectedChange.toFixed(2)),
    recommendation,
    trendReason:
      "Prediction is based on current price, previous price, demand signal, supply signal and RFQ activity.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fallback = heuristicPrediction(body);

    if (!openai) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are Price Prediction AI for 3bigha.com.

The platform covers Indian real estate, building materials, construction services and rentals.

Return ONLY valid JSON with this exact shape:

{
  "ok": true,
  "source": "openai",
  "module": "string",
  "category": "string or null",
  "city": "string or null",
  "prediction": "string",
  "direction": "up" | "down" | "stable",
  "confidence": number,
  "expectedRange": {
    "low": number or null,
    "high": number or null
  },
  "expectedChangePercent": number,
  "recommendation": "string",
  "trendReason": "string"
}

Rules:
- Do not invent exact market data.
- If data is weak, keep confidence low.
- Give practical Indian marketplace advice.
- For urgent purchase, mention risk of waiting.
- For non-urgent purchase, mention negotiation/waiting if appropriate.

Input:
${JSON.stringify(body).slice(0, 10000)}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = safeJsonParse(completion.choices[0]?.message?.content || "");

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
        error: error?.message || "Price Prediction AI failed.",
      },
      { status: 500 }
    );
  }
}