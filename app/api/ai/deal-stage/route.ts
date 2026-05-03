import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DealStageMessage = {
  role?: string;
  body?: string;
};

type DealStageResponse = {
  stage: string;
  confidence: number;
  reason: string;
  ctaLabel: string;
  ctaMessage: string;
};

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function fallbackDealStage(): DealStageResponse {
  return {
    stage: "discussion",
    confidence: 0.65,
    reason:
      "The conversation is active, but more price, quantity and delivery details may be needed.",
    ctaLabel: "Ask Final Details",
    ctaMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
  };
}

function heuristicDealStage(messages: DealStageMessage[]): DealStageResponse {
  const text = messages
    .map((m) => `${m.role || "user"}: ${m.body || ""}`)
    .join("\n")
    .toLowerCase();

  const hasPrice =
    text.includes("price") ||
    text.includes("rate") ||
    text.includes("₹") ||
    text.includes("rs") ||
    text.includes("rupee");

  const hasQuantity =
    text.includes("quantity") ||
    text.includes("qty") ||
    text.includes("bag") ||
    text.includes("cft") ||
    text.includes("ton") ||
    text.includes("piece");

  const hasDelivery =
    text.includes("delivery") ||
    text.includes("dispatch") ||
    text.includes("tomorrow") ||
    text.includes("today");

  const hasConfirmation =
    text.includes("confirm") ||
    text.includes("confirmed") ||
    text.includes("final") ||
    text.includes("finalised") ||
    text.includes("done") ||
    text.includes("okay");

  const hasTrust =
    text.includes("bill") ||
    text.includes("document") ||
    text.includes("gst") ||
    text.includes("payment") ||
    text.includes("advance");

  if (hasPrice && hasQuantity && hasDelivery && hasConfirmation && hasTrust) {
    return {
      stage: "ready_to_close",
      confidence: 0.9,
      reason:
        "Price, quantity, delivery, confirmation and trust/payment details are mostly covered.",
      ctaLabel: "Confirm Deal",
      ctaMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details before payment.",
    };
  }

  if (hasPrice && hasDelivery && hasConfirmation && !hasQuantity) {
    return {
      stage: "ready_but_details_missing",
      confidence: 0.82,
      reason:
        "Price, delivery and confirmation are discussed, but quantity or final address still needs confirmation.",
      ctaLabel: "Ask Missing Details",
      ctaMessage:
        "Please confirm quantity, delivery address and bill details before we proceed.",
    };
  }

  if (hasDelivery && hasConfirmation && (!hasPrice || !hasQuantity)) {
    return {
      stage: "ready_but_details_missing",
      confidence: 0.78,
      reason:
        "Dispatch and confirmation are discussed, but price or quantity is still missing.",
      ctaLabel: "Ask Missing Details",
      ctaMessage:
        "Please confirm final price, quantity, delivery address and bill details before we proceed.",
    };
  }

  if (hasPrice && !hasDelivery) {
    return {
      stage: "price_negotiation",
      confidence: 0.72,
      reason:
        "Price is discussed, but delivery time and final confirmation are still needed.",
      ctaLabel: "Ask Delivery Time",
      ctaMessage:
        "Please confirm delivery date, delivery time and availability before we proceed.",
    };
  }

  if (hasDelivery) {
    return {
      stage: "delivery_discussion",
      confidence: 0.72,
      reason:
        "Delivery is being discussed, but final price, quantity and confirmation are still needed.",
      ctaLabel: "Ask Final Details",
      ctaMessage:
        "Please confirm final price, quantity, delivery location and delivery time.",
    };
  }

  return fallbackDealStage();
}

function normalizeDealStage(
  value: unknown,
  heuristic: DealStageResponse
): DealStageResponse {
  if (!value || typeof value !== "object") return heuristic;

  const row = value as Partial<DealStageResponse>;

  const confidence = Number(row.confidence);
  const safeConfidence =
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
      ? Math.max(confidence, heuristic.confidence)
      : heuristic.confidence;

  return {
    stage: String(row.stage || heuristic.stage).slice(0, 40),
    confidence: safeConfidence,
    reason: String(row.reason || heuristic.reason).slice(0, 220),
    ctaLabel: String(row.ctaLabel || heuristic.ctaLabel).slice(0, 40),
    ctaMessage: String(row.ctaMessage || heuristic.ctaMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: DealStageMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    const heuristic = heuristicDealStage(messages);

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallbackDealStage(),
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "heuristic",
        fallback: true,
        ...heuristic,
      });
    }

    const context = messages
      .map(
        (m: DealStageMessage) =>
          `${String(m?.role || "user")}: ${String(m?.body || "").slice(0, 500)}`
      )
      .join("\n");

    const prompt = `
You are the AI deal intelligence engine of 3bigha.com.

Detect the current stage of this buyer-vendor deal chat.

Allowed stages:
- early_discussion
- collecting_details
- price_negotiation
- delivery_discussion
- trust_verification
- ready_but_details_missing
- ready_to_close
- follow_up_needed

Return only valid JSON with this exact shape:
{
  "stage": "ready_but_details_missing",
  "confidence": 0.82,
  "reason": "Short explanation under 180 characters.",
  "ctaLabel": "Ask Missing Details",
  "ctaMessage": "Short message the user can send next."
}

Rules:
- If price and delivery are discussed but quantity/address/bill is missing, use ready_but_details_missing.
- Use ready_to_close only when price, quantity, delivery, confirmation and bill/trust details are mostly covered.
- Do not mention AI.
- Do not assume payment is completed.
- Do not create false promises.
- ctaMessage must help close the deal safely.
- Keep ctaMessage under 180 characters.

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

    return NextResponse.json({
      ok: true,
      source: parsed ? "ai+heuristic" : "heuristic",
      ...normalizeDealStage(parsed, heuristic),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "catch-fallback",
      fallback: true,
      ...fallbackDealStage(),
    });
  }
}