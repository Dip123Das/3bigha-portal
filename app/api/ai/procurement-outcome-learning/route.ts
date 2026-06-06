import { NextResponse } from "next/server";

import {
  buildOutcomeLearning,
} from "@/lib/procurement/intelligence/outcome-learning";

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

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [
      supplierData,
      closureData,
    ] = await Promise.all([
      safeJson(
        `${origin}/api/ai/procurement-supplier-reliability`
      ),

      safeJson(
        `${origin}/api/ai/procurement-closure-agent`
      ),
    ]);

    const suppliers =
      Array.isArray(supplierData?.suppliers)
        ? supplierData.suppliers
        : [];

    const closures =
      Array.isArray(closureData?.closures)
        ? closureData.closures
        : [];

    const supplier =
      suppliers[0] || {};

    const closure =
      closures[0] || {};

    const learning =
      buildOutcomeLearning({
        closureProbability:
          closure?.probability || 0,

        supplierReliability:
          supplier?.reliability || 0,

        recoveryProbability:
          supplier?.deliveryConsistency || 0,

        escalationCount:
          supplier?.operationalRisk === "high"
            ? 5
            : supplier?.operationalRisk === "medium"
              ? 2
              : 1,

        staleHours:
          closure?.stage === "stalled"
            ? 120
            : closure?.stage === "negotiation"
              ? 48
              : 12,

        negotiationRounds:
          closure?.stage === "near-close"
            ? 2
            : closure?.stage === "negotiation"
              ? 5
              : 7,

        responseHours:
          supplier?.deliveryConsistency < 50
            ? 72
            : 12,
      });

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      learning,

      supplier,

      closure,

      executiveDirective:
        learning.nextOptimization,

      learningMode:
        "supervised-outcome-learning",

      explainability:
        "All learning signals remain explainable and operationally reviewable.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,

        error:
          err?.message ||
          "Outcome learning engine failed.",
      },
      { status: 500 }
    );
  }
}
