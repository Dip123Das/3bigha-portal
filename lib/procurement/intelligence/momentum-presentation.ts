import type {
  ProcurementMomentumLevel,
  ProcurementMomentumResult,
} from "./momentum-signals";

export type ProcurementMomentumPresentation = {
  label: string;
  shortLabel: string;
  color: string;
  background: string;
  border: string;
  operationalMessage: string;
};

function presentationFromLevel(
  level: ProcurementMomentumLevel,
): Omit<ProcurementMomentumPresentation, "operationalMessage"> {
  switch (level) {
    case "slow":
      return {
        label: "Limited Momentum",
        shortLabel: "Slow",
        color: "#64748b",
        background: "#f8fafc",
        border: "#e2e8f0",
      };

    case "stable":
      return {
        label: "Stable Momentum",
        shortLabel: "Stable",
        color: "#2563eb",
        background: "#eff6ff",
        border: "#bfdbfe",
      };

    case "active":
      return {
        label: "Active Momentum",
        shortLabel: "Active",
        color: "#047857",
        background: "#ecfdf5",
        border: "#a7f3d0",
      };

    case "accelerating":
      return {
        label: "Momentum Accelerating",
        shortLabel: "Accelerating",
        color: "#7c3aed",
        background: "#f5f3ff",
        border: "#ddd6fe",
      };
    }
}

export function presentProcurementMomentum(
  momentum: ProcurementMomentumResult,
): ProcurementMomentumPresentation {
  return {
    ...presentationFromLevel(momentum.level),
    operationalMessage: momentum.operationalMessage,
  };
}
