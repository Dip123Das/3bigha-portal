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
    insight: "The discussion has started, but final price, quantity, delivery and confirmation are still needed.",
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

function normalizeDealScore(value: unknown) {
  const fallback = fallbackDealScore();

  if (!value || typeof value !== "object") return fallback;

  const row = value as Partial<ReturnType<typeof fallbackDealScore>>;
  const score = Number(row.score);

  return {
    score:
      Number.isFinite(score) && score >= 0 && score <= 100
        ? Math.round(score)
        : fallback.score,
    label: String(row.label || fallback.label).slice(0, 50),
    insight: String(row.insight || fallback.insight).slice(0, 220),
    actionLabel: String(row.actionLabel || fallback.actionLabel).slice(0, 50),
    actionMessage: String(row.actionMessage || fallback.actionMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages: DealScoreMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-8)
      : [];

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallbackDealScore(),
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        ...fallbackDealScore(),
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

Rules:
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

    const aiJson = await aiRes.json();
    const raw = extractText(aiJson).trim();

    let parsed: unknown = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      ok: true,
      source: aiRes.ok ? "ai" : "fallback",
      ...normalizeDealScore(parsed),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal score failed." },
      { status: 500 }
    );
  }
}