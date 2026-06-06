import type { SituationalCollaborationIntelligence } from "@/lib/procurement/intelligence/situational-collaboration-intelligence";
import type { RecoveryForecastIntelligence } from "@/lib/procurement/intelligence/recovery-forecast-intelligence";
import type { ProcurementContinuityNervousSystem } from "@/lib/procurement/intelligence/procurement-continuity-nervous-system";

export type ProcurementOsStabilization = {
  executionResilienceScore: number;
  automationReadinessScore: number;
  unifiedOsStability: number;
  continuityAutomationSafety: number;
  resilienceSimulationHealth: number;
  operatingSystemHealth: number;
  stabilizationMode:
    | "stable"
    | "guided"
    | "simulate_before_action"
    | "supervised_automation_ready";
  explanation: string;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export function evaluateProcurementOsStabilization(input: {
  collaboration: SituationalCollaborationIntelligence;
  recoveryForecast: RecoveryForecastIntelligence;
  nervousSystem: ProcurementContinuityNervousSystem;
}): ProcurementOsStabilization {
  const executionResilienceScore = clamp(
    (input.nervousSystem.procurementNervousSystemHealth +
      input.recoveryForecast.recoveryPathStability) / 2
  );

  const automationReadinessScore = clamp(
    (input.collaboration.humanCoordinationClarity +
      input.recoveryForecast.continuityForecastHealth) / 2
  );

  const continuityAutomationSafety = clamp(
    (input.collaboration.collaborationContinuityHealth +
      input.nervousSystem.continuityPulseSynchronization) / 2
  );

  const resilienceSimulationHealth = clamp(
    100 - input.recoveryForecast.escalationForecastRisk
  );

  const unifiedOsStability = clamp(
    (executionResilienceScore +
      automationReadinessScore +
      continuityAutomationSafety +
      resilienceSimulationHealth) / 4
  );

  const operatingSystemHealth = unifiedOsStability;

  const stabilizationMode =
    input.recoveryForecast.escalationForecastRisk >= 55
      ? "simulate_before_action"
      : automationReadinessScore >= 78 && continuityAutomationSafety >= 78
        ? "supervised_automation_ready"
        : unifiedOsStability < 74
          ? "guided"
          : "stable";

  const explanation =
    stabilizationMode === "simulate_before_action"
      ? "Run supervised resilience simulation before expanding operational automation."
      : stabilizationMode === "supervised_automation_ready"
        ? "Supervised automation can be prepared with human approval."
        : stabilizationMode === "guided"
          ? "Unified Procurement OS remains guided while stability improves."
          : "Unified Procurement OS remains stable.";

  return {
    executionResilienceScore,
    automationReadinessScore,
    unifiedOsStability,
    continuityAutomationSafety,
    resilienceSimulationHealth,
    operatingSystemHealth,
    stabilizationMode,
    explanation,
  };
}
