import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DealReadyMessage = {
  role?: string;
  body?: string;
};

function fallbackDealReady() {
  return {
    ready: false,
    confidence: 35,
    stage: "Early discussion",
    riskLevel: "medium",
    label: "Not Ready Yet",
    missing: ["final price", "quantity", "delivery location", "delivery time", "invoice / bill", "payment terms"],
    insight:
      "Final price, quantity, delivery location and confirmation should be discussed before closing.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time, invoice and payment terms.",
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function heuristicDealReady(messages: DealReadyMessage[]) {
  const text = messages
    .map((m) => `${m?.role || "user"}: ${m?.body || ""}`)
    .join("\n")
    .toLowerCase();

  let confidence = 20;

  if (text.includes("price") || text.includes("rate") || text.includes("quote")) confidence += 12;
  if (text.includes("quantity") || text.includes("qty") || text.includes("bag") || text.includes("cft")) confidence += 12;
  if (text.includes("delivery") || text.includes("location") || text.includes("address")) confidence += 14;
  if (text.includes("final") || text.includes("last price") || text.includes("best price")) confidence += 18;
  if (text.includes("ok") || text.includes("okay") || text.includes("done")) confidence += 14;
  if (text.includes("confirm") || text.includes("confirmed")) confidence += 22;
  if (text.includes("tomorrow") || text.includes("urgent") || text.includes("fast")) confidence += 10;
  if (text.includes("payment") || text.includes("advance") || text.includes("bill")) confidence += 10;

  confidence = Math.min(confidence, 100);
  const ready = confidence >= 75;

  if (ready) {
    return {
      ready: true,
      confidence,
      stage: "Ready to close",
      riskLevel: "low",
      label: "Deal Ready",
      missing: [],
      insight: "This conversation has enough closing signals. Confirm final terms before payment.",
      actionLabel: "Confirm Deal Details",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time, invoice and payment terms before we proceed.",
    };
  }

  const missing: string[] = [];
  if (!(text.includes("price") || text.includes("rate") || text.includes("quote") || text.includes("₹") || text.includes("rs"))) missing.push("final price");
  if (!(text.includes("quantity") || text.includes("qty") || text.includes("bag") || text.includes("cft"))) missing.push("quantity");
  if (!(text.includes("delivery") || text.includes("location") || text.includes("address"))) missing.push("delivery location / time");
  if (!(text.includes("bill") || text.includes("invoice") || text.includes("gst"))) missing.push("invoice / bill");
  if (!(text.includes("payment") || text.includes("advance") || text.includes("upi") || text.includes("cash"))) missing.push("payment terms");

  return {
    ready: false,
    confidence,
    stage: confidence >= 60 ? "Almost ready" : confidence >= 40 ? "Negotiation stage" : "Early discussion",
    riskLevel: missing.length >= 4 ? "high" : missing.length >= 2 ? "medium" : "low",
    label: "Deal Not Ready",
    missing,
    insight: "The deal is active but still needs final confirmation before closing.",
    actionLabel: "Ask Final Details",
    actionMessage:
      missing.length > 0
        ? `Please confirm ${missing.slice(0, 4).join(", ")} before we proceed.`
        : "Please confirm all final deal details before we proceed.",
  };
}

function getConversionLock(plan: unknown, confidence: number, ready: boolean) {
  const p: string = String(plan || "free").toLowerCase();

  const premiumPlans: string[] = [
    "silver_vendor",
    "gold_vendor",
    "platinum_vendor",
    "premium_vendor",
    "hub_vendor",
  ];

  const isPremium = premiumPlans.includes(p);
  const isFreeOrBasic = p === "free" || p === "basic_vendor" || !isPremium;

  if (!isFreeOrBasic || confidence < 65) {
    return {
      locked: false,
      delayMs: 0,
      label: "Premium Flow",
      message: "No conversion lock required.",
      upgradeRequired: false,
    };
  }

  return {
    locked: true,
    delayMs: ready ? 5000 : 3000,
    label: ready ? "Buyer Waiting" : "High-Intent Buyer",
    message: ready
      ? "This buyer looks ready. Premium vendors get faster alerts and stronger deal protection."
      : "This buyer is showing strong interest. Upgrade to unlock faster AI alerts and priority follow-up.",
    upgradeRequired: true,
  };
}

function normalizeDealReady(value: unknown, heuristic = fallbackDealReady()) {
  if (!value || typeof value !== "object") return heuristic;

  const row = value as Partial<ReturnType<typeof fallbackDealReady>>;
  const confidence = Number(row.confidence);

  return {
    ready: Boolean(row.ready ?? heuristic.ready),
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 100
        ? Math.max(Math.round(confidence), heuristic.confidence)
        : heuristic.confidence,
    stage: String((row as any).stage || (heuristic as any).stage || "Early discussion").slice(0, 50),
    riskLevel: String((row as any).riskLevel || (heuristic as any).riskLevel || "medium").slice(0, 20),
    label: String(row.label || heuristic.label).slice(0, 50),
    missing: Array.isArray((row as any).missing)
      ? (row as any).missing.slice(0, 6).map((x: any) => String(x).slice(0, 40))
      : Array.isArray((heuristic as any).missing)
      ? (heuristic as any).missing
      : [],
    insight: String(row.insight || heuristic.insight).slice(0, 220),
    actionLabel: String(row.actionLabel || heuristic.actionLabel).slice(0, 50),
    actionMessage: String(row.actionMessage || heuristic.actionMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages: DealReadyMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    const vendorPlan = body?.vendorPlan || body?.subscriptionPlan || "free";

    if (messages.length === 0) {
      const fallback = fallbackDealReady();

      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallback,
        conversionLock: getConversionLock(
          vendorPlan,
          fallback.confidence,
          fallback.ready
        ),
      });
    }

    const heuristic = heuristicDealReady(messages);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "heuristic",
        fallback: true,
        ...heuristic,
        conversionLock: getConversionLock(
          vendorPlan,
          heuristic.confidence,
          heuristic.ready
        ),
      });
    }

    const context = messages
      .map(
        (m: DealReadyMessage) =>
          `${String(m?.role || "user")}: ${String(m?.body || "").slice(0, 500)}`
      )
      .join("\n");

    const prompt = `
You are the AI deal readiness engine of 3bigha.com.

Decide whether this buyer-vendor conversation is ready for final deal confirmation.

Return only valid JSON:
{
  "ready": true,
  "confidence": 82,
  "stage": "Ready to close",
  "riskLevel": "low",
  "label": "Deal Ready",
  "missing": [],
  "insight": "Short explanation under 180 characters.",
  "actionLabel": "Confirm Deal Details",
  "actionMessage": "Short next message user can send."
}

Readiness guide:
- ready=false if price, quantity, delivery or confirmation is missing.
- ready=true only if the conversation has clear buying/selling intent and enough final terms are discussed.
- Do not assume payment is completed.
- Do not mention AI.
- stage must be one of: Early discussion, Negotiation stage, Almost ready, Ready to close.
- riskLevel must be one of: low, medium, high.
- missing must list missing deal fields like final price, quantity, delivery, invoice, payment terms.
- actionMessage must help close safely.
- Keep actionMessage under 180 characters.

Chat:
${context}
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
        temperature: 0.2,
        max_output_tokens: 260,
      }),
    });

    const aiJson = await aiRes.json().catch(() => ({}));
    const raw = extractText(aiJson).trim();

    let parsed: unknown = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const normalized = normalizeDealReady(parsed, heuristic);

    return NextResponse.json({
      ok: true,
      source: aiRes.ok && parsed ? "ai+heuristic" : "heuristic",
      ...normalized,
      conversionLock: getConversionLock(
        vendorPlan,
        normalized.confidence,
        normalized.ready
      ),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal readiness failed." },
      { status: 500 }
    );
  }
}