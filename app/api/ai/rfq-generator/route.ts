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
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    const prompt = `
Convert this requirement into structured RFQ items.

Return JSON only:

[
  { "item": "cement", "qty": 50, "unit": "bags" }
]

Text:
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
      }),
    });

    const json = await aiRes.json();
    const textOut = extractText(json);

    let items = [];

    try {
      items = JSON.parse(textOut);
    } catch {}

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}