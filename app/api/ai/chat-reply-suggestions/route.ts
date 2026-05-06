import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatSuggestionMessage = {
  role?: string;
  body?: string;
};

type DealSide = "buyer" | "vendor" | "unknown";

type DealTemperature = "cold" | "warm" | "hot" | "closing";

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function safeFallbackSuggestions(side: DealSide = "unknown"): string[] {
  if (side === "vendor") {
    return [
      "I can confirm the best final price after quantity and delivery location.",
      "Please confirm quantity, delivery address and expected timeline.",
      "I can proceed once price, delivery time and bill details are confirmed.",
    ];
  }

  if (side === "buyer") {
    return [
      "Please confirm your final price, delivery time and bill details.",
      "Can you offer a better final price for this quantity?",
      "I am ready to proceed if price, delivery and documents are confirmed.",
    ];
  }

  return [
    "Please confirm the final price and delivery time.",
    "Can you share the exact location and availability?",
    "I am ready to proceed after confirming item, quantity and bill details.",
  ];
}

function detectSide(value: unknown): DealSide {
  const side = String(value || "").toLowerCase();

  if (side === "buyer") return "buyer";
  if (side === "vendor") return "vendor";

  return "unknown";
}

function detectDealTemperature(messages: ChatSuggestionMessage[]): DealTemperature {
  const text = messages
    .map((m) => `${m?.role || ""} ${m?.body || ""}`)
    .join(" ")
    .toLowerCase();

  const closingWords = [
    "final",
    "confirm",
    "confirmed",
    "proceed",
    "book",
    "deal",
    "ready",
    "send bill",
    "invoice",
    "advance",
    "payment",
    "delivery tomorrow",
  ];

  const hotWords = [
    "best price",
    "last price",
    "urgent",
    "today",
    "tomorrow",
    "available",
    "quantity",
    "delivery",
    "location",
  ];

  const hesitationWords = [
    "thinking",
    "later",
    "costly",
    "high price",
    "too high",
    "compare",
    "not sure",
    "discount",
    "less price",
  ];

  const closingScore = closingWords.filter((word) => text.includes(word)).length;
  const hotScore = hotWords.filter((word) => text.includes(word)).length;
  const hesitationScore = hesitationWords.filter((word) => text.includes(word)).length;

  if (closingScore >= 3) return "closing";
  if (closingScore >= 1 && hotScore >= 2) return "hot";
  if (hotScore >= 2 || hesitationScore >= 1) return "warm";

  return "cold";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatSuggestionMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-10)
      : [];

    const side = detectSide(body?.side);
    const dealTemperature = detectDealTemperature(messages);

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        suggestions: safeFallbackSuggestions(side),
        dealTemperature,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        suggestions: safeFallbackSuggestions(),
      });
    }

    const context = messages
      .map(
        (m: ChatSuggestionMessage) =>
          `${String(m?.role || "user")}: ${String(m?.body || "").slice(0, 500)}`
      )
      .join("\n");

    const prompt = `
You are the AI Auto-Negotiation and Deal Closing Assistant of 3bigha.com.

User side: ${side}
Detected deal temperature: ${dealTemperature}

Based on this buyer-vendor chat, suggest exactly 3 short smart replies.

Your job:
- Generate practical counter-offer or closing replies.
- Detect buyer hesitation and reduce deal loss.
- Help vendor move the buyer toward confirmation.
- Help buyer ask for final price, delivery, bill, document, or commitment.
- Improve negotiation flow without sounding robotic.

Rules:
- Return only a JSON array of 3 strings.
- Each reply must be useful for negotiation or closing.
- Keep each reply under 130 characters.
- Do not mention AI.
- Do not add false promises.
- Do not auto-confirm payment unless already clearly discussed.
- If side is vendor, replies should help convert the buyer.
- If side is buyer, replies should help get better clarity, price, and confirmation.
- If deal temperature is closing, suggest stronger confirmation/CTA replies.
- If deal temperature is warm, suggest follow-up and hesitation-removal replies.
- If deal temperature is cold, suggest information-gathering replies.

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
        temperature: 0.35,
        max_output_tokens: 220,
      }),
    });

    const aiJson = await aiRes.json();
    const raw = extractText(aiJson).trim();

    let suggestions = safeFallbackSuggestions(side);

    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        suggestions = parsed
          .map((x: unknown) => String(x).trim())
          .filter((x: string) => Boolean(x))
          .slice(0, 3);
      }
    } catch {
      suggestions = raw
        .split("\n")
        .map((x: string) =>
          x.replace(/^[-*\d.\s"']+/, "").replace(/["']$/, "").trim()
        )
        .filter((x: string) => Boolean(x))
        .slice(0, 3);
    }

    if (suggestions.length === 0) {
      suggestions = safeFallbackSuggestions(side);
    }

    suggestions = suggestions
      .map((x: string) => x.trim())
      .filter((x: string) => Boolean(x))
      .slice(0, 3);

    while (suggestions.length < 3) {
      suggestions.push(safeFallbackSuggestions(side)[suggestions.length]);
    }

    return NextResponse.json({
      ok: true,
      suggestions,
      source: aiRes.ok ? "ai" : "fallback",
      side,
      dealTemperature,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI reply suggestions failed." },
      { status: 500 }
    );
  }
}