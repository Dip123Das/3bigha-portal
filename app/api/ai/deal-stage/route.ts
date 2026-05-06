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
  dealMomentum?: "low" | "medium" | "high";
  followUpTiming?: "now" | "soon" | "later";
  staleLeadRisk?: "low" | "medium" | "high";
  buyerCoolingOff?: boolean;
  vendorResponseNeeded?: boolean;
  timelineScore?: number;
  nextTimelineAction?: string;
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
    dealMomentum: "medium",
    followUpTiming: "soon",
    staleLeadRisk: "medium",
    buyerCoolingOff: false,
    vendorResponseNeeded: true,
    timelineScore: 50,
    nextTimelineAction:
      "Move the conversation toward price, quantity, delivery and document confirmation.",
  };
}

function detectTimelineSignals(messages: DealStageMessage[]) {
  const text = messages
    .map((m) => `${m.role || "user"}: ${m.body || ""}`)
    .join("\n")
    .toLowerCase();

  const messageCount = messages.length;

  const hesitation =
    text.includes("later") ||
    text.includes("thinking") ||
    text.includes("not sure") ||
    text.includes("costly") ||
    text.includes("too high") ||
    text.includes("compare") ||
    text.includes("discount");

  const urgency =
    text.includes("urgent") ||
    text.includes("today") ||
    text.includes("tomorrow") ||
    text.includes("fast") ||
    text.includes("immediate") ||
    text.includes("asap");

  const closing =
    text.includes("confirm") ||
    text.includes("confirmed") ||
    text.includes("final") ||
    text.includes("done") ||
    text.includes("proceed") ||
    text.includes("book") ||
    text.includes("bill") ||
    text.includes("invoice");

  let dealMomentum: "low" | "medium" | "high" = "low";
  if (closing || urgency) dealMomentum = "high";
  else if (messageCount >= 3 || hesitation) dealMomentum = "medium";

  let followUpTiming: "now" | "soon" | "later" = "later";
  if (urgency || closing || hesitation) followUpTiming = "now";
  else if (messageCount >= 3) followUpTiming = "soon";

  let staleLeadRisk: "low" | "medium" | "high" = "medium";
  if (hesitation && !closing) staleLeadRisk = "high";
  if (closing || urgency) staleLeadRisk = "low";

  const timelineScore = Math.max(
    20,
    Math.min(
      95,
      35 +
        (messageCount >= 3 ? 10 : 0) +
        (messageCount >= 6 ? 10 : 0) +
        (urgency ? 18 : 0) +
        (closing ? 22 : 0) -
        (hesitation ? 10 : 0)
    )
  );

  return {
    dealMomentum,
    followUpTiming,
    staleLeadRisk,
    buyerCoolingOff: hesitation && !closing,
    vendorResponseNeeded: urgency || hesitation || closing,
    timelineScore,
    nextTimelineAction:
      followUpTiming === "now"
        ? "Send a clear follow-up now with final price, delivery, bill and confirmation details."
        : "Keep the deal moving by asking for the next missing confirmation detail.",
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

  const timeline = detectTimelineSignals(messages);

  if (hasPrice && hasQuantity && hasDelivery && hasConfirmation && hasTrust) {
    return {
      stage: "ready_to_close",
      confidence: 0.9,
      reason:
        "Price, quantity, delivery, confirmation and trust/payment details are mostly covered.",
      ctaLabel: "Confirm Deal",
      ctaMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details before payment.",
      dealMomentum: "high",
      followUpTiming: "now",
      staleLeadRisk: "low",
      buyerCoolingOff: timeline.buyerCoolingOff,
      vendorResponseNeeded: true,
      timelineScore: Math.max(90, timeline.timelineScore),
      nextTimelineAction:
        "Close safely by confirming final terms before any payment.",
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
      dealMomentum: timeline.dealMomentum,
      followUpTiming: "now",
      staleLeadRisk: timeline.staleLeadRisk,
      buyerCoolingOff: timeline.buyerCoolingOff,
      vendorResponseNeeded: true,
      timelineScore: Math.max(78, timeline.timelineScore),
      nextTimelineAction:
        "Ask missing quantity, address and bill details before the buyer cools off.",
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
      dealMomentum: timeline.dealMomentum,
      followUpTiming: "now",
      staleLeadRisk: timeline.staleLeadRisk,
      buyerCoolingOff: timeline.buyerCoolingOff,
      vendorResponseNeeded: true,
      timelineScore: Math.max(74, timeline.timelineScore),
      nextTimelineAction:
        "Recover the lead by confirming price, quantity, address and bill details quickly.",
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
      dealMomentum: timeline.dealMomentum,
      followUpTiming: "now",
      staleLeadRisk: timeline.staleLeadRisk,
      buyerCoolingOff: timeline.buyerCoolingOff,
      vendorResponseNeeded: true,
      timelineScore: Math.max(72, timeline.timelineScore),
      nextTimelineAction:
        "Ask about delivery time and availability to keep the deal moving.",
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
      dealMomentum: timeline.dealMomentum,
      followUpTiming: "now",
      staleLeadRisk: timeline.staleLeadRisk,
      buyerCoolingOff: timeline.buyerCoolingOff,
      vendorResponseNeeded: true,
      timelineScore: Math.max(72, timeline.timelineScore),
      nextTimelineAction:
        "Ask for final details to keep the deal moving.",
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

  return {
    stage: String(row.stage || heuristic.stage).slice(0, 40),
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
        ? Math.max(confidence, heuristic.confidence)
        : heuristic.confidence,
    reason: String(row.reason || heuristic.reason).slice(0, 220),
    ctaLabel: String(row.ctaLabel || heuristic.ctaLabel).slice(0, 40),
    ctaMessage: String(row.ctaMessage || heuristic.ctaMessage).slice(0, 220),
    dealMomentum:
      row.dealMomentum === "low" ||
      row.dealMomentum === "medium" ||
      row.dealMomentum === "high"
        ? row.dealMomentum
        : heuristic.dealMomentum || "medium",
    followUpTiming:
      row.followUpTiming === "now" ||
      row.followUpTiming === "soon" ||
      row.followUpTiming === "later"
        ? row.followUpTiming
        : heuristic.followUpTiming || "soon",
    staleLeadRisk:
      row.staleLeadRisk === "low" ||
      row.staleLeadRisk === "medium" ||
      row.staleLeadRisk === "high"
        ? row.staleLeadRisk
        : heuristic.staleLeadRisk || "medium",
    buyerCoolingOff: Boolean(
      row.buyerCoolingOff ?? heuristic.buyerCoolingOff ?? false
    ),
    vendorResponseNeeded: Boolean(
      row.vendorResponseNeeded ?? heuristic.vendorResponseNeeded ?? true
    ),
    timelineScore: Math.max(
      0,
      Math.min(100, Number(row.timelineScore || heuristic.timelineScore || 50))
    ),
    nextTimelineAction: String(
      row.nextTimelineAction ||
        heuristic.nextTimelineAction ||
        "Move the deal forward with the next missing confirmation detail."
    ).slice(0, 220),
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
        (m) =>
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
  "ctaMessage": "Short message the user can send next.",
  "dealMomentum": "low | medium | high",
  "followUpTiming": "now | soon | later",
  "staleLeadRisk": "low | medium | high",
  "buyerCoolingOff": false,
  "vendorResponseNeeded": true,
  "timelineScore": 75,
  "nextTimelineAction": "Short timeline action."
}

Rules:
- If price and delivery are discussed but quantity/address/bill is missing, use ready_but_details_missing.
- Use ready_to_close only when price, quantity, delivery, confirmation and bill/trust details are mostly covered.
- Do not mention AI.
- Do not assume payment is completed.
- ctaMessage must help close the deal safely.
- Keep ctaMessage under 180 characters.
- Detect deal momentum, stale lead risk, buyer cooling-off and follow-up timing.
- timelineScore must be 0 to 100.
- nextTimelineAction must help move the conversation toward safe closing.

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