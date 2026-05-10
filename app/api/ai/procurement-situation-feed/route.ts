import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET() {
  try {
    const now = Date.now();

    const events = [
      {
        type: "critical",
        title: "Critical RFQ inactivity detected",
        detail:
          "Vendor response SLA exceeded for procurement workflow.",
        time: new Date(now - 1000 * 60 * 8).toISOString(),
      },
      {
        type: "warning",
        title: "Supplier response delay increasing",
        detail:
          "Procurement AI detected slowing vendor engagement.",
        time: new Date(now - 1000 * 60 * 16).toISOString(),
      },
      {
        type: "healthy",
        title: "Procurement workflow recovered",
        detail:
          "AI recovery engine successfully restored engagement.",
        time: new Date(now - 1000 * 60 * 24).toISOString(),
      },
      {
        type: "critical",
        title: "Escalation directive triggered",
        detail:
          "Autonomous execution AI escalated procurement priority.",
        time: new Date(now - 1000 * 60 * 30).toISOString(),
      },
      {
        type: "healthy",
        title: "Supplier engagement improving",
        detail:
          "Positive procurement momentum detected by AI systems.",
        time: new Date(now - 1000 * 60 * 45).toISOString(),
      },
    ];

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      events: events.sort(
        (a, b) =>
          new Date(b.time).getTime() -
          new Date(a.time).getTime()
      ),
      headline: randomItem([
        "Procurement systems stable with monitored escalation risk.",
        "AI execution systems actively monitoring procurement anomalies.",
        "Operational procurement intelligence detecting live workflow signals.",
      ]),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Failed to generate procurement situation feed.",
      },
      { status: 500 }
    );
  }
}