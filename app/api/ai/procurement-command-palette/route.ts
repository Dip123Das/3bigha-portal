import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMANDS = [
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

function searchCommands(query: string) {
  const q = query.toLowerCase().trim();

  if (!q) {
    return COMMANDS.slice(0, 6);
  }

  return COMMANDS.filter((cmd) =>
    cmd.keywords.some((k) => q.includes(k))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = String(body?.query || "");

    const results = searchCommands(query);

    return NextResponse.json({
      ok: true,
      query,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Command palette failed.",
      },
      { status: 500 }
    );
  }
}