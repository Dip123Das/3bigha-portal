import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function txt(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function heuristicRfqIntelligence(body: any) {
  const title = txt(body?.title);
  const description = txt(body?.description);
  const module = txt(body?.module) || "marketplace";
  const category = txt(body?.category) || null;
  const city = txt(body?.city);
  const locality = txt(body?.locality);
  const pincode = txt(body?.pincode);
  const quantity = txt(body?.quantity) || txt(body?.qty);
  const budget = num(body?.budget || body?.expectedBudget, 0);
  const urgency = txt(body?.urgency).toLowerCase();

  const missingInformation: string[] = [];

  if (!title) missingInformation.push("RFQ title is missing.");
  if (description.length < 30) missingInformation.push("Add a clearer requirement description.");
  if (!category) missingInformation.push("Category is missing.");
  if (!city && !locality && !pincode) missingInformation.push("Delivery/service location is missing.");
  if (!quantity) missingInformation.push("Quantity or scope is missing.");
  if (!budget) missingInformation.push("Expected budget is missing.");
  if (!urgency) missingInformation.push("Urgency/timeline is missing.");

  let score = 100;
  score -= missingInformation.length * 10;
  if (description.length < 80) score -= 10;
  if (!city && !pincode) score -= 8;
  if (!quantity) score -= 12;
  if (!budget) score -= 8;

  score = Math.max(20, Math.min(100, score));

  const expectedReplies =
    score >= 85 ? "8–12" : score >= 70 ? "5–8" : score >= 50 ? "3–5" : "1–3";

  const closureProbability =
    score >= 85 ? 78 : score >= 70 ? 62 : score >= 50 ? 42 : 25;

  const urgencyAnalysis =
    urgency === "high" || urgency === "urgent"
      ? "Urgency is high. Fast-response vendors should be prioritized over only lowest price."
      : urgency
        ? "Urgency is clear enough for vendor response."
        : "Timeline is unclear. Add expected delivery/service date to improve response quality.";

  const budgetRealism =
    budget > 0
      ? "Budget is provided. Compare with vendor quotes and market price before closing."
      : "Budget is not provided. Vendors may respond with wide price variation.";

  const improvementSuggestions = [
    !quantity ? "Add exact quantity, area, size, or scope." : "",
    !city && !pincode ? "Add delivery/service location with pincode." : "",
    description.length < 80 ? "Add brand, grade, size, specification, preferred timeline and payment terms." : "",
    !budget ? "Add expected budget or price range if available." : "",
  ].filter(Boolean);

  return {
    ok: true,
    source: "heuristic",
    module,
    category,
    rfqHealthScore: Math.round(score),
    expectedVendorReplies: expectedReplies,
    expectedClosureProbability: closureProbability,
    missingInformation,
    urgencyAnalysis,
    budgetRealism,
    improvementSuggestions,
    recommendedAction:
      score >= 75
        ? "RFQ is strong enough to send to vendors."
        : "Improve the missing details before sending to more vendors.",
    aiSummary:
      description || title
        ? `RFQ appears to be about ${category || module}. Current quality score is ${Math.round(score)}/100.`
        : "RFQ data is limited. Add more information for better vendor matching.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fallback = heuristicRfqIntelligence(body);

    if (!openai) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are RFQ Intelligence AI for 3bigha.com.

3bigha.com is an Indian marketplace for property, building materials, services, rentals and construction-related RFQs.

Return ONLY valid JSON in this exact shape:

{
  "ok": true,
  "source": "openai",
  "module": "string",
  "category": "string or null",
  "rfqHealthScore": number,
  "expectedVendorReplies": "string",
  "expectedClosureProbability": number,
  "missingInformation": ["string"],
  "urgencyAnalysis": "string",
  "budgetRealism": "string",
  "improvementSuggestions": ["string"],
  "recommendedAction": "string",
  "aiSummary": "string"
}

Rules:
- rfqHealthScore must be 0 to 100.
- expectedClosureProbability must be 0 to 100.
- Do not invent unavailable facts.
- Be practical for Indian construction and real-estate marketplace users.
- Missing information should be actionable.
- If RFQ data is weak, say so clearly.

Input JSON:
${JSON.stringify(body).slice(0, 10000)}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = safeJsonParse(completion.choices[0]?.message?.content || "");

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(fallback);
    }

    return NextResponse.json({
      ...fallback,
      ...parsed,
      ok: true,
      source: "openai",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "RFQ Intelligence AI failed.",
      },
      { status: 500 }
    );
  }
}