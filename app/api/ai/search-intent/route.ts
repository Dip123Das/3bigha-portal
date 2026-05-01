import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SearchModule = "all" | "property" | "materials" | "services" | "rentals" | "blog";
type PropertyIntent = "all" | "sell" | "rent" | "lease" | "pg";

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function parseLooseAmount(text: string) {
  const s = text.toLowerCase();

  const match =
    s.match(/(?:under|below|within|upto|up to|less than|max|maximum)\s*(?:rs\.?|₹)?\s*([\d.]+)\s*(crore|cr|lakh|lac|k|thousand)?/) ||
    s.match(/(?:rs\.?|₹)\s*([\d.]+)\s*(crore|cr|lakh|lac|k|thousand)?/);

  if (!match) return null;

  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return null;

  const unit = match[2] || "";
  if (unit === "crore" || unit === "cr") return Math.round(raw * 10000000);
  if (unit === "lakh" || unit === "lac") return Math.round(raw * 100000);
  if (unit === "k" || unit === "thousand") return Math.round(raw * 1000);

  return Math.round(raw);
}

function fallbackIntent(query: string) {
  const q = safeText(query);
  const lower = q.toLowerCase();

  let module: SearchModule = "all";

  if (/(land|plot|flat|house|property|katha|bigha|sq\.?ft|apartment|builder)/i.test(q)) {
    module = "property";
  } else if (/(cement|steel|sand|brick|rod|tiles|paint|plumbing material|electrical material|material)/i.test(q)) {
    module = "materials";
  } else if (/(mason|plumber|electrician|contractor|labour|labor|service|turnkey|interior|painter)/i.test(q)) {
    module = "services";
  } else if (/(jcb|machine|rental|rent equipment|equipment rent|generator|scaffolding)/i.test(q)) {
    module = "rentals";
  } else if (/(blog|article|guide|news|learn)/i.test(q)) {
    module = "blog";
  }

  let intent: PropertyIntent = "all";
  if (/(pg|paying guest)/i.test(q)) intent = "pg";
  else if (/(lease|leased)/i.test(q)) intent = "lease";
  else if (/(rent|rental|to let|monthly)/i.test(q)) intent = "rent";
  else if (/(buy|sale|sell|purchase|plot|land|flat|house)/i.test(q)) intent = "sell";

  const max = parseLooseAmount(lower);

  const cleanedQuery = q
    .replace(/(?:under|below|within|upto|up to|less than|max|maximum)\s*(?:rs\.?|₹)?\s*[\d.]+\s*(?:crore|cr|lakh|lac|k|thousand)?/gi, "")
    .replace(/\bnear me\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    ok: true,
    source: "fallback",
    query: cleanedQuery || q,
    module,
    intent,
    min: "",
    max: max ? String(max) : "",
    near: /\b(near me|nearby|around me)\b/i.test(q),
    confidence: 0.55,
    explanation: "Smart search understood your query using fallback rules.",
  };
}

function normalizeAiJson(text: string, originalQuery: string) {
  const cleaned = text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  const allowedModules = new Set(["all", "property", "materials", "services", "rentals", "blog"]);
  const allowedIntents = new Set(["all", "sell", "rent", "lease", "pg"]);

  const module = allowedModules.has(parsed?.module) ? parsed.module : "all";
  const intent = allowedIntents.has(parsed?.intent) ? parsed.intent : "all";

  return {
    ok: true,
    source: "ai",
    query: safeText(parsed?.query) || originalQuery,
    module,
    intent,
    min: safeText(parsed?.min),
    max: safeText(parsed?.max),
    near: Boolean(parsed?.near),
    confidence: Number.isFinite(Number(parsed?.confidence)) ? Number(parsed.confidence) : 0.75,
    explanation: safeText(parsed?.explanation) || "Smart search understood your query.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = safeText(body?.query).slice(0, 300);

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Search query is required." },
        { status: 400 }
      );
    }

    const fallback = fallbackIntent(query);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are the AI search-intent parser for 3bigha.com, a local marketplace for property, materials, services, rentals, blogs, RFQs and construction-related discovery.

Convert the user's natural-language search into strict JSON.

Allowed module values:
all, property, materials, services, rentals, blog

Allowed property intent values:
all, sell, rent, lease, pg

Rules:
- Do not invent facts.
- Keep query short and useful for database keyword search.
- Detect price limits like "under 10 lakh" as max = "1000000".
- Detect "near me", "nearby", "around me" as near = true.
- If query is about land, plot, flat, house, builder project: module property.
- If query is about cement, steel, sand, bricks, tiles, paint, plumbing or electrical goods: module materials.
- If query is about mason, plumber, electrician, labour, contractor, turnkey, repair: module services.
- If query is about JCB, equipment, machine, generator, scaffolding on rent: module rentals.
- If unsure, use module all.
- Return JSON only.

JSON shape:
{
  "query": "clean search phrase",
  "module": "all",
  "intent": "all",
  "min": "",
  "max": "",
  "near": false,
  "confidence": 0.8,
  "explanation": "one short user-facing sentence"
}

User search:
${query}
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
        temperature: 0.1,
        max_output_tokens: 260,
      }),
    });

    const aiJson = await aiRes.json();
    const text = extractText(aiJson);

    if (!aiRes.ok || !text.trim()) {
      return NextResponse.json(fallback);
    }

    try {
      return NextResponse.json(normalizeAiJson(text, query));
    } catch {
      return NextResponse.json(fallback);
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI search assistant failed." },
      { status: 500 }
    );
  }
}
