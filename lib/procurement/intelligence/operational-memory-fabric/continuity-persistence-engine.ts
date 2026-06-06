import type { OperationalMemoryEntry } from "./operational-memory-fabric";

export type ContinuityPersistenceResult = {
  resurfacedWorkflows: OperationalMemoryEntry[];
  preservedCount: number;
  explanation: string;
};

export function preserveContinuityContext(
  entries: OperationalMemoryEntry[]
): ContinuityPersistenceResult {
  const important = entries.filter(
    (entry) =>
      entry.severity === "critical" ||
      entry.severity === "actionable" ||
      entry.recurrenceCount > 1
  );

  return {
    resurfacedWorkflows: important.slice(0, 6),
    preservedCount: important.length,
    explanation:
      important.length > 0
        ? `${important.length} unfinished or important workflow${important.length > 1 ? "s were" : " was"} preserved for continuity.`
        : "No unfinished workflow needed continuity resurfacing.",
  };
}
