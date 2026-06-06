export type ProcurementOutcomeLearning = {
  supplierTrustScore: number;
  buyerSeriousness: number;
  recoveryEffectiveness: number;
  escalationEffectiveness: number;
  closureConfidence: number;
  workflowFatigue: number;
  learningSummary: string;
  nextOptimization: string;
};

function clamp(n: number, min = 1, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function buildOutcomeLearning(args: {
  closureProbability?: number;
  supplierReliability?: number;
  recoveryProbability?: number;
  escalationCount?: number;
  staleHours?: number;
  negotiationRounds?: number;
  responseHours?: number;
}) : ProcurementOutcomeLearning {

  const closureProbability =
    Number(args.closureProbability || 0);

  const supplierReliability =
    Number(args.supplierReliability || 0);

  const recoveryProbability =
    Number(args.recoveryProbability || 0);

  const escalationCount =
    Number(args.escalationCount || 0);

  const staleHours =
    Number(args.staleHours || 0);

  const negotiationRounds =
    Number(args.negotiationRounds || 0);

  const responseHours =
    Number(args.responseHours || 0);

  const supplierTrustScore = clamp(
    supplierReliability -
    escalationCount * 4 -
    (responseHours > 48 ? 12 : 0)
  );

  const buyerSeriousness = clamp(
    closureProbability -
    staleHours / 12 -
    negotiationRounds * 3
  );

  const recoveryEffectiveness = clamp(
    recoveryProbability -
    staleHours / 10
  );

  const escalationEffectiveness = clamp(
    100 -
    escalationCount * 10
  );

  const workflowFatigue = clamp(
    staleHours / 2 +
    negotiationRounds * 8 +
    escalationCount * 12
  );

  const closureConfidence = clamp(
    (
      closureProbability +
      supplierReliability +
      recoveryProbability
    ) / 3 -
    workflowFatigue / 5
  );

  let learningSummary =
    "Procurement workflow remains stable.";

  if (workflowFatigue >= 70) {
    learningSummary =
      "Procurement workflow fatigue risk is rising.";
  }

  if (closureConfidence >= 80) {
    learningSummary =
      "Procurement closure momentum remains strong.";
  }

  if (supplierTrustScore <= 40) {
    learningSummary =
      "Supplier continuity reliability is weakening.";
  }

  let nextOptimization =
    "Continue operational monitoring.";

  if (workflowFatigue >= 70) {
    nextOptimization =
      "Reduce negotiation friction and accelerate follow-up cadence.";
  }

  if (supplierTrustScore <= 40) {
    nextOptimization =
      "Introduce alternate supplier continuity planning.";
  }

  if (closureConfidence >= 80) {
    nextOptimization =
      "Push procurement workflow toward closure.";
  }

  return {
    supplierTrustScore,
    buyerSeriousness,
    recoveryEffectiveness,
    escalationEffectiveness,
    closureConfidence,
    workflowFatigue,
    learningSummary,
    nextOptimization,
  };
}
