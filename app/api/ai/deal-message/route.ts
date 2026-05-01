import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim().slice(0, 700);

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required." },
        { status: 400 }
      );
    }

    const fallbackMessage = message;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        message: fallbackMessage,
      });
    }

    const prompt = `
Improve this 3bigha deal chat message.

Rules:
- Keep the meaning same.
- Make it polite, clear and business-like.
- Keep it short.
- Do not add false promises.
- Do not mention AI.
- Use simple English.
- If useful, mention item, quantity, price, delivery, location, bill/document confirmation.
- Return only the improved message.

Original message:
${message}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.25,
        max_output_tokens: 180,
      }),
    });

    const aiJson = await aiRes.json();

    const improved =
      aiRes.ok && extractText(aiJson).trim()
        ? extractText(aiJson).trim().replace(/^["']|["']$/g, "")
        : fallbackMessage;

    return NextResponse.json({
      ok: true,
      message: improved,
      source: aiRes.ok ? "ai" : "fallback",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI deal assistant failed." },
      { status: 500 }
    );
  }
}