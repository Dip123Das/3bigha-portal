import type { ProcurementOsStabilization } from "./procurement-os-stabilization";

export function resolveUnifiedProcurementOsHealth(
  os: ProcurementOsStabilization
) {
  const level =
    os.operatingSystemHealth >= 82
      ? "strong"
      : os.operatingSystemHealth >= 70
        ? "stable"
        : "guided";

  return {
    level,
    summary:
      level === "strong"
        ? "Unified Procurement OS strong"
        : level === "stable"
          ? "Unified Procurement OS stable"
          : "Unified Procurement OS guided",
    explanation: os.explanation,
  };
}
