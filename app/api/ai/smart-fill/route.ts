import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

type SmartFillModule = "property" | "material" | "service" | "rental" | "blog";
type SmartFillAction =
  | "generate_description"
  | "extract_usp"
  | "suggest_amenities"
  | "refine";

type SmartFillTone = "professional" | "luxury" | "urgent" | "friendly";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackResponse(moduleName: string, action: string) {
  return {
    ok: true,
    source: "fallback",
    result: {
      title: "",
      description:
        "This listing is designed to present the key details clearly, professionally, and in a buyer-friendly manner. Please add exact location, price, specifications, amenities, and legal/availability details before publishing.",
      usps: [
        "Clear and buyer-focused presentation",
        "Important details can be highlighted",
        "Suitable for professional listing use",
      ],
      suggestions: [
        "Add exact location",
        "Add price or price range",
        "Add verified specifications",
        "Avoid unsupported claims",
      ],
      moderation: {
        safe: true,
        warnings: [
          "Fallback used because AI service is unavailable.",
          "Please verify all facts before publishing.",
        ],
      },
    },
    module: moduleName,
    action,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const moduleName = safeString(body?.module) as SmartFillModule;
    const action = safeString(body?.action) as SmartFillAction;
    const tone = (safeString(body?.tone) || "professional") as SmartFillTone;
    const input = body?.input || {};

    const title = safeString(input?.title);
    const existingText = safeString(input?.existingText);
    const location = safeString(input?.location);
    const price = safeString(input?.price);

    const attributes =
      input?.attributes && typeof input.attributes === "object" ? input.attributes : {};

    const targetField = safeString((attributes as any)?.targetField);
    const requiredOutputStyle = safeString((attributes as any)?.requiredOutputStyle);
    const bullets: string[] = Array.isArray(input?.bullets)
        ? (input.bullets as unknown[])
            .map((x: unknown): string => safeString(x))
            .filter((x: string) => Boolean(x))
        : [];

    if (!moduleName || !action) {
      return NextResponse.json(
        { ok: false, error: "module and action are required." },
        { status: 400 }
      );
    }

    if (!client) {
      return NextResponse.json(fallbackResponse(moduleName, action));
    }

    const prompt = `
You are the AI Smart-Fill Assistant for 3bigha.com, an Indian real estate, materials, services, rentals, and blog platform.

Module: ${moduleName}
Action: ${action}
Tone: ${tone}
Target Field: ${targetField || "general"}
Required Output Style: ${requiredOutputStyle || "Use normal listing assistant output."}

Input:
Title: ${title || "Not provided"}
Location: ${location || "Not provided"}
Price: ${price || "Not provided"}
Bullet Points:
${bullets.length ? bullets.map((b: string) => `- ${b}`).join("\n") : "Not provided"}

Existing Text:
${existingText || "Not provided"}

STRICT RULES:
1. Do not invent facts.
2. Do not claim legal approval, ownership, RERA approval, road width, amenities, availability, discount, or location advantage unless provided.
3. If a fact is missing, suggest the user should add it.
4. Keep the output practical for Indian buyers/vendors.
5. Avoid exaggerated or misleading claims.
6. Return ONLY valid JSON.

Return JSON in this exact shape:
{
  "title": "improved title if useful, otherwise empty string",
  "description": "field-specific output. If Target Field is bestDealReason, write only a short best-deal reason. If hotOfferText, write only a short offer line. If emiTerms, write practical EMI terms only. If general, write professional listing text.",
  "usps": ["USP 1", "USP 2", "USP 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "moderation": {
    "safe": true,
    "warnings": ["warning if any unsupported claim is detected"]
  }
}

Category guidance:
- property: focus on location, investment potential, usability, legal verification reminders.
- material: focus on durability, use case, load-bearing relevance, weather resistance only if supported.
- service: focus on scope of work, timeline, service quality, SLA-style clarity.
- rental: focus on availability, suitability, location, usage terms.
- blog: generate useful structure, intro, summary, and reader-focused points.
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You generate safe, truthful, structured JSON for listing assistance. Never hallucinate facts.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      ok: true,
      source: "openai",
      module: moduleName,
      action,
      result: parsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AI Smart-Fill failed.",
      },
      { status: 500 }
    );
  }
}