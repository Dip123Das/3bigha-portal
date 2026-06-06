export type CognitiveSignalSeverity =
  | "critical"
  | "actionable"
  | "watch"
  | "passive"
  | "noise";

export type CognitiveSignal = {
  id: string;
  source:
    | "mission_control"
    | "daily_briefing"
    | "procurement_live"
    | "workflow_continuity"
    | "recovery_work_desk"
    | "command_routing"
    | "heartbeat"
    | "unknown";
  title: string;
  detail?: string;
  severity: CognitiveSignalSeverity;
  workflowId?: string;
  vendorId?: string;
  rfqId?: string;
  createdAt?: string;
};

export type ExecutiveCognitiveState = {
  missionCoherence: number;
  cognitiveLoadPressure: number;
  continuityIntegrity: number;
  operationalRhythmStability: number;
  executiveRecoveryHealth: number;
  sequencingEfficiency: number;
  focusResilience: number;
  calmModeRecommended: boolean;
  explanation: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function evaluateExecutiveCognitiveState(
  signals: CognitiveSignal[]
): ExecutiveCognitiveState {
  const total = signals.length || 1;

  const critical = signals.filter((s) => s.severity === "critical").length;
  const actionable = signals.filter((s) => s.severity === "actionable").length;
  const noise = signals.filter((s) => s.severity === "noise").length;

  const uniqueWorkflows = new Set(
    signals.map((s) => s.workflowId || s.rfqId || s.vendorId || s.source)
  ).size;

  const duplicatePressure = Math.max(0, total - uniqueWorkflows);
  const interruptionPressure = critical * 18 + actionable * 9 + noise * 4 + duplicatePressure * 6;

  const cognitiveLoadPressure = clamp(interruptionPressure);
  const missionCoherence = clamp(100 - duplicatePressure * 10 - noise * 6);
  const continuityIntegrity = clamp(100 - critical * 8 - duplicatePressure * 5);
  const operationalRhythmStability = clamp(100 - actionable * 6 - critical * 12);
  const executiveRecoveryHealth = clamp(100 - cognitiveLoadPressure * 0.7);
  const sequencingEfficiency = clamp(100 - duplicatePressure * 8 - noise * 5);
  const focusResilience = clamp(
    (missionCoherence + continuityIntegrity + operationalRhythmStability) / 3
  );

  const explanation: string[] = [];

  if (critical > 0) {
    explanation.push(`${critical} critical signal${critical > 1 ? "s" : ""} need direct attention.`);
  }

  if (duplicatePressure > 0) {
    explanation.push("Repeated workflow signals were detected and should be grouped.");
  }

  if (noise > 0) {
    explanation.push("Low-value interruptions can be batched to protect executive focus.");
  }

  if (!explanation.length) {
    explanation.push("Operational attention is stable and suitable for normal execution.");
  }

  return {
    missionCoherence,
    cognitiveLoadPressure,
    continuityIntegrity,
    operationalRhythmStability,
    executiveRecoveryHealth,
    sequencingEfficiency,
    focusResilience,
    calmModeRecommended: cognitiveLoadPressure >= 55 || focusResilience < 60,
    explanation,
  };
}

export function getExecutiveCognitiveLabel(state: ExecutiveCognitiveState) {
  if (state.calmModeRecommended) return "Calm sequencing recommended";
  if (state.cognitiveLoadPressure >= 35) return "Attention pressure moderate";
  return "Executive attention stable";
}
