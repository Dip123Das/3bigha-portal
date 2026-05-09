import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hoursSince(value?: string | null) {
  if (!value) return 999;
  const n = new Date(value).getTime();
  if (!Number.isFinite(n)) return 999;
  return Math.max(0, (Date.now() - n) / (1000 * 60 * 60));
}

function fallbackAutoAction(body: any) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const lastActivityAt = body?.lastActivityAt || body?.updated_at || null;
  const unreadCount = safeNumber(body?.unreadCount);
  const procurementScore = safeNumber(body?.procurementScore, 50);
  const timelineScore = safeNumber(body?.timelineScore, 50);
  const side = String(body?.side || "platform").toLowerCase();
  const module = String(body?.module || body?.contextType || "rfq").toLowerCase();

  const text = messages
    .map((m: any) => String(m?.body || m?.content || ""))
    .join(" ")
    .toLowerCase();

  const ageHours = hoursSince(lastActivityAt);

  const hasPrice = /₹|rs\.?|price|rate|quote|amount|total|cost/.test(text);
  const hasDelivery = /delivery|deliver|timeline|date|today|tomorrow|days|schedule/.test(text);
  const hasPayment = /payment|advance|upi|cash|bank|gst|invoice|bill/.test(text);
  const hasCommitment = /confirm|final|ok|done|accept|agree|book|ready/.test(text);
  const hasRisk = /delay|issue|problem|cancel|unavailable|not possible|dispute/.test(text);

  const actionScore = clamp(
    25 +
      procurementScore * 0.25 +
      timelineScore * 0.25 +
      (unreadCount > 0 ? 18 : 0) +
      (hasCommitment ? 15 : 0) +
      (hasPrice ? 8 : 0) +
      (hasDelivery ? 8 : 0) -
      (hasRisk ? 15 : 0) -
      (ageHours > 72 ? 5 : 0)
  );

  const autoActionType =
    hasRisk || ageHours > 72
      ? "escalate"
      : unreadCount > 0
      ? "reply"
      : hasCommitment
      ? "close_milestone"
      : hasPrice && hasDelivery && !hasPayment
      ? "payment_reminder"
      : ageHours > 48
      ? "follow_up"
      : "monitor";

  const priority =
    autoActionType === "escalate"
      ? "Critical"
      : autoActionType === "reply" || autoActionType === "close_milestone"
      ? "High"
      : autoActionType === "follow_up" || autoActionType === "payment_reminder"
      ? "Medium"
      : "Low";

  const suggestedMessage =
    autoActionType === "reply"
      ? side === "vendor"
        ? "Thank you. Please confirm quantity, delivery location, final price, GST/invoice and payment terms so I can proceed."
        : "Please confirm your final price, delivery timeline, GST/invoice and payment terms."
      : autoActionType === "follow_up"
      ? "Following up on this procurement discussion. Please share the latest price, availability and delivery timeline."
      : autoActionType === "payment_reminder"
      ? "Please confirm advance amount, balance payment timing, GST/invoice and billing method."
      : autoActionType === "close_milestone"
      ? "Please confirm final price, delivery date, invoice/GST, payment terms and any hidden charges before we close this."
      : autoActionType === "escalate"
      ? "This thread appears delayed or risky. Please confirm availability, delivery timeline and final terms urgently."
      : "No message required now. Continue monitoring this procurement thread.";

  return {
    ok: true,
    source: "heuristic",
    actionScore,
    autoActionType,
    priority,
    shouldAutoNotify: priority === "Critical" || priority === "High",
    schedulerDecision:
      autoActionType === "monitor"
        ? "Do not schedule action now."
        : priority === "Critical"
        ? "Queue immediate notification and escalation."
        : "Queue smart reminder for this procurement thread.",
    notificationTitle:
      priority === "Critical"
        ? "Urgent procurement action needed"
        : priority === "High"
        ? "Procurement reply/action needed"
        : "Procurement reminder",
    notificationBody:
      autoActionType === "monitor"
        ? "Thread is stable."
        : suggestedMessage,
    suggestedMessage,
    executionReason:
      autoActionType === "escalate"
        ? "Thread is stale or contains risk language."
        : autoActionType === "reply"
        ? "Unread activity requires response."
        : autoActionType === "payment_reminder"
        ? "Price and delivery exist but payment terms are missing."
        : autoActionType === "close_milestone"
        ? "Commitment signal detected; final terms should be confirmed."
        : autoActionType === "follow_up"
        ? "Thread is aging and needs recovery."
        : "No urgent procurement signal detected.",
    workflowTags: [
      module,
      side,
      autoActionType,
      priority.toLowerCase(),
      hasRisk ? "risk" : "normal",
    ],
    nextRunWindow:
      priority === "Critical"
        ? "now"
        : priority === "High"
        ? "within_1_hour"
        : priority === "Medium"
        ? "today"
        : "none",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fallback = fallbackAutoAction(body);

    if (!client) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are the AI Procurement Auto-Action Engine for 3bigha.com.

Return ONLY valid JSON:
{
  "ok": true,
  "source": "openai",
  "actionScore": number,
  "autoActionType": string,
  "priority": "Critical" | "High" | "Medium" | "Low",
  "shouldAutoNotify": boolean,
  "schedulerDecision": string,
  "notificationTitle": string,
  "notificationBody": string,
  "suggestedMessage": string,
  "executionReason": string,
  "workflowTags": string[],
  "nextRunWindow": string
}

Context:
${JSON.stringify(body, null, 2)}

Rules:
- Never auto-send payment commitment.
- Never invent price, delivery date or payment terms.
- Auto-action means suggestion/notification/scheduler queue, not final legal execution.
- Keep messages short, practical and safe.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You return strict JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      ...fallback,
      ...parsed,
      ok: true,
      source: "openai",
    });
  } catch {
    return NextResponse.json(fallbackAutoAction({}));
  }
}