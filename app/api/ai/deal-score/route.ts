import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

function fallbackDealScore() {
  return {
    score: 55,
    label: "Moderate Deal",
    insight:
      "The discussion has started, but final price, quantity, delivery and confirmation are still needed.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm the final price, quantity, delivery location, delivery time and bill/document availability.",
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

  let score = 25;

  if (text.includes("price") || text.includes("rate") || text.includes("quote")) score += 10;
  if (text.includes("delivery") || text.includes("time") || text.includes("timeline")) score += 10;
  if (text.includes("final") || text.includes("last price") || text.includes("best price")) score += 20;
  if (text.includes("ok") || text.includes("okay") || text.includes("done")) score += 20;
  if (text.includes("confirm") || text.includes("confirmed") || text.includes("start")) score += 25;
  if (text.includes("urgent") || text.includes("fast") || text.includes("faster") || text.includes("tomorrow")) score += 15;
  if (text.includes("payment") || text.includes("advance") || text.includes("upi") || text.includes("cash")) score += 15;
  if (text.includes("call me") || text.includes("phone") || text.includes("whatsapp")) score += 8;

  score = Math.min(score, 100);

  if (score >= 85) {
    return {
      score,
      label: "Very Strong Deal",
      insight: "Buyer and vendor show strong closing intent. Confirm final terms safely before proceeding.",
      actionLabel: "Confirm Deal",
      actionMessage: "Please confirm final price, delivery time, start date and bill/document details before proceeding.",
    };
  }

  if (score >= 70) {
    return {
      score,
      label: "Strong Deal",
      insight: "The discussion shows clear buying intent. Final confirmation is the next step.",
      actionLabel: "Ask Confirmation",
      actionMessage: "Please confirm the final price, delivery timeline and start date.",
    };
  }

  if (score >= 45) {
    return {
      score,
      label: "Moderate Deal",
      insight: "The conversation is active, but some final deal details are still missing.",
      actionLabel: "Ask Final Details",
      actionMessage: "Please share final price, delivery time, availability and bill/document details.",
    };
  }

  return {
    score,
    label: "Early Discussion",
    insight: "The conversation has started but deal intent is still weak.",
    actionLabel: "Ask Price",
    actionMessage: "Please share your best final price and delivery timeline.",
  };
}

function normalizeDealScore(value: unknown, heuristic = fallbackDealScore()) {
  if (!value || typeof value !== "object") return heuristic;

  const row = value as Partial<ReturnType<typeof fallbackDealScore>>;
  const score = Number(row.score);

  return {
    score:
      Number.isFinite(score) && score >= 0 && score <= 100
        ? Math.max(Math.round(score), heuristic.score)
        : heuristic.score,
    label: String(row.label || heuristic.label).slice(0, 50),
    insight: String(row.insight || heuristic.insight).slice(0, 220),
    actionLabel: String(row.actionLabel || heuristic.actionLabel).slice(0, 50),
    actionMessage: String(row.actionMessage || heuristic.actionMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages: DealScoreMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallbackDealScore(),
      });
    }

    const heuristic = heuristicDealScore(messages);
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
        (m: DealScoreMessage) =>
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

    return NextResponse.json({
      ok: true,
      source: aiRes.ok && parsed ? "ai+heuristic" : "heuristic",
      ...normalizeDealScore(parsed, heuristic),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal score failed." },
      { status: 500 }
    );
  }
}