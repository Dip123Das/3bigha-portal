import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

function safeDealScore(overrides: Partial<any> = {}) {
  return {
    ok: true,
    score: 40,
    label: "Normal Lead",
    insight:
      "AI is waiting for stronger deal signals like price, quantity, location, delivery time, or confirmation.",
    actionLabel: "Copy follow-up message",
    actionMessage:
      "Please share price, quantity, delivery location and timeline.",
    ...overrides,
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

function heuristicDealScore(messages: DealScoreMessage[]) {
  const text = messages
    .map((m) => `${m?.role || "user"}: ${m?.body || ""}`)
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

  if (hasPrice && hasQuantity && hasDelivery && hasConfirmation) {
    return safeDealScore({
      source: "heuristic",
      score: 88,
      label: "Very Strong Deal",
      insight:
        "Final terms are mostly discussed. Confirm safely before payment.",
      actionLabel: "Confirm Deal",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details before proceeding.",
    });
  }

  if (hasDelivery && hasConfirmation && (!hasPrice || !hasQuantity)) {
    return safeDealScore({
      source: "heuristic",
      score: 68,
      label: "Ready but Details Missing",
      insight:
        "Dispatch and confirmation are discussed, but price or quantity is still missing.",
      actionLabel: "Ask Missing Details",
      actionMessage:
        "Please confirm final price, quantity, delivery address and bill details before we proceed.",
    });
  }

  if (hasDelivery || hasConfirmation || hasPrice) {
    return safeDealScore({
      source: "heuristic",
      score: 50,
      label: "Moderate Deal",
      insight:
        "The conversation is active, but some final deal details are still missing.",
      actionLabel: "Ask Final Details",
      actionMessage:
        "Please share final price, quantity, delivery location and expected delivery time.",
    });
  }

  return safeDealScore({
    source: "heuristic",
    score: 40,
    label: "Normal Lead",
    insight:
      "Conversation started but important deal details like price, quantity, delivery and confirmation are missing.",
    actionLabel: "Ask for details",
    actionMessage:
      "Please share price, quantity, delivery location and expected delivery time.",
  });
}

function normalizeDealScore(value: unknown, heuristic: any) {
  if (!value || typeof value !== "object") return heuristic;

  const row = value as any;
  const score = Number(row.score);

  return safeDealScore({
    source: "ai+heuristic",
    score:
      Number.isFinite(score) && score >= 0 && score <= 100
        ? Math.max(Math.round(score), heuristic.score || 40)
        : heuristic.score || 40,
    label: String(row.label || heuristic.label || "Normal Lead").slice(0, 50),
    insight: String(
      row.insight || heuristic.insight || "AI is analyzing deal strength."
    ).slice(0, 220),
    actionLabel: String(
      row.actionLabel || heuristic.actionLabel || "Copy follow-up message"
    ).slice(0, 50),
    actionMessage: String(
      row.actionMessage ||
        heuristic.actionMessage ||
        "Please share price, quantity, delivery location and timeline."
    ).slice(0, 220),
  });
}

export async function GET() {
  return NextResponse.json(
    safeDealScore({
      fallback: true,
      insight: "Deal Score API is active. Send POST messages to calculate score.",
    })
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const messages: DealScoreMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        safeDealScore({
          fallback: true,
          score: 40,
          label: "Normal Lead",
          insight: "Start conversation to evaluate deal strength.",
          actionLabel: "Start conversation",
          actionMessage: "Hello, I would like to know more details.",
        })
      );
    }

    const heuristic = heuristicDealScore(messages);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ...heuristic,
        fallback: true,
      });
    }

    const context = messages
      .map(
        (m) =>
          `${String(m?.role || "user")}: ${String(m?.body || "").slice(0, 500)}`
      )
      .join("\n");

    const prompt = `
You are the AI deal scoring engine of 3bigha.com.

Score this buyer-vendor deal conversation from 0 to 100.

Return only valid JSON:
{
  "score": 78,
  "label": "Strong Deal",
  "insight": "Short explanation under 180 characters.",
  "actionLabel": "Close Deal",
  "actionMessage": "Short next message user can send."
}

Scoring guide:
- 0-30 weak: unclear discussion
- 31-60 moderate: active but missing details
- 61-80 strong: price/details mostly discussed
- 81-100 very strong: ready to close

Important local signals:
- Short words like ok, done, final, start, confirm, faster can indicate strong deal intent.
- Do not reduce score just because messages are short.
- Do not mention AI.
- Do not assume payment is completed.
- Do not create false promises.
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

    return NextResponse.json(normalizeDealScore(parsed, heuristic));
  } catch {
    return NextResponse.json(
      safeDealScore({
        fallback: true,
        source: "catch",
        score: 40,
        label: "Normal Lead",
        insight: "Deal Score is temporarily using safe fallback mode.",
        actionLabel: "Copy follow-up message",
        actionMessage:
          "Please share price, quantity, delivery location and timeline.",
      })
    );
  }
}