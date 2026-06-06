import type { RecoveryForecastIntelligence } from "./recovery-forecast-intelligence";

export function forecastContinuityRisk(
  recovery: RecoveryForecastIntelligence
) {
  const level =
    recovery.escalationForecastRisk >= 60
      ? "high"
      : recovery.escalationForecastRisk >= 40
        ? "moderate"
        : "low";

  return {
    level,
    score: recovery.escalationForecastRisk,
    explanation:
      level === "high"
        ? "Continuity risk may rise unless recovery sequencing is protected."
        : level === "moderate"
          ? "Continuity risk is moderate and should remain calmly monitored."
          : "Continuity risk remains low.",
  };
}
