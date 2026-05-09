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

function fallbackTimeline(body: any) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const lastActivityAt = body?.lastActivityAt || body?.updated_at || null;
  const unreadCount = safeNumber(body?.unreadCount);
  const avgResponseHours = safeNumber(body?.avgResponseHours, 24);
  const promisedDeliveryDays = safeNumber(body?.promisedDeliveryDays, 0);
  const paymentDueDays = safeNumber(body?.paymentDueDays, 0);

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

  const timelineScore = clamp(
    35 +
      (hasPrice ? 10 : 0) +
      (hasDelivery ? 18 : 0) +
      (hasPayment ? 10 : 0) +
      (hasCommitment ? 15 : 0) -
      (hasRisk ? 18 : 0) -
      (ageHours > 72 ? 18 : ageHours > 48 ? 10 : ageHours > 24 ? 5 : 0) -
      unreadCount * 4
  );

  const deliveryRisk =
    hasRisk || ageHours > 72
      ? "High"
      : promisedDeliveryDays > 0 || hasDelivery
      ? "Low"
      : "Medium";

  const paymentRisk =
    hasPayment || paymentDueDays > 0 ? "Low" : hasCommitment ? "Medium" : "High";

  const slaStatus =
    unreadCount > 0 || ageHours > 72
      ? "Breached"
      : ageHours > 36
      ? "At risk"
      : "On track";

  const nextMilestone =
    hasCommitment
      ? "Final confirmation"
      : hasPrice && hasDelivery
      ? "Payment and GST confirmation"
      : hasPrice
      ? "Delivery timeline confirmation"
      : "Quote collection";

  return {
    ok: true,
    source: "heuristic",
    timelineScore,
    slaStatus,
    nextMilestone,
    deliveryPrediction:
      deliveryRisk === "High"
        ? "Delivery may slip unless the vendor confirms timeline again."
        : hasDelivery
        ? "Delivery timeline is visible in the conversation."
        : "Delivery timeline is not clearly confirmed yet.",
    paymentReminder:
      paymentRisk === "Low"
        ? "Payment/GST/invoice terms appear discussed."
        : "Ask for advance, balance payment, GST/invoice and billing terms.",
    followUpWindow:
      ageHours > 72
        ? "Immediate follow-up required"
        : ageHours > 48
        ? "Follow up today"
        : ageHours > 24
        ? "Follow up within 24 hours"
        : "Monitor normally",
    vendorResponseTimer:
      avgResponseHours <= 6
        ? "Fast response pattern"
        : avgResponseHours <= 24
        ? "Normal response pattern"
        : "Slow response pattern",
    deliveryRisk,
    paymentRisk,
    timelineEvents: [
      { label: "RFQ / conversation started", status: "done" },
      { label: hasPrice ? "Price discussed" : "Price pending", status: hasPrice ? "done" : "pending" },
      { label: hasDelivery ? "Delivery timeline discussed" : "Delivery timeline pending", status: hasDelivery ? "done" : "pending" },
      { label: hasPayment ? "Payment terms discussed" : "Payment terms pending", status: hasPayment ? "done" : "pending" },
      { label: hasCommitment ? "Final commitment detected" : "Final confirmation pending", status: hasCommitment ? "done" : "pending" },
    ],
    recommendedTimelineAction:
      slaStatus === "Breached"
        ? "Escalate this thread and send a direct follow-up now."
        : hasCommitment
        ? "Confirm final price, delivery date, invoice and payment terms."
        : hasPrice && hasDelivery
        ? "Ask for payment/GST terms and final confirmation."
        : "Collect quote, timeline, availability and payment terms.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fallback = fallbackTimeline(body);

    if (!client) {
      return NextResponse.json(fallback);
    }

    const prompt = `
You are the AI Procurement Timeline & SLA Engine for 3bigha.com.

Return ONLY valid JSON:
{
  "ok": true,
  "source": "openai",
  "timelineScore": number,
  "slaStatus": string,
  "nextMilestone": string,
  "deliveryPrediction": string,
  "paymentReminder": string,
  "followUpWindow": string,
  "vendorResponseTimer": string,
  "deliveryRisk": "High" | "Medium" | "Low",
  "paymentRisk": "High" | "Medium" | "Low",
  "timelineEvents": [
    { "label": string, "status": string }
  ],
  "recommendedTimelineAction": string
}

Context:
${JSON.stringify(body, null, 2)}

Rules:
- Do not invent dates, prices or promises.
- Keep every field short and operational.
- Focus on RFQ timeline, vendor response, delivery prediction, payment reminder and SLA monitoring.
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
    return NextResponse.json(fallbackTimeline({}));
  }
}