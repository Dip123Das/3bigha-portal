import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function fallbackMemory(body: any) {
  const side = String(body?.side || "platform").toLowerCase();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const rfqCount = safeNumber(body?.rfqCount);
  const vendorCount = safeNumber(body?.vendorCount);
  const closedDeals = safeNumber(body?.closedDeals);
  const unreadCount = safeNumber(body?.unreadCount);
  const avgResponseHours = safeNumber(body?.avgResponseHours, 24);
  const repeatCategoryCount = safeNumber(body?.repeatCategoryCount);
  const priceVariance = safeNumber(body?.priceVariance);

  const joined = messages
    .map((m: any) => String(m?.body || m?.content || ""))
    .join(" ")
    .toLowerCase();

  const hasPrice = /₹|rs\.?|price|rate|quote|total|amount|cost/.test(joined);
  const hasTimeline = /delivery|deliver|timeline|date|today|tomorrow|days|schedule/.test(joined);
  const hasPayment = /payment|advance|upi|cash|bank|gst|invoice|bill/.test(joined);
  const hasRisk = /delay|issue|problem|cancel|unavailable|not possible|dispute/.test(joined);
  const hasCommitment = /confirm|final|ok|done|accept|agree|book|ready/.test(joined);

  const memoryScore = clamp(
    25 +
      rfqCount * 5 +
      vendorCount * 4 +
      closedDeals * 12 +
      repeatCategoryCount * 8 +
      (hasPrice ? 10 : 0) +
      (hasTimeline ? 10 : 0) +
      (hasPayment ? 8 : 0) +
      (hasCommitment ? 12 : 0) -
      unreadCount * 3 -
      (avgResponseHours > 48 ? 12 : avgResponseHours > 24 ? 6 : 0) -
      (hasRisk ? 14 : 0)
  );

  const vendorReliability =
    avgResponseHours <= 6 && !hasRisk
      ? "High"
      : avgResponseHours <= 24 && !hasRisk
      ? "Medium"
      : "Low";

  const buyerBehavior =
    rfqCount >= 5 || repeatCategoryCount >= 2
      ? "Repeat procurement pattern"
      : hasCommitment
      ? "Decision-ready buyer"
      : "Exploratory buyer";

  const negotiationMemory =
    hasPrice && hasTimeline && hasPayment
      ? "Strong negotiation record: price, timeline and payment terms are present."
      : hasPrice && hasTimeline
      ? "Partial negotiation record: payment/GST terms still need confirmation."
      : hasPrice
      ? "Early negotiation record: timeline and payment terms are missing."
      : "Weak negotiation record: collect price, timeline and payment terms.";

  const anomalySignal =
    hasRisk || priceVariance >= 25 || avgResponseHours > 72
      ? "Anomaly detected"
      : "No major anomaly";

  const learningSummary =
    side === "vendor"
      ? "Vendor learning should focus on faster replies, complete final terms and reliability signals."
      : side === "buyer"
      ? "Buyer memory should focus on repeat requirements, preferred categories and quote comparison behavior."
      : "Platform memory should connect RFQs, vendors, conversations, pricing and closure outcomes.";

  return {
    ok: true,
    source: "heuristic",
    memoryScore,
    memoryType: side,
    buyerBehavior,
    vendorReliability,
    negotiationMemory,
    lifecycleMemory:
      closedDeals > 0
        ? "Closed procurement history exists and can improve future recommendations."
        : "No closure history yet; continue collecting RFQ and chat outcomes.",
    supplierReputationSignal:
      vendorReliability === "High"
        ? "Supplier appears reliable based on response and risk signals."
        : vendorReliability === "Medium"
        ? "Supplier reliability is moderate; watch response speed and final terms."
        : "Supplier reliability risk exists; collect more proof before repeat procurement.",
    anomalySignal,
    learningSummary,
    graphNodes: [
      { type: "buyer_behavior", label: buyerBehavior },
      { type: "vendor_reliability", label: vendorReliability },
      { type: "negotiation_memory", label: negotiationMemory },
      { type: "lifecycle", label: closedDeals > 0 ? "Closure history" : "Open lifecycle" },
      { type: "anomaly", label: anomalySignal },
    ],
    nextLearningAction:
      anomalySignal === "Anomaly detected"
        ? "Flag this procurement relationship for review before future recommendation."
        : hasCommitment
        ? "Save this as a strong procurement memory for future supplier ranking."
        : "Continue collecting price, timeline, payment and closure signals.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fallback = fallbackMemory(body);

    if (!client) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are the AI Procurement Memory & Learning Graph engine for 3bigha.com.

Return ONLY valid JSON:
{
  "ok": true,
  "source": "openai",
  "memoryScore": number,
  "memoryType": string,
  "buyerBehavior": string,
  "vendorReliability": string,
  "negotiationMemory": string,
  "lifecycleMemory": string,
  "supplierReputationSignal": string,
  "anomalySignal": string,
  "learningSummary": string,
  "graphNodes": [
    { "type": string, "label": string }
  ],
  "nextLearningAction": string
}

Context:
${JSON.stringify(body, null, 2)}

Rules:
- Do not invent exact facts not provided.
- Keep each text short and actionable.
- Focus on Indian local procurement, RFQs, vendors, pricing, delivery, payment and closure.
- This is memory/learning intelligence, not legal or financial advice.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You return strict JSON only." },
        { role: "user", content: prompt },
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
  } catch {
    return NextResponse.json(fallbackMemory({}));
  }
}