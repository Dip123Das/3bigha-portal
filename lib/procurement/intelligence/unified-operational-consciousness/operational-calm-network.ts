import type { UnifiedOperationalConsciousnessState } from "./unified-operational-consciousness";

export type OperationalCalmNetwork = {
  calmNetworkHealth: number;
  calmNetworkMode:
    | "stable"
    | "guided"
    | "compressed"
    | "recovery";
  explanation: string;
};

export function resolveOperationalCalmNetwork(
  consciousness: UnifiedOperationalConsciousnessState
): OperationalCalmNetwork {
  const mode =
    consciousness.consciousnessMode === "recovery_sync"
      ? "recovery"
      : consciousness.consciousnessMode;

  return {
    calmNetworkHealth: consciousness.calmNetworkHealth,
    calmNetworkMode: mode,
    explanation:
      mode === "recovery"
        ? "Calm network is prioritizing recovery synchronization."
        : mode === "compressed"
          ? "Calm network is compressing attention pressure."
          : mode === "guided"
            ? "Calm network is guiding sequential execution."
            : "Calm network is stable.",
  };
}
