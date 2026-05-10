import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AutonomousAction =
  | "follow_up"
  | "buyer_recovery"
  | "vendor_escalation"
  | "alternate_supplier"
  | "closure_nudge"
  | "negotiation_push";

const ALLOWED_ACTIONS: AutonomousAction[] = [
  "follow_up",
  "buyer_recovery",
  "vendor_escalation",
  "alternate_supplier",
  "closure_nudge",
  "negotiation_push",
];

function isValidAction(value: string): value is AutonomousAction {
  return ALLOWED_ACTIONS.includes(value as AutonomousAction);
}

function buildMessage(action: AutonomousAction, threadTitle: string) {
  switch (action) {
    case "follow_up":
      return `Reminder: Procurement workflow "${threadTitle}" is still pending. Please respond with latest status update.`;

    case "buyer_recovery":
      return `We noticed inactivity in "${threadTitle}". Would you like help comparing suppliers or continuing negotiation?`;

    case "vendor_escalation":
      return `Urgent procurement escalation detected for "${threadTitle}". Immediate supplier response required.`;

    case "alternate_supplier":
      return `AI recommends activating alternate suppliers for "${threadTitle}" due to reduced workflow confidence.`;

    case "closure_nudge":
      return `Final confirmation pending for "${threadTitle}". Please confirm pricing, timeline and execution readiness.`;

    case "negotiation_push":
      return `AI suggests continuing negotiation momentum for "${threadTitle}" to improve closure probability.`;

    default:
      return "AI autonomous procurement action generated.";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const actionRaw = String(body?.action || "follow_up");
    const action: AutonomousAction = isValidAction(actionRaw)
      ? actionRaw
      : "follow_up";

    const threadTitle = String(
      body?.threadTitle || "Procurement workflow"
    );

    const target = String(body?.target || "system");
    const severity = String(body?.severity || "medium");
    const confidence = Number(body?.confidence || 70);

    const generatedMessage = buildMessage(action, threadTitle);

    return NextResponse.json({
      ok: true,
      autonomous: true,
      action,
      severity,
      confidence,
      target,
      generatedMessage,
      executionMode:
        confidence >= 90 ? "auto-approved" : "approval-required",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate autonomous execution action.",
      },
      { status: 500 }
    );
  }
}