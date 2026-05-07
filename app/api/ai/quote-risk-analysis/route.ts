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

function heuristicQuoteRisk(body: any) {
  const quotePrice =
    num(body?.quotePrice) ||
    num(body?.quoted_price) ||
    num(body?.grand_total) ||
    num(body?.price);

  const marketAverage =
    num(body?.marketAverage) ||
    num(body?.averagePrice) ||
    num(body?.avgPrice) ||
    num(body?.marketPrice);

  const trustScore = Math.max(0, Math.min(100, num(body?.trustScore ?? body?.trust_score, 50)));
  const aiScore = Math.max(0, Math.min(100, num(body?.aiScore ?? body?.ai_score, 50)));
  const vendorRisk = Math.max(0, Math.min(100, num(body?.vendorRisk ?? body?.risk_score, 20)));
  const deliveryDays = num(body?.deliveryDays ?? body?.delivery_days, 0);
  const hasDelivery = body?.deliveryDays != null || body?.delivery_days != null;
  const hasValidTill = Boolean(body?.validTill || body?.valid_till);
  const hasSubtotal = body?.subtotal != null;
  const hasGst = body?.gst_amount != null || body?.gstAmount != null;

  const riskReasons: string[] = [];
  let riskPoints = 0;
  let marketDeviation: number | null = null;

  if (quotePrice > 0 && marketAverage > 0) {
    marketDeviation = Number((((quotePrice - marketAverage) / marketAverage) * 100).toFixed(2));

    if (marketDeviation <= -20) {
      riskPoints += 30;
      riskReasons.push("Quote is much lower than market average and may need verification.");
    } else if (marketDeviation >= 25) {
      riskPoints += 25;
      riskReasons.push("Quote is much higher than market average.");
    } else if (marketDeviation <= -10) {
      riskPoints += 15;
      riskReasons.push("Quote is below market average. Confirm quality, brand and delivery terms.");
    }
  } else {
    riskPoints += 10;
    riskReasons.push("Market comparison data is limited.");
  }

  if (trustScore < 40) {
    riskPoints += 25;
    riskReasons.push("Vendor trust score is weak.");
  }

  if (aiScore < 40) {
    riskPoints += 15;
    riskReasons.push("AI vendor score is low.");
  }

  if (vendorRisk >= 60) {
    riskPoints += 30;
    riskReasons.push("Vendor has high risk indicators.");
  } else if (vendorRisk >= 40) {
    riskPoints += 15;
    riskReasons.push("Vendor has medium risk indicators.");
  }

  if (!hasDelivery) {
    riskPoints += 10;
    riskReasons.push("Delivery timeline is not clearly mentioned.");
  } else if (deliveryDays > 10) {
    riskPoints += 8;
    riskReasons.push("Delivery timeline appears slow.");
  }

  if (!hasValidTill) {
    riskPoints += 8;
    riskReasons.push("Quote validity date is missing.");
  }

  if (!hasSubtotal && !hasGst) {
    riskPoints += 8;
    riskReasons.push("Quote breakup or GST details may be incomplete.");
  }

  let riskLevel: "low" | "medium" | "high" = "low";
  if (riskPoints >= 55) riskLevel = "high";
  else if (riskPoints >= 25) riskLevel = "medium";

  const recommendedAction =
    riskLevel === "high"
      ? "Do not close immediately. Ask for written confirmation, invoice details, delivery terms, product specification and payment safety before proceeding."
      : riskLevel === "medium"
        ? "Proceed carefully. Confirm brand/specification, delivery charge, payment terms and validity before accepting."
        : "Quote appears reasonably safe, but still confirm final written terms before closing.";

  return {
    ok: true,
    source: "heuristic",
    module: body?.module || "marketplace",
    category: body?.category || null,
    vendorId: body?.vendorId || body?.vendor_id || null,
    quoteId: body?.quoteId || body?.quote_id || null,
    riskLevel,
    riskScore: Math.max(0, Math.min(100, Math.round(riskPoints))),
    riskReasons: riskReasons.length ? riskReasons : ["No major quote risk detected from available data."],
    recommendedAction,
    marketDeviation,
    confidence: Math.max(45, Math.min(90, 70 + Math.min(20, riskReasons.length * 4))),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fallback = heuristicQuoteRisk(body);

    if (!openai) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are Quote Risk Analysis AI for 3bigha.com.

3bigha.com is an Indian marketplace for property, building materials, construction services, rentals and RFQs.

Analyze whether a vendor quote is safe, risky, incomplete, overpriced, suspiciously cheap, or operationally weak.

Return ONLY valid JSON with this exact shape:

{
  "ok": true,
  "source": "openai",
  "module": "string",
  "category": "string or null",
  "vendorId": "string or null",
  "quoteId": "string or null",
  "riskLevel": "low" | "medium" | "high",
  "riskScore": number,
  "riskReasons": ["string"],
  "recommendedAction": "string",
  "marketDeviation": number or null,
  "confidence": number
}

Rules:
- riskScore must be 0 to 100.
- confidence must be 0 to 100.
- Do not invent facts.
- If quote is very low, warn about quality/specification/delivery/payment verification.
- If quote is very high, warn about negotiation and market comparison.
- If delivery, GST, validity, brand/specification or payment terms are missing, mention it.
- Keep advice practical for Indian buyers and construction/RFQ workflows.

Input JSON:
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
        error: error?.message || "Quote Risk Analysis AI failed.",
      },
      { status: 500 }
    );
  }
}