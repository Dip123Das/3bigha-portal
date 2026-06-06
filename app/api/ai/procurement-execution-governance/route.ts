import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    return await res.json();
  } catch {
    return {};
  }
}

function governanceScore(args: {
  confidence?: number;
  priority?: string;
  cognitionRisk?: string;
  autonomous?: boolean;
}) {
  let score = Number(args.confidence || 50);

  if (args.priority === "critical") {
    score -= 15;
  }

  if (args.cognitionRisk === "critical") {
    score -= 20;
  }

  if (args.cognitionRisk === "high") {
    score -= 10;
  }

  if (args.autonomous) {
    score -= 8;
  }

  return Math.max(
    1,
    Math.min(100, Math.round(score))
  );
}

function sensitivityLevel(score: number) {
  if (score <= 35) return "high-review";
  if (score <= 60) return "review";
  if (score <= 80) return "light-review";
  return "safe";
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      assist,
      cognition,
      executionReadiness,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-autonomous-assist`
      ),

      safeJson(
        `${origin}/api/ai/procurement-unified-cognition`
      ),

      safeJson(
        `${origin}/api/ai/procurement-execution-readiness`
      ),
    ]);

    const cognitionRisk =
      cognition?.cognition?.predictiveRisk ||
      "low";

    const recommendations =
      Array.isArray(
        assist?.recommendations
      )
        ? assist.recommendations
        : [];

    const queue = recommendations.map(
      (item: any, index: number) => {
        const confidence =
          item.priority === "critical"
            ? 55
            : item.priority === "high"
              ? 68
              : item.priority === "medium"
                ? 78
                : 88;

        const governance =
          governanceScore({
            confidence,
            priority: item.priority,
            cognitionRisk,
            autonomous: true,
          });

        const sensitivity =
          sensitivityLevel(governance);

        return {
          id:
            `exec-${index + 1}`,

          title:
            item.title,

          priority:
            item.priority,

          governanceScore:
            governance,

          sensitivity,

          recommendation:
            item.recommendation,

          reason:
            item.reason,

          automation:
            item.automation,

          executionMode:
            sensitivity === "high-review"
              ? "manual-approval-required"
              : sensitivity === "review"
                ? "supervised-review"
                : "safe-supervised",

          status:
            "awaiting-review",
        };
      }
    );

    const approvalRequired =
      queue.filter(
        (x: any) =>
          x.executionMode ===
          "manual-approval-required"
      ).length;

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      governanceMode:
        "supervised-execution-governance",

      cognitionRisk,

      queue,

      summary: {
        total:
          queue.length,

        approvalRequired,

        safeSupervised:
          queue.filter(
            (x: any) =>
              x.executionMode ===
              "safe-supervised"
          ).length,
      },

      executionReadiness:
        executionReadiness?.readiness ||
        {},

      executionEngine:
        executionReadiness?.executionReadiness?.mode ||
        executionReadiness?.readinessMode ||
        "stable",

      governanceDirective:
        approvalRequired > 0
          ? "Critical procurement actions require manual approval."
          : "Procurement execution queue operating safely under supervision.",

      safety:
        "Human approval remains mandatory for sensitive procurement execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Execution governance failed.",
      },
      { status: 500 }
    );
  }
}
