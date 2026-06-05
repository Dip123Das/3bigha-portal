import type {
  ProcurementMemoryProfileResult,
  ProcurementMemoryReliability,
} from "./procurement-memory-profile";

export type ProcurementMemoryPresentation = {
  label: string;
  shortLabel: string;
  color: string;
  background: string;
  border: string;
  operationalMessage: string;
};

function presentationFromReliability(
  reliability: ProcurementMemoryReliability,
): Omit<ProcurementMemoryPresentation, "operationalMessage"> {
  switch (reliability) {
    case "unknown":
      return {
        label: "No Operational History",
        shortLabel: "Unknown",
        color: "#64748b",
        background: "#f8fafc",
        border: "#e2e8f0",
      };

    case "reliable":
      return {
        label: "Operationally Reliable",
        shortLabel: "Reliable",
        color: "#047857",
        background: "#ecfdf5",
        border: "#a7f3d0",
      };

    case "watch":
      return {
        label: "Monitor Operational Pattern",
        shortLabel: "Watch",
        color: "#2563eb",
        background: "#eff6ff",
        border: "#bfdbfe",
      };

    case "inconsistent":
      return {
        label: "Operational Pattern Inconsistent",
        shortLabel: "Inconsistent",
        color: "#b45309",
        background: "#fffbeb",
        border: "#fde68a",
      };

    case "high_risk":
      return {
        label: "High Operational Risk",
        shortLabel: "Risk",
        color: "#b91c1c",
        background: "#fef2f2",
        border: "#fecaca",
      };
  }
}

export function presentProcurementMemory(
  memory: ProcurementMemoryProfileResult,
): ProcurementMemoryPresentation {
  return {
    ...presentationFromReliability(memory.reliability),
    operationalMessage: memory.operationalMessage,
  };
}
