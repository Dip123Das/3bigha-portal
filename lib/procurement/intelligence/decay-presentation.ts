import type {
  ProcurementDecayLevel,
  ProcurementDecayResult,
} from "./decay-signals";

export type ProcurementDecayPresentation = {
  label: string;
  shortLabel: string;
  color: string;
  background: string;
  border: string;
  recommendedAction?: string;
};

function presentationFromLevel(
  level: ProcurementDecayLevel,
): ProcurementDecayPresentation {
  switch (level) {
    case "healthy":
      return {
        label: "Operationally Healthy",
        shortLabel: "Healthy",
        color: "#047857",
        background: "#ecfdf5",
        border: "#a7f3d0",
      };

    case "watch":
      return {
        label: "Monitoring Activity",
        shortLabel: "Watch",
        color: "#2563eb",
        background: "#eff6ff",
        border: "#bfdbfe",
      };

    case "slowing":
      return {
        label: "Workflow Slowing",
        shortLabel: "Slowing",
        color: "#b45309",
        background: "#fffbeb",
        border: "#fde68a",
      };

    case "stale":
      return {
        label: "Workflow Becoming Stale",
        shortLabel: "Stale",
        color: "#c2410c",
        background: "#fff7ed",
        border: "#fdba74",
      };

    case "critical":
      return {
        label: "Needs Immediate Attention",
        shortLabel: "Critical",
        color: "#b91c1c",
        background: "#fef2f2",
        border: "#fecaca",
      };
    }
}

export function presentProcurementDecay(
  decay: ProcurementDecayResult,
): ProcurementDecayPresentation {
  return {
    ...presentationFromLevel(decay.level),
    recommendedAction: decay.recommendedAction,
  };
}
