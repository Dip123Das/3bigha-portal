export type MissionCoherenceSnapshot = {
  timestamp: string;
  coherence: number;
};

export type MissionCoherenceTrend = {
  current: number;
  trend:
    | "stable"
    | "improving"
    | "weakening";
  explanation: string;
};

export function evaluateMissionCoherenceTrend(
  snapshots: MissionCoherenceSnapshot[]
): MissionCoherenceTrend {
  if (snapshots.length < 2) {
    return {
      current: snapshots[0]?.coherence || 100,
      trend: "stable",
      explanation:
        "Additional operational history is required for trend evaluation.",
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];

  const delta = latest.coherence - previous.coherence;

  if (delta >= 8) {
    return {
      current: latest.coherence,
      trend: "improving",
      explanation:
        "Mission sequencing stability is improving across operational flows.",
    };
  }

  if (delta <= -8) {
    return {
      current: latest.coherence,
      trend: "weakening",
      explanation:
        "Mission continuity pressure is increasing and should be stabilized.",
    };
  }

  return {
    current: latest.coherence,
    trend: "stable",
    explanation:
      "Mission coherence remains operationally stable.",
  };
}
