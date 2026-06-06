export type ProcurementTrajectoryState =
  | "improving"
  | "stable"
  | "weakening"
  | "deteriorating"
  | "critical_drift";

export type ProcurementPredictiveRisk =
  | "low"
  | "watch"
  | "elevated"
  | "high"
  | "critical";

export type ProcurementCognitionResult = {
  cognitionScore: number;
  trajectory: ProcurementTrajectoryState;
  predictiveRisk: ProcurementPredictiveRisk;
  silentRiskDetected: boolean;
  escalationLikely: boolean;
  recoveryLikely: boolean;
  operationalDrift: number;
  recommendedFocus: string;
  reasons: string[];
};

export function evaluateUnifiedProcurementCognition(input: {
  healthScore?: number;
  operationalLoad?: number;
  recoveryPressure?: number;
  criticalSignals?: number;
  highSignals?: number;
  staleConversations?: number;
  avgClosureProbability?: number;
  likelyClosures?: number;
  anomalyCount?: number;
  supplierCollapseRisk?: number;
  shortageRisk?: number;
}): ProcurementCognitionResult {
  const health = Number(input.healthScore ?? 70);
  const load = Number(input.operationalLoad ?? 0);
  const recovery = Number(input.recoveryPressure ?? 0);
  const critical = Number(input.criticalSignals ?? 0);
  const high = Number(input.highSignals ?? 0);
  const stale = Number(input.staleConversations ?? 0);
  const closure = Number(input.avgClosureProbability ?? 50);
  const likelyClosures = Number(input.likelyClosures ?? 0);
  const anomaly = Number(input.anomalyCount ?? 0);
  const supplierCollapse = Number(input.supplierCollapseRisk ?? 0);
  const shortage = Number(input.shortageRisk ?? 0);

  const operationalDrift = Math.min(
    100,
    recovery +
      stale * 8 +
      anomaly * 6 +
      critical * 12 +
      high * 6 +
      Math.max(0, 60 - closure) +
      Math.max(0, supplierCollapse - 50) +
      Math.max(0, shortage - 50)
  );

  let cognitionScore = Math.max(
    1,
    Math.min(
      100,
      health +
        likelyClosures * 2 -
        operationalDrift / 2 -
        Math.max(0, load - 70) / 2
    )
  );

  cognitionScore = Math.round(cognitionScore);

  const silentRiskDetected =
    critical === 0 &&
    high === 0 &&
    (stale >= 2 || recovery >= 35 || operationalDrift >= 45);

  const escalationLikely =
    critical > 0 ||
    operationalDrift >= 70 ||
    supplierCollapse >= 75 ||
    shortage >= 75;

  const recoveryLikely =
    cognitionScore >= 55 &&
    recovery > 0 &&
    likelyClosures > 0 &&
    operationalDrift < 70;

  let trajectory: ProcurementTrajectoryState = "stable";

  if (cognitionScore >= 75 && operationalDrift < 35) {
    trajectory = "improving";
  } else if (operationalDrift >= 80 || cognitionScore < 35) {
    trajectory = "critical_drift";
  } else if (operationalDrift >= 60 || cognitionScore < 50) {
    trajectory = "deteriorating";
  } else if (operationalDrift >= 40 || cognitionScore < 65) {
    trajectory = "weakening";
  }

  let predictiveRisk: ProcurementPredictiveRisk = "low";

  if (operationalDrift >= 80 || critical > 0) {
    predictiveRisk = "critical";
  } else if (operationalDrift >= 65 || high >= 2) {
    predictiveRisk = "high";
  } else if (operationalDrift >= 45 || stale >= 2) {
    predictiveRisk = "elevated";
  } else if (operationalDrift >= 25 || silentRiskDetected) {
    predictiveRisk = "watch";
  }

  let recommendedFocus = "Maintain procurement monitoring rhythm.";

  if (silentRiskDetected) {
    recommendedFocus = "Review silent weakening workflows before visible escalation.";
  }

  if (escalationLikely) {
    recommendedFocus = "Prioritize escalation prevention and supplier continuity.";
  }

  if (recoveryLikely) {
    recommendedFocus = "Push recovering workflows toward closure confirmation.";
  }

  const reasons = [
    operationalDrift >= 45 ? "Operational drift pressure is rising." : null,
    stale > 0 ? `${stale} stale workflow signal(s) detected.` : null,
    critical > 0 ? `${critical} critical signal(s) require attention.` : null,
    high > 0 ? `${high} high-risk signal(s) detected.` : null,
    closure < 45 ? "Average closure probability is weak." : null,
    silentRiskDetected ? "Silent operational risk detected." : null,
    supplierCollapse >= 70 ? "Supplier collapse pressure elevated." : null,
    shortage >= 70 ? "Shortage forecast pressure elevated." : null,
    recoveryLikely ? "Recovery is possible with focused intervention." : null,
  ].filter(Boolean) as string[];

  return {
    cognitionScore,
    trajectory,
    predictiveRisk,
    silentRiskDetected,
    escalationLikely,
    recoveryLikely,
    operationalDrift: Math.round(operationalDrift),
    recommendedFocus,
    reasons: reasons.length ? reasons : ["Procurement cognition remains stable."],
  };
}
