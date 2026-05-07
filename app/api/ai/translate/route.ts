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
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body?.text || "").trim();
    const targetLocale = String(body?.targetLocale || "en").trim();

    if (!text) {
      return NextResponse.json({ ok: true, translatedText: "" });
    }

    if (targetLocale === "en") {
      return NextResponse.json({ ok: true, translatedText: text, source: "same-locale" });
    }

    const targetLanguage = localeNames[targetLocale] || targetLocale;

    if (!client) {
      return NextResponse.json({
        ok: true,
        translatedText: text,
        source: "fallback",
      });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a professional marketplace UI translator. Translate the user's text naturally for a real estate and construction marketplace. Preserve numbers, prices, names, URLs, emojis, and HTML tags. Return only the translated text.",
        },
        {
          role: "user",
          content: `Translate this into ${targetLanguage}:\n\n${text}`,
        },
      ],
    });

    const translatedText =
      completion.choices[0]?.message?.content?.trim() || text;

    return NextResponse.json({
      ok: true,
      translatedText,
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