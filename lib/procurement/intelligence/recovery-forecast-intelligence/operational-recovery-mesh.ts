import type { RecoveryForecastIntelligence } from "./recovery-forecast-intelligence";

export function resolveOperationalRecoveryMesh(
  recovery: RecoveryForecastIntelligence
) {
  if (recovery.recoveryForecastMode === "recovery_first") {
    return {
      mode: "recovery_first" as const,
      label: "Recovery-first",
      message:
        "Handle recovery-sensitive workflows before opening unrelated procurement work.",
    };
  }

  if (recovery.recoveryForecastMode === "watch_delay") {
    return {
      mode: "delay_watch" as const,
      label: "Delay watch",
      message:
        "Delay propagation is being watched; keep related follow-ups grouped.",
    };
  }

  if (recovery.recoveryForecastMode === "guided") {
    return {
      mode: "guided" as const,
      label: "Guided recovery",
      message:
        "Continue guided recovery sequencing with calm workflow pacing.",
    };
  }

  return {
    mode: "stable" as const,
    label: "Recovery stable",
    message:
      "Recovery mesh is stable under current procurement rhythm.",
  };
}
