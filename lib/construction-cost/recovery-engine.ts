import {
  buildRiskSignals,
  getDelayDays,
  getDelaySeverity,
  getMilestoneTitle,
  isMilestoneBlocked,
  rankSeverity,
} from "./recovery-rules";
import type {
  ConstructionRecoveryMilestone,
  ConstructionRecoveryPlan,
  RecoveryAction,
  RecoverySeverity,
} from "./recovery-types";

function buildActions(
  delayedMilestones: ConstructionRecoveryMilestone[],
  blockedMilestones: ConstructionRecoveryMilestone[],
  overallSeverity: RecoverySeverity,
): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  if (delayedMilestones.length > 0) {
    actions.push({
      type: "buyer_warning",
      title: "Warn project owner about execution delay",
      description:
        "Notify the buyer/project owner that one or more construction milestones are delayed and require immediate supervision.",
      priority: overallSeverity,
      recommendedOwner: "system",
      automationReady: true,
    });

    actions.push({
      type: "schedule_recovery",
      title: "Prepare recovery schedule",
      description:
        "Recalculate the work sequence and compress pending tasks using extra labour, parallel execution, or extended work hours where practical.",
      priority: overallSeverity,
      recommendedOwner: "supervisor",
      automationReady: false,
    });
  }

  if (blockedMilestones.length > 0) {
    actions.push({
      type: "procurement_escalation",
      title: "Escalate blocked procurement items",
      description:
        "Identify materials, labour, equipment, or vendor commitments causing blockage and escalate them through RFQ/vendor communication.",
      priority: "high",
      recommendedOwner: "system",
      automationReady: true,
    });

    actions.push({
      type: "alternate_vendor",
      title: "Suggest alternate vendor action",
      description:
        "Prepare alternate vendor/vendor-shortlist action for delayed materials, labour, or machinery supply.",
      priority: "high",
      recommendedOwner: "system",
      automationReady: true,
    });
  }

  actions.push({
    type: "site_supervision",
    title: "Increase site supervision",
    description:
      "Ask site supervisor/contractor to submit daily progress status until the delayed or blocked milestone is recovered.",
    priority: overallSeverity,
    recommendedOwner: "supervisor",
    automationReady: false,
  });

  return actions;
}

export function generateConstructionRecoveryPlan(params: {
  projectId: string;
  milestones: ConstructionRecoveryMilestone[];
}): ConstructionRecoveryPlan {
  const { projectId, milestones } = params;

  const delayedMilestones = milestones.filter((milestone) => getDelayDays(milestone) > 0);
  const blockedMilestones = milestones.filter(isMilestoneBlocked);
  const riskSignals = buildRiskSignals(milestones);

  const severities = riskSignals.map((signal) => signal.severity);
  const overallSeverity = severities.length ? rankSeverity(severities) : "low";

  const mostCriticalDelayed = delayedMilestones
    .map((milestone) => ({
      milestone,
      delayDays: getDelayDays(milestone),
      severity: getDelaySeverity(getDelayDays(milestone)),
    }))
    .sort((a, b) => b.delayDays - a.delayDays)[0];

  const buyerWarning =
    delayedMilestones.length || blockedMilestones.length
      ? `Execution risk detected. ${delayedMilestones.length} milestone(s) delayed and ${blockedMilestones.length} milestone(s) blocked. Immediate recovery supervision is recommended.`
      : "No major delay or blockage detected at this stage.";

  const procurementEscalation =
    blockedMilestones.length > 0
      ? `Escalate procurement/vendor dependency for: ${blockedMilestones
          .map(getMilestoneTitle)
          .join(", ")}.`
      : delayedMilestones.length > 0
        ? "Check whether material, labour, or equipment procurement is contributing to the delay."
        : "No procurement escalation required now.";

  const alternateVendorSuggestion =
    blockedMilestones.length > 0 || overallSeverity === "critical"
      ? "Prepare alternate vendor shortlist and backup RFQ for delayed material/labour/equipment supply."
      : "Alternate vendor action is not urgent, but backup vendor readiness may be maintained.";

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    overallSeverity,
    delayedMilestones,
    blockedMilestones,
    riskSignals,
    actions: buildActions(delayedMilestones, blockedMilestones, overallSeverity),
    buyerWarning: mostCriticalDelayed
      ? `${buyerWarning} Highest delay: ${getMilestoneTitle(
          mostCriticalDelayed.milestone,
        )} delayed by ${mostCriticalDelayed.delayDays} day(s).`
      : buyerWarning,
    procurementEscalation,
    alternateVendorSuggestion,
    autonomousRecoveryReady:
      blockedMilestones.length > 0 || overallSeverity === "high" || overallSeverity === "critical",
  };
}
