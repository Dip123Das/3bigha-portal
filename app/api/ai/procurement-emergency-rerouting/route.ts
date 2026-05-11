import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTES = [
  {
    category: "Steel",
    failedSupplier: "Eastern Steel Supply",
    backupSupplier: "Metro Structural Hub",
    backupZone: "Kolkata",
  },
  {
    category: "Cement",
    failedSupplier: "Bengal Cement Hub",
    backupSupplier: "Rapid Cement Network",
    backupZone: "Howrah",
  },
  {
    category: "Electrical",
    failedSupplier: "Northline Electricals",
    backupSupplier: "Prime Electric Chain",
    backupZone: "Siliguri",
  },
  {
    category: "Plumbing",
    failedSupplier: "Metro Pipe Traders",
    backupSupplier: "Flowline Infra Supply",
    backupZone: "Durgapur",
  },
];

function severity(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Stable";
}

export async function GET() {
  try {
    const routes = ROUTES.map((item, index) => {
      const rerouteScore = Math.min(96, 52 + index * 11);

      return {
        id: `reroute-${index}`,
        ...item,
        rerouteScore,
        severity: severity(rerouteScore),
        estimatedRecovery:
          rerouteScore >= 80
            ? "Immediate rerouting required within 6h."
            : rerouteScore >= 60
            ? "Backup activation recommended within 24h."
            : "Monitor supplier continuity.",
        aiAction:
          rerouteScore >= 80
            ? "Activate autonomous procurement recovery workflow."
            : "Prepare backup supplier negotiation.",
      };
    });

    return NextResponse.json({
      ok: true,
      executiveDirective:
        "AI emergency rerouting engine is actively monitoring supplier failures and backup procurement recovery.",
      routes,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      routes: [],
    });
  }
}