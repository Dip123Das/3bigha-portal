import { createHash } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { isValidLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
    : null;

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

function hashText(text: string) {
  return createHash("sha256").update(text.trim()).digest("hex");
}

async function getCachedTranslations(locale: string, texts: string[]) {
  if (!supabase || !texts.length) return new Map<string, string>();

  const hashes = texts.map(hashText);

  const { data } = await supabase
    .from("ai_translations")
    .select("source_text_hash, source_text, translated_text")
    .eq("locale", locale)
    .in("source_text_hash", hashes);

  const map = new Map<string, string>();

  (data || []).forEach((row: any) => {
    const source = String(row.source_text || "").trim();
    const translated = String(row.translated_text || "").trim();
    if (translated && translated !== source) {
      map.set(String(row.source_text_hash), translated);
    }
  });

  return map;
}

async function saveTranslations(
  locale: string,
  originals: string[],
  translations: string[]
) {
  if (!supabase || !originals.length) return;

  const rows = originals.flatMap((text, index) => {
    const translated = String(translations[index] || "").trim();
    if (!translated || translated === text.trim()) return [];
    return [{
      locale,
      source_text_hash: hashText(text),
      source_text: text,
      translated_text: translated,
    }];
  });

  if (!rows.length) return;

  await supabase
    .from("ai_translations")
    .upsert(rows, { onConflict: "locale,source_text_hash" });
}

async function translateWithOpenAI(texts: string[], targetLanguage: string) {
  if (!client) throw new Error("TRANSLATION_NOT_CONFIGURED");
  if (!texts.length) return [];

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
          texts,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== texts.length || parsed.some((x) => typeof x !== "string" || !x.trim())) {
      throw new Error("TRANSLATION_RESPONSE_INVALID");
    }
    return parsed.map((x) => String(x).trim());
  } catch {
    throw new Error("TRANSLATION_RESPONSE_INVALID");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const text = String(body?.text || "").trim().slice(0, 2000);
    const texts = Array.isArray(body?.texts)
      ? body.texts.map((x: unknown) => String(x || "").trim()).filter(Boolean)
      : [];

    const targetLocale = String(body?.targetLocale || "en").trim();

    if (!isValidLocale(targetLocale)) {
      return NextResponse.json({ ok: false, error: "Unsupported language." }, { status: 400 });
    }

    if (targetLocale === "en") {
      return NextResponse.json({
        ok: true,
        translatedText: text,
        translatedTexts: texts,
        source: "same-locale",
      });
    }

    const targetLanguage = localeNames[targetLocale] || targetLocale;

    if (texts.length) {
      const limitedTexts = texts.slice(0, 80).map((item: string) => item.slice(0, 2000));

      const cached = await getCachedTranslations(targetLocale, limitedTexts);

      const finalTranslations: string[] = [];
      const missingTexts: string[] = [];
      const missingIndexes: number[] = [];

      limitedTexts.forEach((item: string, index: number) => {
        const cachedText = cached.get(hashText(item));

        if (cachedText) {
          finalTranslations[index] = cachedText;
        } else {
          missingTexts.push(item);
          missingIndexes.push(index);
        }
      });

      if (missingTexts.length) {
        if (!client) {
          return NextResponse.json(
            { ok: false, error: "Translation is temporarily unavailable." },
            { status: 503 }
          );
        }

        const translatedMissing = await translateWithOpenAI(
          missingTexts,
          targetLanguage
        );

        await saveTranslations(targetLocale, missingTexts, translatedMissing);

        translatedMissing.forEach((item: string, index: number) => {
          finalTranslations[missingIndexes[index]] = item || missingTexts[index];
        });
      }

      return NextResponse.json({
        ok: true,
        translatedTexts: limitedTexts.map(
          (_item: string, index: number) =>
            finalTranslations[index] || limitedTexts[index]
        ),
        source: missingTexts.length ? "openai+cache" : "cache",
      });
    }

    if (!text) {
      return NextResponse.json({ ok: true, translatedText: "" });
    }

    const cached = await getCachedTranslations(targetLocale, [text]);
    const cachedText = cached.get(hashText(text));

    if (cachedText) {
      return NextResponse.json({
        ok: true,
        translatedText: cachedText,
        source: "cache",
      });
    }

    if (!client) {
      return NextResponse.json(
        { ok: false, error: "Translation is temporarily unavailable." },
        { status: 503 }
      );
    }

    const translated = (await translateWithOpenAI([text], targetLanguage))[0];

    await saveTranslations(targetLocale, [text], [translated]);

    return NextResponse.json({
      ok: true,
      translatedText: translated,
      source: "openai+cache",
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
