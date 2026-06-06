import type { CognitiveSignal } from "@/lib/procurement/intelligence/executive-cognitive-os";

export type OperationalMemoryEntry = {
  id: string;
  workflowId: string;
  source: CognitiveSignal["source"];
  title: string;
  severity: CognitiveSignal["severity"];
  rememberedAt: string;
  recurrenceCount: number;
};

export type OperationalMemoryHealth = {
  continuityPersistenceHealth: number;
  interruptionRecurrenceLevel: number;
  executiveContextStability: number;
  operationalMemoryConfidence: number;
  explanation: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildOperationalMemoryEntries(
  signals: CognitiveSignal[],
  now = new Date()
): OperationalMemoryEntry[] {
  return signals.map((signal, index) => ({
    id: signal.id || `memory-${index}`,
    workflowId:
      signal.workflowId ||
      signal.rfqId ||
      signal.vendorId ||
      `${signal.source}-${index}`,
    source: signal.source,
    title: signal.title,
    severity: signal.severity,
    rememberedAt: now.toISOString(),
    recurrenceCount: 1,
  }));
}

export function evaluateOperationalMemoryHealth(
  entries: OperationalMemoryEntry[]
): OperationalMemoryHealth {
  const total = entries.length || 1;
  const critical = entries.filter((e) => e.severity === "critical").length;
  const actionable = entries.filter((e) => e.severity === "actionable").length;

  const workflowGroups = new Map<string, number>();

  for (const entry of entries) {
    workflowGroups.set(entry.workflowId, (workflowGroups.get(entry.workflowId) || 0) + 1);
  }

  const repeatedChains = [...workflowGroups.values()].filter((count) => count > 1).length;

  const interruptionRecurrenceLevel = clamp((repeatedChains / total) * 100 + critical * 10);
  const continuityPersistenceHealth = clamp(100 - repeatedChains * 8 - critical * 6);
  const executiveContextStability = clamp(100 - actionable * 5 - repeatedChains * 10);
  const operationalMemoryConfidence = clamp(
    entries.length >= 3 ? 82 + Math.min(12, entries.length) : 55 + entries.length * 10
  );

  const explanation: string[] = [];

  if (repeatedChains > 0) {
    explanation.push("Repeated operational chains were remembered for continuity protection.");
  }

  if (critical > 0) {
    explanation.push("Critical signals were retained so the executive does not lose unfinished context.");
  }

  if (!explanation.length) {
    explanation.push("Operational memory is stable and suitable for calm continuity tracking.");
  }

  return {
    continuityPersistenceHealth,
    interruptionRecurrenceLevel,
    executiveContextStability,
    operationalMemoryConfidence,
    explanation,
  };
}
