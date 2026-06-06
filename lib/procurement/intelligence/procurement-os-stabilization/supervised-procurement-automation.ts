import type { ProcurementOsStabilization } from "./procurement-os-stabilization";

export function resolveSupervisedAutomationReadiness(
  os: ProcurementOsStabilization
) {
  const ready =
    os.stabilizationMode === "supervised_automation_ready" ||
    (os.automationReadinessScore >= 75 &&
      os.continuityAutomationSafety >= 75);

  return {
    ready,
    label: ready ? "Automation ready" : "Automation guided",
    message: ready
      ? "Prepare reminders, follow-ups and recovery prompts only with human approval."
      : "Keep automation supervised and limited to guidance until stability improves.",
  };
}
