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

    const stats = body?.stats || {};

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        tips: [
          "Submit more price updates to improve visibility",
          "Respond faster to buyer messages",
        ],
      });
    }

    const prompt = `
You are a growth coach for vendors on a marketplace.

Based on these stats:
${JSON.stringify(stats)}

Give 3 short actionable tips.

Rules:
- Keep simple
- No AI mention
- Focus on increasing leads and conversions
- Return bullet points only
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
        temperature: 0.3,
      }),
    });

    const json = await aiRes.json();
    const text = extractText(json);

    const tips = text
  .split("\n")
  .map((t: string) => t.replace(/^[-•\d.)\s]+/, "").trim())
  .filter((t: string) => t.length > 0);

    return NextResponse.json({ ok: true, tips });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}