import { NextResponse } from "next/server";

export const runtime = "nodejs";

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((c: any) => c?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body?.text || "").slice(0, 500);

    if (!text) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        score: "medium",
      });
    }

    const prompt = `
Classify this buyer message into:

hot / medium / low

Rules:
- hot = ready to buy
- medium = exploring
- low = vague

Return only one word.

Message:
${text}
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
      }),
    });

    const json = await aiRes.json();
    const textOut = extractText(json).toLowerCase();

    let score = "medium";

    if (textOut.includes("hot")) score = "hot";
    else if (textOut.includes("low")) score = "low";

    return NextResponse.json({ ok: true, score });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}