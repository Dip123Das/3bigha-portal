import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlertMessage = {
  role?: string;
  body?: string;
};

type AlertResponse = {
  alert: boolean;
  severity: "low" | "medium" | "high";
  audience: "buyer" | "vendor" | "both";
  title: string;
  insight: string;
  actionLabel: string;
  actionMessage: string;
};

function fallbackAlert(): AlertResponse {
  return {
    alert: false,
    severity: "medium",
    audience: "both",
    title: "Deal Activity Detected",
    insight:
      "Conversation is active. More price, quantity, delivery and confirmation details may be needed.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function heuristicAlert(messages: AlertMessage[]): AlertResponse {
  const text = messages
    .map((m) => `${m.role || "user"}: ${m.body || ""}`)
    .join("\n")
    .toLowerCase();

  let score = 20;

  if (text.includes("final price") || text.includes("best price")) score += 20;
  if (text.includes("confirm") || text.includes("confirmed")) score += 25;
  if (text.includes("delivery") || text.includes("dispatch")) score += 15;
  if (text.includes("today") || text.includes("tomorrow") || text.includes("urgent")) score += 20;
  if (text.includes("quantity") || text.includes("qty") || /\d+/.test(text)) score += 10;
  if (text.includes("payment") || text.includes("advance") || text.includes("bill")) score += 15;
  if (text.includes("call me") || text.includes("whatsapp")) score += 8;

  if (score >= 75) {
    return {
      alert: true,
      severity: "high",
      audience: "both",
      title: "High Intent Buyer Detected",
      insight:
        "This conversation shows strong closing signals. Respond quickly and confirm final terms safely.",
      actionLabel: "Send Closing Message",
      actionMessage:
        "Please confirm final price, quantity, delivery address, delivery time and bill details so we can proceed safely.",
    };
  }

  if (score >= 50) {
    return {
      alert: true,
      severity: "medium",
      audience: "both",
      title: "Active Deal Opportunity",
      insight:
        "This deal is moving forward but final details are still missing.",
      actionLabel: "Ask Final Details",
      actionMessage:
        "Please confirm final price, quantity, delivery location and delivery timeline.",
    };
  }

  return fallbackAlert();
}

function normalizeAlert(value: unknown, fallback: AlertResponse): AlertResponse {
  if (!value || typeof value !== "object") return fallback;

  const row = value as Partial<AlertResponse>;
  const severity =
    row.severity === "high" || row.severity === "medium" || row.severity === "low"
      ? row.severity
      : fallback.severity;

  const audience =
    row.audience === "buyer" || row.audience === "vendor" || row.audience === "both"
      ? row.audience
      : fallback.audience;

  return {
    alert: Boolean(row.alert ?? fallback.alert),
    severity,
    audience,
    title: String(row.title || fallback.title).slice(0, 70),
    insight: String(row.insight || fallback.insight).slice(0, 220),
    actionLabel: String(row.actionLabel || fallback.actionLabel).slice(0, 50),
    actionMessage: String(row.actionMessage || fallback.actionMessage).slice(0, 220),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const side = String(body?.side || "buyer").toLowerCase();

    const messages: AlertMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    const fallback = heuristicAlert(messages);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || messages.length === 0) {
      return NextResponse.json({
        ok: true,
        source: "heuristic",
        side,
        ...fallback,
      });
    }

    const context = messages
      .map((m) => `${String(m.role || "user")}: ${String(m.body || "").slice(0, 500)}`)
      .join("\n");

    const prompt = `
You are the AI deal alert engine of 3bigha.com.

Detect whether this buyer-vendor conversation needs an alert.

Return only valid JSON:
{
  "alert": true,
  "severity": "high",
  "audience": "both",
  "title": "High Intent Buyer Detected",
  "insight": "Short insight under 180 characters.",
  "actionLabel": "Send Closing Message",
  "actionMessage": "Short safe next message."
}

Audience rules:
- vendor: alert vendor when buyer is serious or waiting.
- buyer: alert buyer when vendor is responsive or final details are missing.
- both: use when both sides should act.

Safety:
- Do not assume payment is completed.
- Do not mention AI.
- Push confirmation of final terms before payment.

Current side: ${side}

Chat:
${context}
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
        temperature: 0.2,
        max_output_tokens: 260,
      }),
    });

    const aiJson = await aiRes.json().catch(() => ({}));
    const raw = extractText(aiJson).trim();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      ok: true,
      source: parsed ? "ai+heuristic" : "heuristic",
      side,
      ...normalizeAlert(parsed, fallback),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "catch-fallback",
      side: "buyer",
      ...fallbackAlert(),
    });
  }
}