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
    const apiKey = process.env.OPENAI_API_KEY;

    const body = await req.json();

    const item = String(body?.item || "this item").slice(0, 80);
    const location = String(body?.location || "local market").slice(0, 80);
    const trend = String(body?.trend || "Stable").slice(0, 30);
    const changePercent =
      typeof body?.changePercent === "number" ? body.changePercent : null;
    const sources = Number(body?.sources || 0);
    const confidence = Number(body?.confidence || 0);
    const unit = String(body?.unit || "unit").slice(0, 40);
    const priceMin = Number(body?.priceMin || 0);
    const priceMax = Number(body?.priceMax || 0);

    const fallbackExplanation =
      sources <= 1
        ? `${item} price in ${location} is indicative because more verified local sources are needed.`
        : `${item} price in ${location} is based on current verified market inputs and recent price movement.`;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        fallback: true,
        explanation: fallbackExplanation,
      });
    }

    const prompt = `
Write one short market explanation for 3bigha Price Today.

Rules:
- One sentence only.
- Maximum 24 words.
- Do not say "guaranteed", "official", or "confirmed".
- Mention that it is indicative if source count is low.
- Keep language simple for real estate/construction marketplace users.

Data:
Item: ${item}
Location: ${location}
Trend: ${trend}
Change percent: ${
      changePercent === null ? "not enough history" : `${changePercent}%`
    }
Sources: ${sources}
Confidence: ${confidence}%
Price range: ₹${priceMin} - ₹${priceMax} / ${unit}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_output_tokens: 80,
      }),
    });

    const aiJson = await aiRes.json();

    if (!aiRes.ok) {
      console.error("OpenAI price explanation error:", aiJson);

      return NextResponse.json({
        ok: true,
        fallback: true,
        explanation: fallbackExplanation,
      });
    }

    const explanation =
      extractText(aiJson).trim() || fallbackExplanation;

    return NextResponse.json({
      ok: true,
      fallback: false,
      explanation: explanation.replace(/^["']|["']$/g, ""),
    });
  } catch (e: any) {
    console.error("Price explanation route error:", e);

    return NextResponse.json({
      ok: true,
      fallback: true,
      explanation:
        "This price is indicative and based on current verified market inputs.",
    });
  }
}