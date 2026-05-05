import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

type SmartFillModule =
  | "property"
  | "material"
  | "service"
  | "rental"
  | "blog"
  | "builder_project"
  | "turnkey";

type SmartFillAction =
  | "generate_description"
  | "extract_usp"
  | "suggest_amenities"
  | "refine"
  | "generate_scope"
  | "generate_blog";

type SmartFillTone = "professional" | "luxury" | "urgent" | "friendly";

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDefaultOutputStyle(targetField: string) {
  if (targetField === "bestDealReason") {
    return "Return only 1 short best-deal reason, maximum 25 words. Do not invent market facts.";
  }

  if (targetField === "hotOfferText") {
    return "Return only 1 short promotional offer line, maximum 18 words. Do not mention discount unless provided.";
  }

  if (targetField === "emiTerms") {
    return "Return practical EMI terms in 4-6 short points. Do not write property marketing description.";
  }

  if (targetField === "amenities") {
    return "Return only relevant amenity names in suggestions. Do not invent amenities outside the provided list.";
  }

  if (targetField === "scopeOfWork") {
    return "Return a clear scope of work in bullet points with inclusions, exclusions, timeline notes, and quality checks.";
  }

  if (targetField === "sla") {
    return "Return a practical service level agreement draft with response time, completion timeline, quality assurance, and support terms.";
  }

  if (targetField === "technicalSpecs") {
    return "Return technical specifications, durability notes, use cases, load/weather suitability only if supported by input.";
  }

  if (targetField === "rentalDescription") {
    return "Return a rental-focused description covering usage, availability, condition, location, and terms without fake promises.";
  }

  if (targetField === "blogContent") {
    return "Return long-form blog/news content with title, table of contents, introduction, sections, summary, and SEO keywords.";
  }

  if (targetField === "projectDescription") {
    return "Return a builder/project description focusing on project features, location, investment potential, and verification reminders.";
  }

  return "Return a professional, SEO-friendly listing description of 180-300 words.";
}

function fallbackResponse(moduleName: string, action: string, targetField = "general") {
  return {
    ok: true,
    source: "fallback",
    module: moduleName,
    action,
    result: {
      title: "",
      description:
        targetField === "scopeOfWork"
          ? "Scope of work should include site inspection, work items, timeline, quality checks, exclusions, and final handover terms. Please verify and customize before publishing."
          : targetField === "technicalSpecs"
            ? "Please add verified technical specifications such as grade, size, durability, use case, weather suitability, and warranty/support details before publishing."
            : targetField === "emiTerms"
              ? "• Down payment and payment timeline should be clearly mentioned.\n• EMI period and installment amount must be verified.\n• Registration, deed custody, guarantor, and default terms should be clearly agreed in writing.\n• Please verify all EMI conditions before publishing."
              : "This listing is designed to present the key details clearly, professionally, and in a buyer-friendly manner. Please add exact location, price, specifications, amenities, and legal/availability details before publishing.",
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

    const targetField = safeString((attributes as any)?.targetField) || "general";
    const requiredOutputStyle =
      safeString((attributes as any)?.requiredOutputStyle) || getDefaultOutputStyle(targetField);

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
      return NextResponse.json(fallbackResponse(moduleName, action, targetField));
    }

    const prompt = `
You are the AI Smart-Fill Assistant for 3bigha.com, an Indian real estate, materials, services, rentals, turnkey, builder project, and blog/news platform.

Module: ${moduleName}
Action: ${action}
Tone: ${tone}
Target Field: ${targetField}
Required Output Style: ${requiredOutputStyle}

Input:
Title: ${title || "Not provided"}
Location: ${location || "Not provided"}
Price: ${price || "Not provided"}

Bullet Points:
${bullets.length ? bullets.map((b: string) => `- ${b}`).join("\n") : "Not provided"}

Existing Text:
${existingText || "Not provided"}

STRICT SAFETY RULES:
1. Do not invent facts.
2. Do not claim legal approval, ownership, RERA approval, road width, amenities, availability, discount, return guarantee, warranty, load capacity, or location advantage unless provided.
3. If a fact is missing, suggest the user should add or verify it.
4. Keep the output practical for Indian buyers, vendors, property owners, service providers, investors, and readers.
5. Avoid exaggerated, misleading, guaranteed, or legally risky claims.
6. Do not mix fields. If Target Field is emiTerms, do not write marketing description. If Target Field is hotOfferText, do not write long description.
7. Return ONLY valid JSON.

Return JSON in this exact shape:
{
  "title": "improved title if useful, otherwise empty string",
  "description": "field-specific output according to Target Field and Required Output Style",
  "usps": ["USP 1", "USP 2", "USP 3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "moderation": {
    "safe": true,
    "warnings": ["warning if any unsupported or risky claim is detected"]
  }
}

Module guidance:
- property: focus on location, usability, investment potential, price clarity, amenities, and legal verification reminders.
- builder_project: focus on project features, unit availability, amenities, location, buyer confidence, and verification reminders.
- material: focus on technical specs, durability, grade, size, use case, load-bearing relevance, and weather resistance only if supported.
- service: focus on scope of work, deliverables, timeline, exclusions, SLA-style clarity, and service quality.
- turnkey: focus on scope of work, package inclusions, timeline, milestones, handover, and quality checks.
- rental: focus on availability, usage, condition, rental period, location, maintenance, and usage terms.
- blog: generate useful table of contents, intro, headings, sections, conclusion, summary, and SEO keywords.
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "You generate safe, truthful, field-specific structured JSON for marketplace content. Never hallucinate facts.",
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
      targetField,
      result: parsed,
    });
  } catch (error: any) {
    const message = error?.message || "AI Smart-Fill failed.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}