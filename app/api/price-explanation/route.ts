import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey);
}

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function makeCacheKey(input: {
  item: string;
  location: string;
  trend: string;
  changePercent: number | null;
  sources: number;
  confidence: number;
  unit: string;
  priceMin: number;
  priceMax: number;
}) {
  const raw = JSON.stringify(input).toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: Request) {
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

  const cacheInput = {
    item,
    location,
    trend,
    changePercent,
    sources,
    confidence,
    unit,
    priceMin,
    priceMax,
  };

  const cacheKey = makeCacheKey(cacheInput);

  const fallbackExplanation =
    sources <= 1
      ? `${item} price in ${location} is indicative because more verified local sources are needed for stronger market intelligence.`
      : `${item} price in ${location} is based on current verified market inputs and recent price movement.`;

  try {
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { data: cached } = await supabase
        .from("price_ai_explanations")
        .select("explanation")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      if (cached?.explanation) {
        return NextResponse.json({
          ok: true,
          cached: true,
          explanation: cached.explanation,
        });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        cached: false,
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
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
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

    const explanation =
      aiRes.ok && extractText(aiJson).trim()
        ? extractText(aiJson).trim().replace(/^["']|["']$/g, "")
        : fallbackExplanation;

    if (supabase) {
      await supabase.from("price_ai_explanations").upsert(
        {
          cache_key: cacheKey,
          item,
          location,
          trend,
          change_percent: changePercent,
          sources,
          confidence,
          unit,
          price_min: priceMin,
          price_max: priceMax,
          explanation,
        },
        { onConflict: "cache_key" }
      );
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      explanation,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      cached: false,
      fallback: true,
      explanation: fallbackExplanation,
    });
  }
}