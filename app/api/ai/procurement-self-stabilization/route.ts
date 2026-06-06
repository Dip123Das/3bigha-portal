import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

function clamp(n: number) {
  return Math.max(1, Math.min(100, Math.round(n)));
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [mission, recovery, learning, governance] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-mission-control`),
      safeJson(`${origin}/api/ai/procurement-recovery-agent`),
      safeJson(`${origin}/api/ai/procurement-outcome-learning`),
      safeJson(`${origin}/api/ai/procurement-execution-governance`),
    ]);

    const operationalLoad = Number(mission?.mission?.operationalLoad || 0);
    const recoveryPressure = Number(mission?.mission?.recoveryPressure || 0);
    const staleConversations = Number(mission?.mission?.staleConversations || 0);
    const fatigue = Number(learning?.learning?.workflowFatigue || 0);
    const approvals = Number(governance?.summary?.approvalRequired || 0);

    const criticalRecovery = Number(recovery?.summary?.critical || 0);
    const highRecovery = Number(recovery?.summary?.high || 0);

    const stabilizationPressure = clamp(
      operationalLoad * 0.25 +
        recoveryPressure * 0.25 +
        fatigue * 0.2 +
        staleConversations * 4 +
        approvals * 8 +
        criticalRecovery * 12 +
        highRecovery * 6
    );

    const stabilizationMode =
      stabilizationPressure >= 80
        ? "active-stabilization"
        : stabilizationPressure >= 55
          ? "watch-stabilization"
          : "stable-monitoring";

    const actions: any[] = [];

    if (approvals > 0) {
      actions.push({
        type: "governance-compression",
        title: "Compress approval queue",
        recommendation:
          "Review sensitive approval items first and temporarily deprioritize low-impact execution suggestions.",
        safety: "No execution occurs without human approval.",
      });
    }

    if (fatigue >= 70) {
      actions.push({
        type: "fatigue-reduction",
        title: "Reduce workflow fatigue",
        recommendation:
          "Prioritize recoverable workflows and reduce repeated low-value follow-up pressure.",
        safety: "AI only recommends workload simplification.",
      });
    }

    if (criticalRecovery > 0 || highRecovery > 0) {
      actions.push({
        type: "recovery-prioritization",
        title: "Prioritize recovery workflows",
        recommendation:
          "Move stale critical and high-risk procurement conversations above routine monitoring.",
        safety: "Recovery actions remain supervised.",
      });
    }

    if (operationalLoad >= 70) {
      actions.push({
        type: "attention-rebalance",
        title: "Rebalance operator attention",
        recommendation:
          "Show only high-value procurement signals until operational pressure reduces.",
        safety: "This is a visibility recommendation only.",
      });
    }

    if (actions.length === 0) {
      actions.push({
        type: "stable-monitoring",
        title: "Continue stable monitoring",
        recommendation:
          "Procurement operations remain stable under supervised AI monitoring.",
        safety: "No stabilization intervention required.",
      });
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      stabilization: {
        stabilizationPressure,
        stabilizationMode,
        operationalLoad,
        recoveryPressure,
        staleConversations,
        fatigue,
        approvals,
        criticalRecovery,
        highRecovery,
      },
      actions,
      executiveDirective: actions[0]?.recommendation,
      safety:
        "Self-stabilization is advisory only. It does not auto-approve, auto-negotiate, auto-pay, or auto-close procurement workflows.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement self-stabilization failed.",
      },
      { status: 500 }
    );
  }
}
