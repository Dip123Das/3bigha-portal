import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

const localeNames: Record<string, string> = {
  en: "English",
  bn: "Bengali",
  hi: "Hindi",
  as: "Assamese",
  or: "Odia",
  gu: "Gujarati",
  mr: "Marathi",
  pa: "Punjabi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  ur: "Urdu",
  ne: "Nepali",
  sa: "Sanskrit",
  kok: "Konkani",
  mai: "Maithili",
  mni: "Manipuri",
  sd: "Sindhi",
  ks: "Kashmiri",
  doi: "Dogri",
  sat: "Santali",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const text = String(body?.text || "").trim();
    const texts = Array.isArray(body?.texts)
      ? body.texts.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : [];

    const targetLocale = String(body?.targetLocale || "en").trim();

    if (targetLocale === "en") {
      if (texts.length) {
        return NextResponse.json({
          ok: true,
          translatedTexts: texts,
          source: "same-locale",
        });
      }

      return NextResponse.json({
        ok: true,
        translatedText: text,
        source: "same-locale",
      });
    }

    const targetLanguage = localeNames[targetLocale] || targetLocale;

    if (!client) {
      return NextResponse.json({
        ok: true,
        translatedText: text,
        translatedTexts: texts,
        source: "fallback",
      });
    }

    if (texts.length) {
      const limitedTexts = texts.slice(0, 80);

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a professional marketplace UI translator for a real estate and construction platform. Translate each item naturally. Preserve numbers, prices, brand names, place names, URLs, emojis, and symbols. Return ONLY a valid JSON array of translated strings in the same order.",
          },
          {
            role: "user",
            content: JSON.stringify({
              targetLanguage,
              texts: limitedTexts,
            }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "[]";

      let translatedTexts: string[] = [];

      try {
        const parsed = JSON.parse(raw);
        translatedTexts = Array.isArray(parsed)
          ? parsed.map((x) => String(x || ""))
          : [];
      } catch {
        translatedTexts = limitedTexts;
      }

      return NextResponse.json({
        ok: true,
        translatedTexts:
          translatedTexts.length === limitedTexts.length
            ? translatedTexts
            : limitedTexts,
        source: "openai",
      });
    }

    if (!text) {
      return NextResponse.json({ ok: true, translatedText: "" });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a professional marketplace UI translator. Translate naturally. Preserve numbers, prices, names, URLs, emojis, and HTML tags. Return only translated text.",
        },
        {
          role: "user",
          content: `Translate this into ${targetLanguage}:\n\n${text}`,
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      translatedText: completion.choices[0]?.message?.content?.trim() || text,
      source: "openai",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Translation failed.",
      },
      { status: 500 }
    );
  }
}