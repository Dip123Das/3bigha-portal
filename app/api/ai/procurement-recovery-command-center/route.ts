import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECOVERY = [
  {
    title: "Steel supplier stabilization",
    probability: 82,
    severity: "High",
    action: "Activate alternate supplier routing.",
  },
  {
    title: "Cement RFQ continuity recovery",
    probability: 76,
    severity: "Medium",
    action: "Escalate follow-up orchestration.",
  },
  {
    title: "Electrical procurement restoration",
    probability: 58,
    severity: "Critical",
    action: "Trigger autonomous recovery workflow.",
  },
  {
    title: "Vendor negotiation stabilization",
    probability: 88,
    severity: "Stable",
    action: "Continue AI negotiation leverage.",
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      readinessScore: 84,
      stabilizationScore: 78,
      operationalRecovery: "AI procurement recovery systems operational.",
      recovery: RECOVERY,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      recovery: [],
    });
  }
}