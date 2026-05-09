import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function fallbackDraft(text: string) {
  const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(bags?|kg|tons?|tonnes?|cft|sqft|pieces?|pcs|units?|loads?)/i);

  const guessedItem =
    text.toLowerCase().includes("cement")
      ? "cement"
      : text.toLowerCase().includes("steel") || text.toLowerCase().includes("tmt")
      ? "TMT steel"
      : text.toLowerCase().includes("sand")
      ? "sand"
      : text.toLowerCase().includes("brick")
      ? "bricks"
      : "";

  return {
    title: text.slice(0, 80),
    category: guessedItem ? "Construction Materials" : "General Procurement",
    intent: text,
    estimatedBudget: null,
    timeline: text.toLowerCase().includes("urgent") ? "Urgent" : "Immediate",
    procurementAdvice: [
      "Compare multiple vendors before finalizing.",
      "Share exact quantity and delivery location.",
      "Prefer verified suppliers.",
    ],
    negotiationTips: [
      "Ask whether transport and unloading are included.",
      "Compare delivery timelines before confirming.",
      "Ask for GST invoice and final landed price.",
    ],
    items: guessedItem
      ? [
          {
            item: guessedItem,
            qty: qtyMatch?.[1] ? Number(qtyMatch[1]) : "",
            unit: qtyMatch?.[2] || "",
          },
        ]
      : [],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const text =
      body?.text ||
      body?.query ||
      body?.requirement ||
      "";

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Requirement text is required.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        rfq: fallbackDraft(text),
      });
    }

    const prompt = `
You are an AI procurement RFQ drafting engine for a smart marketplace.

Analyze the buyer requirement and generate a structured procurement RFQ.

Return STRICT JSON ONLY.

Required JSON format:

{
  "title": "short RFQ title",
  "category": "best procurement category",
  "intent": "buyer intent summary",
  "estimatedBudget": null,
  "timeline": "expected timeline",
  "procurementAdvice": [
    "tip 1",
    "tip 2"
  ],
  "negotiationTips": [
    "tip 1",
    "tip 2"
  ],
  "items": [
    {
      "item": "cement",
      "qty": 100,
      "unit": "bags"
    }
  ]
}

Buyer Requirement:
${text}
`;

    const aiRes = await fetch(
      "https://api.openai.com/v1/responses",
      {
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
        }),
      }
    );

    const json = await aiRes.json();

    const textOut = extractText(json);

    let rfq = fallbackDraft(text);

    try {
      rfq = JSON.parse(textOut);
    } catch {}

    return NextResponse.json({
      ok: true,
      source: "ai-rfq-generator",
      rfq,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "AI RFQ generator failed.",
      },
      { status: 500 }
    );
  }
}