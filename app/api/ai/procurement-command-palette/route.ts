import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATIC_COMMANDS = [
  {
    keywords: ["critical", "stale", "risk", "anomaly"],
    title: "Critical Procurement Workflows",
    description: "Open procurement anomaly intelligence",
    href: "/dashboard/procurement-anomaly",
    category: "Operations",
    status: "critical",
  },
  {
    keywords: ["health", "score", "pipeline"],
    title: "Procurement Health Score",
    description: "View enterprise procurement health",
    href: "/dashboard/procurement-health",
    category: "Executive",
    status: "critical",
  },
  {
    keywords: ["execution", "recovery", "sla"],
    title: "Execution Intelligence",
    description: "Open autonomous execution AI",
    href: "/dashboard/procurement-execution",
    category: "Execution",
    status: "warning",
  },
  {
    keywords: ["actions", "automation", "directives"],
    title: "Autonomous Procurement Actions",
    description: "Open AI action center",
    href: "/dashboard/procurement-actions",
    category: "Execution",
    status: "warning",
  },
  {
    keywords: ["forecast", "prediction", "analytics"],
    title: "Forecast Analytics",
    description: "Open predictive procurement analytics",
    href: "/dashboard/procurement-analytics",
    category: "Analytics",
    status: "healthy",
  },
  {
    keywords: ["copilot", "assistant", "ai"],
    title: "AI Procurement Copilot",
    description: "Ask procurement intelligence questions",
    href: "/dashboard/procurement-copilot",
    category: "Copilot",
    status: "healthy",
  },
  {
    keywords: ["live", "stream", "operations"],
    title: "Live Procurement Operations",
    description: "Monitor real-time procurement events",
    href: "/dashboard/procurement-live",
    category: "Operations",
    status: "warning",
  },
  {
    keywords: ["briefing", "daily", "executive"],
    title: "AI Procurement Daily Briefing",
    description: "Open executive procurement morning briefing",
    href: "/dashboard/procurement-briefing",
    category: "Executive",
    status: "warning",
  },
  {
    keywords: ["war", "room", "hq", "operations"],
    title: "AI Procurement War Room",
    description: "Open executive procurement operations HQ",
    href: "/dashboard/procurement-war-room",
    category: "Executive",
    status: "critical",
  },
  {
    keywords: ["situation", "feed", "events", "operations"],
    title: "AI Procurement Situation Room",
    description: "Open live operational intelligence feed",
    href: "/dashboard/procurement-situation-room",
    category: "Operations",
    status: "warning",
  },
  {
    keywords: ["crisis", "threat", "emergency"],
    title: "AI Procurement Crisis Center",
    description: "Open operational threat intelligence center",
    href: "/dashboard/procurement-crisis-center",
    category: "Emergency",
    status: "critical",
  },
  {
    keywords: ["mission", "control", "hq", "command"],
    title: "AI Procurement Mission Control",
    description: "Open unified executive procurement command center",
    href: "/dashboard/procurement-mission-control",
    category: "Executive",
    status: "critical",
  },
];

function filterCommands(query: string, list: any[]) {
  const q = query.toLowerCase().trim();

  if (!q) {
    return list;
  }

  return list.filter((cmd) =>
    (cmd.keywords || []).some((k: string) => q.includes(k))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query || "");
    const origin = new URL(req.url).origin;

    let healthData: any = null;

    try {
      const res = await fetch(`${origin}/api/ai/procurement-health-score`, {
        cache: "no-store",
      });

      healthData = await res.json();
    } catch {
      // ignore
    }

    const summary = healthData?.summary || {};

    const dynamicCommands = [
      {
        keywords: ["urgent", "critical", "threads"],
        title: `Open ${summary.criticalThreads || 0} Critical Procurement Threads`,
        description: `Critical signals: ${summary.criticalSignals || 0}`,
        href: "/dashboard/procurement-anomaly",
        category: "Operations",
        status:
          Number(summary.criticalThreads || 0) > 0
            ? "critical"
            : "healthy",
      },
      {
        keywords: ["health", "score"],
        title: `Procurement Health Score: ${healthData?.healthScore || 0}/100`,
        description: healthData?.healthStatus || "Unknown procurement condition",
        href: "/dashboard/procurement-health",
        category: "Executive",
        status:
          Number(healthData?.healthScore || 0) >= 70
            ? "healthy"
            : Number(healthData?.healthScore || 0) >= 45
              ? "warning"
              : "critical",
      },
      {
        keywords: ["mission", "control", "hq", "command"],
        title: "Open AI Procurement Mission Control",
        description: "Unified executive procurement command center",
        href: "/dashboard/procurement-mission-control",
        category: "Executive",
        status: "critical",
      },
    ];

    const results = filterCommands(query, [
      ...dynamicCommands,
      ...STATIC_COMMANDS,
    ]);

    return NextResponse.json({
      ok: true,
      query,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement command palette failed.",
      },
      { status: 500 }
    );
  }
}