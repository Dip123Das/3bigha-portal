import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATIC_COMMANDS = [
  {
    keywords: ["critical", "stale", "risk", "anomaly"],
    title: "Critical Procurement Workflows",
    description: "Open procurement anomaly intelligence",
    href: "/dashboard/procurement-anomaly",
  },
  {
    keywords: ["health", "score", "pipeline"],
    title: "Procurement Health Score",
    description: "View enterprise procurement health",
    href: "/dashboard/procurement-health",
  },
  {
    keywords: ["execution", "recovery", "sla"],
    title: "Execution Intelligence",
    description: "Open autonomous execution AI",
    href: "/dashboard/procurement-execution",
  },
  {
    keywords: ["actions", "automation", "directives"],
    title: "Autonomous Procurement Actions",
    description: "Open AI action center",
    href: "/dashboard/procurement-actions",
  },
  {
    keywords: ["forecast", "prediction", "analytics"],
    title: "Forecast Analytics",
    description: "Open predictive procurement analytics",
    href: "/dashboard/procurement-analytics",
  },
  {
    keywords: ["copilot", "assistant", "ai"],
    title: "AI Procurement Copilot",
    description: "Ask procurement intelligence questions",
    href: "/dashboard/procurement-copilot",
  },
  {
    keywords: ["live", "stream", "operations"],
    title: "Live Procurement Operations",
    description: "Monitor real-time procurement events",
    href: "/dashboard/procurement-live",
  },
];

function filterCommands(query: string, list: any[]) {
  const q = query.toLowerCase().trim();

  if (!q) {
    return list;
  }

  return list.filter((cmd) =>
    (cmd.keywords || []).some((k: string) =>
      q.includes(k)
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = String(body?.query || "");

    const origin = new URL(req.url).origin;

    let healthData: any = null;

    try {
      const res = await fetch(
        `${origin}/api/ai/procurement-health-score`,
        {
          cache: "no-store",
        }
      );

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
        description:
          healthData?.healthStatus ||
          "Unknown procurement condition",
        href: "/dashboard/procurement-health",
        category: "Executive",
        status:
          Number(healthData?.healthScore || 0) >= 70
            ? "healthy"
            : Number(healthData?.healthScore || 0) >= 45
            ? "warning"
            : "critical",
      },
    ];

    const all = [
      ...dynamicCommands,
      ...STATIC_COMMANDS,
    ];

    const results = filterCommands(query, all);

    return NextResponse.json({
      ok: true,
      query,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Procurement command palette failed.",
      },
      { status: 500 }
    );
  }
}