import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatSuggestionMessage = {
  role?: string;
  body?: string;
};

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function safeFallbackSuggestions(): string[] {
  return [
    "Please confirm the final price and delivery time.",
    "Can you share the exact location and availability?",
    "I am ready to proceed after confirming item, quantity and bill details.",
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatSuggestionMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-6)
      : [];

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        suggestions: safeFallbackSuggestions(),
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
You are the AI deal assistant of 3bigha.com.

Based on this buyer-vendor chat, suggest exactly 3 short smart replies.

Rules:
- Return only a JSON array of 3 strings.
- Each reply must be useful for closing the deal.
- Keep each under 120 characters.
- Mention price, quantity, location, delivery, bill/document, or confirmation where useful.
- Do not mention AI.
- Do not add false promises.

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

    let suggestions = safeFallbackSuggestions();

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
      suggestions = safeFallbackSuggestions();
    }

    return NextResponse.json({
      ok: true,
      suggestions,
      source: aiRes.ok ? "ai" : "fallback",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI reply suggestions failed." },
      { status: 500 }
    );
  }
}