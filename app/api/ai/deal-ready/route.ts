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
    label: "Not Ready Yet",
    insight:
      "Final price, quantity, delivery location and confirmation should be discussed before closing.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
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
      label: "Deal Ready",
      insight: "This conversation has enough closing signals. Confirm final terms before payment.",
      actionLabel: "Confirm Deal Details",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details before we proceed.",
    };
  }

  return {
    ready: false,
    confidence,
    label: "Deal Not Ready",
    insight: "The deal is active but still needs final confirmation before closing.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
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
    label: String(row.label || heuristic.label).slice(0, 50),
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

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallbackDealReady(),
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
  "label": "Deal Ready",
  "insight": "Short explanation under 180 characters.",
  "actionLabel": "Confirm Deal Details",
  "actionMessage": "Short next message user can send."
}

Readiness guide:
- ready=false if price, quantity, delivery or confirmation is missing.
- ready=true only if the conversation has clear buying/selling intent and enough final terms are discussed.
- Do not assume payment is completed.
- Do not mention AI.
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

    return NextResponse.json({
      ok: true,
      source: aiRes.ok && parsed ? "ai+heuristic" : "heuristic",
      ...normalizeDealReady(parsed, heuristic),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal readiness failed." },
      { status: 500 }
    );
  }
}