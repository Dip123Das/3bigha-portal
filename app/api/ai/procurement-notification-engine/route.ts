import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hoursSince(v?: string | null) {
  if (!v) return 999;
  const n = new Date(v).getTime();
  if (!Number.isFinite(n)) return 999;
  return Math.max(0, (Date.now() - n) / (1000 * 60 * 60));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const unreadCount = safeNumber(body?.unreadCount);
    const timelineScore = safeNumber(body?.timelineScore, 50);
    const actionScore = safeNumber(body?.actionScore, 50);
    const lastActivityAt = body?.lastActivityAt || null;
    const slaStatus = String(body?.slaStatus || "").trim();
    const deliveryRisk = String(body?.deliveryRisk || "").trim();
    const paymentRisk = String(body?.paymentRisk || "").trim();
    const autoActionType = String(body?.autoActionType || "").trim();
    const title = String(body?.title || "Procurement thread").trim();

    const ageHours = hoursSince(lastActivityAt);

    const priority =
      slaStatus === "Breached" || deliveryRisk === "High" || actionScore >= 85
        ? "critical"
        : unreadCount > 0 || paymentRisk === "High" || ageHours > 48
        ? "high"
        : timelineScore < 50 || ageHours > 24
        ? "medium"
        : "low";

    const shouldNotify = priority !== "low";

    const notificationTitle =
      priority === "critical"
        ? "🚨 Critical procurement action needed"
        : priority === "high"
        ? "⚡ Procurement follow-up needed"
        : priority === "medium"
        ? "⏳ Procurement reminder"
        : "Procurement monitoring";

    const notificationMessage =
      priority === "critical"
        ? `${title}: SLA/delivery/payment risk needs immediate action.`
        : autoActionType === "payment_reminder"
        ? `${title}: payment, GST or invoice terms need confirmation.`
        : autoActionType === "follow_up"
        ? `${title}: follow up now to keep this procurement active.`
        : unreadCount > 0
        ? `${title}: unread procurement activity needs review.`
        : `${title}: monitor this procurement thread.`;

    return NextResponse.json({
      ok: true,
      shouldNotify,
      priority,
      type: "procurement_ai",
      title: notificationTitle,
      message: notificationMessage,
      data: {
        source: "procurement-notification-engine",
        autoActionType,
        slaStatus,
        deliveryRisk,
        paymentRisk,
        timelineScore,
        actionScore,
        lastActivityAt,
      },
      whatsappEligible: priority === "critical" || priority === "high",
      recommendedChannel:
        priority === "critical" ? "dashboard_and_whatsapp" : "dashboard",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Notification engine failed." },
      { status: 500 }
    );
  }
}