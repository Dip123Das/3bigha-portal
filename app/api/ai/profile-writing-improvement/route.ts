import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WritingTarget =
  | "about_person"
  | "about_business"
  | "author_bio";

type WritingTone =
  | "simple"
  | "professional"
  | "friendly"
  | "trust_building"
  | "short"
  | "detailed";

type WritingLanguage =
  | "English"
  | "Bengali"
  | "Hindi";

const ALLOWED_TARGETS: WritingTarget[] = [
  "about_person",
  "about_business",
  "author_bio",
];

const ALLOWED_TONES: WritingTone[] = [
  "simple",
  "professional",
  "friendly",
  "trust_building",
  "short",
  "detailed",
];

const ALLOWED_LANGUAGES: WritingLanguage[] = [
  "English",
  "Bengali",
  "Hindi",
];

const TARGET_LABELS: Record<WritingTarget, string> = {
  about_person: "personal introduction",
  about_business: "business introduction",
  author_bio: "author biography",
};

const TONE_INSTRUCTIONS: Record<WritingTone, string> = {
  simple:
    "Use clear, simple and easy-to-understand language.",
  professional:
    "Use polished, credible and professional business language.",
  friendly:
    "Use warm, welcoming and approachable language.",
  trust_building:
    "Use honest, reassuring and trust-building language without exaggeration.",
  short:
    "Keep the result concise while preserving every important fact.",
  detailed:
    "Organise the supplied facts into a fuller description without adding any new fact.",
};

function isWritingTarget(
  value: unknown
): value is WritingTarget {
  return ALLOWED_TARGETS.includes(
    value as WritingTarget
  );
}

function isWritingTone(
  value: unknown
): value is WritingTone {
  return ALLOWED_TONES.includes(
    value as WritingTone
  );
}

function isWritingLanguage(
  value: unknown
): value is WritingLanguage {
  return ALLOWED_LANGUAGES.includes(
    value as WritingLanguage
  );
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  const parts =
    record.output
      ?.flatMap((item) =>
        Array.isArray(item?.content)
          ? item.content
          : []
      )
      .map((content) =>
        typeof content?.text === "string"
          ? content.text
          : ""
      )
      .filter(Boolean) || [];

  return parts.join("\n");
}

function cleanImprovedText(value: string): string {
  let text = value.trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  text = text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return text;
}

export async function POST(request: Request) {
  try {
    const supabase =
      getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please sign in before using AI writing assistance.",
        },
        { status: 401 }
      );
    }

    const body = await request
      .json()
      .catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const bodyRecord = body as Record<
      string,
      unknown
    >;

    const target = bodyRecord.target;
    const tone = bodyRecord.tone;
    const language = bodyRecord.language;
    const sourceText =
      typeof bodyRecord.sourceText === "string"
        ? bodyRecord.sourceText.trim()
        : "";

    if (!isWritingTarget(target)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The selected writing section is invalid.",
        },
        { status: 400 }
      );
    }

    if (!isWritingTone(tone)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The selected writing style is invalid.",
        },
        { status: 400 }
      );
    }

    if (!isWritingLanguage(language)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The selected language is invalid.",
        },
        { status: 400 }
      );
    }

    if (sourceText.length < 3) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please write a few facts before asking AI to improve them.",
        },
        { status: 400 }
      );
    }

    if (sourceText.length > 3000) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please keep the text within 3,000 characters.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "AI writing assistance is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    const prompt = `
You are the Human-First Business Identity Writing Assistant of 3bigha.com.

Your task is to improve a user's ${TARGET_LABELS[target]}.

FINAL LANGUAGE:
${language}

WRITING STYLE:
${TONE_INSTRUCTIONS[tone]}

ABSOLUTE FACTUAL RULES:
- Use only the facts present in the user's original text.
- Never invent, assume, estimate or imply any new fact.
- Do not add years of experience unless explicitly supplied.
- Do not add qualifications, licences, registrations or certifications unless explicitly supplied.
- Do not add awards, achievements, project counts, customer counts, employee counts or turnover unless explicitly supplied.
- Do not add service areas, delivery coverage, locations, products or capabilities unless explicitly supplied.
- Do not claim that the user or business is verified, trusted, leading, renowned, authorised or government-approved unless explicitly supplied.
- Do not convert a possibility into a confirmed fact.
- Do not exaggerate.
- Preserve names, numbers, locations, dates and business facts accurately.
- You may improve grammar, clarity, structure, tone and readability only.
- When translating, preserve the exact meaning and all facts.
- Do not mention AI.
- Do not include analysis, headings, quotation marks, notes or explanations.
- Return only the improved final text.

ORIGINAL USER TEXT:
${sourceText}
`;

    const aiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ||
            "gpt-4.1-mini",
          input: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_output_tokens: 900,
        }),
        cache: "no-store",
      }
    );

    const aiPayload = await aiResponse
      .json()
      .catch(() => null);

    if (!aiResponse.ok) {
      console.error(
        "Profile writing improvement failed:",
        aiResponse.status,
        aiPayload
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "AI writing assistance is temporarily unavailable.",
        },
        { status: 502 }
      );
    }

    const improvedText = cleanImprovedText(
      extractText(aiPayload)
    );

    if (!improvedText) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "AI could not prepare an improved version. Please try again.",
        },
        { status: 502 }
      );
    }

    if (improvedText.length > 5000) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The prepared version was unexpectedly long. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      improvedText,
      target,
      tone,
      language,
      approvalRequired: true,
      source: "openai_profile_writing_improvement",
    });
  } catch (error: unknown) {
    console.error(
      "Profile writing improvement route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "AI writing assistance is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
