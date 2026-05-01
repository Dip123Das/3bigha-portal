import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    reason: "The conversation is active, but more price, quantity and delivery details may be needed.",
    ctaLabel: "Ask Final Details",
    ctaMessage:
      "Please confirm the final price, quantity, delivery location, delivery time and bill/document availability.",
  };
}

function normalizeDealStage(value: unknown): DealStageResponse {
  const fallback = fallbackDealStage();

  if (!value || typeof value !== "object") return fallback;

  const row = value as Partial<DealStageResponse>;

  const confidence = Number(row.confidence);
  const safeConfidence =
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
      ? confidence
      : fallback.confidence;

  return {
    stage: String(row.stage || fallback.stage).slice(0, 40),
    confidence: safeConfidence,
    reason: String(row.reason || fallback.reason).slice(0, 220),
    ctaLabel: String(row.ctaLabel || fallback.ctaLabel).slice(0, 40),
    ctaMessage: String(row.ctaMessage || fallback.ctaMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: DealStageMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-8)
      : [];

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
        fallback: true,
        ...fallbackDealStage(),
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
- ready_to_close
- follow_up_needed

Return only valid JSON with this exact shape:
{
  "stage": "price_negotiation",
  "confidence": 0.82,
  "reason": "Short explanation under 180 characters.",
  "ctaLabel": "Ask Final Price",
  "ctaMessage": "Short message the user can send next."
}

Rules:
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
      ...normalizeDealStage(parsed),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal stage detection failed." },
      { status: 500 }
    );
  }
}