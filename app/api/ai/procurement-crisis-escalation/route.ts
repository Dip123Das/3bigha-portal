import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATES = [
  {
    level: "Normal",
    score: 28,
    directive: "Standard procurement monitoring active.",
    countdown: "72h",
  },
  {
    level: "Elevated",
    score: 54,
    directive: "Increase RFQ monitoring and supplier follow-ups.",
    countdown: "48h",
  },
  {
    level: "High Risk",
    score: 78,
    directive: "Escalate vendor coordination and monitor shortages.",
    countdown: "24h",
  },
  {
    level: "Critical",
    score: 94,
    directive:
      "Activate procurement crisis protocol and autonomous escalation.",
    countdown: "6h",
  },
];

const HOTSPOTS = [
  "Steel supplier exhaustion risk",
  "Cement shortage escalation",
  "Negotiation inflation spike",
  "RFQ overload pressure",
  "Supplier response collapse",
];

export async function GET() {
  try {
    const escalations = STATES.map((state, index) => ({
      id: `escalation-${index}`,
      level: state.level,
      score: state.score,
      directive: state.directive,
      countdown: state.countdown,
      hotspot: HOTSPOTS[index],
      autonomousAction:
        state.score >= 80
          ? "Emergency supplier rerouting recommended."
          : state.score >= 60
          ? "Escalate procurement supervision."
          : "Continue AI monitoring.",
    }));

    return NextResponse.json({
      ok: true,
      executiveSummary:
        "AI escalation engine is actively monitoring procurement emergency states.",
      escalations,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      escalations: [],
    });
  }
}