import type {
  CognitiveSignal,
  ExecutiveCognitiveState,
} from "@/lib/procurement/intelligence/executive-cognitive-os";

export type SharedExecutiveFocusState = {
  source: "mission_control" | "procurement_live" | "daily_briefing" | "global";
  activeSignalCount: number;
  criticalCount: number;
  actionableCount: number;
  passiveCount: number;
  focusMode:
    | "stable"
    | "guided"
    | "compressed"
    | "recovery";
  recommendedPacing:
    | "normal"
    | "sequential"
    | "batch_low_value"
    | "reduce_interruptions";
  explanation: string;
};

export function createSharedFocusState(
  source: SharedExecutiveFocusState["source"],
  signals: CognitiveSignal[],
  cognitiveState: ExecutiveCognitiveState
): SharedExecutiveFocusState {
  const criticalCount = signals.filter((s) => s.severity === "critical").length;
  const actionableCount = signals.filter((s) => s.severity === "actionable").length;
  const passiveCount = signals.filter(
    (s) => s.severity === "passive" || s.severity === "noise" || s.severity === "watch"
  ).length;

  const focusMode =
    cognitiveState.cognitiveLoadPressure >= 75
      ? "recovery"
      : cognitiveState.cognitiveLoadPressure >= 55
        ? "compressed"
        : cognitiveState.cognitiveLoadPressure >= 35
          ? "guided"
          : "stable";

  const recommendedPacing =
    focusMode === "recovery"
      ? "reduce_interruptions"
      : focusMode === "compressed"
        ? "batch_low_value"
        : focusMode === "guided"
          ? "sequential"
          : "normal";

  return {
    source,
    activeSignalCount: signals.length,
    criticalCount,
    actionableCount,
    passiveCount,
    focusMode,
    recommendedPacing,
    explanation:
      focusMode === "recovery"
        ? "Executive attention pressure is high. Reduce non-essential interruptions and continue sequentially."
        : focusMode === "compressed"
          ? "Multiple operational signals are active. Batch low-value signals to preserve focus."
          : focusMode === "guided"
            ? "Attention pressure is moderate. Continue with guided sequencing."
            : "Executive attention is stable for normal operational flow.",
  };
}
