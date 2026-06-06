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

function evolveMemory(args: {
  outcome: any;
  memory: any;
  supplierReliability: any[];
}) {
  const learning = args.outcome?.learning || {};
  const suppliers = args.supplierReliability || [];

  const weakSupplierCount = suppliers.filter(
    (s: any) => Number(s.reliability || 0) < 50 || s.operationalRisk === "high"
  ).length;

  const strongSupplierCount = suppliers.filter(
    (s: any) => Number(s.reliability || 0) >= 80
  ).length;

  const chronicFatigue =
    Number(learning.workflowFatigue || 0) >= 70;

  const trustDirection =
    Number(learning.supplierTrustScore || 0) >= 75
      ? "improving"
      : Number(learning.supplierTrustScore || 0) <= 45
        ? "weakening"
        : "stable";

  const buyerDirection =
    Number(learning.buyerSeriousness || 0) >= 70
      ? "serious"
      : Number(learning.buyerSeriousness || 0) <= 40
        ? "uncertain"
        : "watch";

  const evolutionScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        Number(learning.closureConfidence || 0) * 0.35 +
          Number(learning.supplierTrustScore || 0) * 0.3 +
          Number(learning.recoveryEffectiveness || 0) * 0.2 +
          strongSupplierCount * 5 -
          weakSupplierCount * 6 -
          (chronicFatigue ? 12 : 0)
      )
    )
  );

  const memoryState =
    evolutionScore >= 75
      ? "healthy-learning"
      : evolutionScore >= 55
        ? "watch-learning"
        : "weak-learning";

  const nextMemoryAction =
    chronicFatigue
      ? "Save fatigue pattern and recommend earlier follow-up next time."
      : trustDirection === "weakening"
        ? "Save supplier weakening pattern and reduce automatic preference."
        : buyerDirection === "serious"
          ? "Save buyer seriousness signal for future procurement prioritization."
          : "Continue supervised procurement memory collection.";

  return {
    evolutionScore,
    memoryState,
    trustDirection,
    buyerDirection,
    chronicFatigue,
    weakSupplierCount,
    strongSupplierCount,
    nextMemoryAction,
    learningSummary:
      memoryState === "healthy-learning"
        ? "Procurement memory is learning positive closure and supplier patterns."
        : memoryState === "watch-learning"
          ? "Procurement memory is tracking mixed operational behavior."
          : "Procurement memory detected weakening operational behavior.",
  };
}

export async function GET(req: Request) {
  try {
    const origin = new URL(req.url).origin;

    const [outcome, memory, supplier] = await Promise.all([
      safeJson(`${origin}/api/ai/procurement-outcome-learning`),
      safeJson(`${origin}/api/ai/procurement-memory-intelligence`),
      safeJson(`${origin}/api/ai/procurement-supplier-reliability`),
    ]);

    const evolved = evolveMemory({
      outcome,
      memory,
      supplierReliability: Array.isArray(supplier?.suppliers)
        ? supplier.suppliers
        : [],
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      evolution: evolved,
      sourceSignals: {
        outcomeLearning: outcome?.learning || null,
        memoryCount: Array.isArray(memory?.memories) ? memory.memories.length : 0,
        supplierCount: Array.isArray(supplier?.suppliers) ? supplier.suppliers.length : 0,
      },
      executiveDirective: evolved.nextMemoryAction,
      learningMode: "supervised-memory-evolution",
      safety:
        "Memory evolution is advisory only. No hidden scoring or automatic commercial execution.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Procurement memory evolution failed.",
      },
      { status: 500 }
    );
  }
}
