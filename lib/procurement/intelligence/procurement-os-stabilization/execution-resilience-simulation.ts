import type { ProcurementOsStabilization } from "./procurement-os-stabilization";

export function simulateExecutionResilience(
  os: ProcurementOsStabilization
) {
  if (os.stabilizationMode === "simulate_before_action") {
    return {
      simulationMode: "required" as const,
      message:
        "Simulate recovery pressure before preparing automation or wider execution.",
    };
  }

  if (os.executionResilienceScore < 75) {
    return {
      simulationMode: "recommended" as const,
      message:
        "A light resilience check is recommended before scaling workflow actions.",
    };
  }

  return {
    simulationMode: "stable" as const,
    message:
      "Execution resilience is stable under current operating conditions.",
  };
}
