import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DECISIONS = [
  {
    title: "Steel RFQ supplier inactivity",
    decision: "Escalate",
    confidence: 92,
    urgency: "Critical",
    explanation:
      "Supplier silence exceeded safe procurement continuity threshold.",
    aiAction:
      "Trigger escalation workflow and alternate supplier recovery.",
  },
  {
    title: "Cement procurement negotiation",
    decision: "Negotiate",
    confidence: 84,
    urgency: "High",
    explanation:
      "Negotiation leverage remains favorable for procurement optimization.",
    aiAction:
      "Continue negotiation pressure and monitor closure probability.",
  },
  {
    title: "Electrical material procurement",
    decision: "Reroute",
    confidence: 78,
    urgency: "High",
    explanation:
      "Supplier overload risk indicates procurement delay probability.",
    aiAction:
      "Activate backup supplier routing intelligence.",
  },
  {
    title: "Investment procurement discussion",
    decision: "Wait",
    confidence: 61,
    urgency: "Medium",
    explanation:
      "Conversation momentum remains stable without escalation requirement.",
    aiAction:
      "Continue AI monitoring and passive follow-up orchestration.",
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      executiveDirective:
        "AI autonomous decision layer actively orchestrating procurement operational actions.",
      decisions: DECISIONS,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      decisions: [],
    });
  }
}