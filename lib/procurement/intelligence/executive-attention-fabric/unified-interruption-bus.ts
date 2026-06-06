import type { CognitiveSignal } from "@/lib/procurement/intelligence/executive-cognitive-os";

export type UnifiedInterruptionPacket = {
  primary: CognitiveSignal[];
  compressed: CognitiveSignal[];
  duplicateCount: number;
  explanation: string;
};

function signalKey(signal: CognitiveSignal) {
  return [
    signal.workflowId || "",
    signal.rfqId || "",
    signal.vendorId || "",
    signal.source,
    signal.title.toLowerCase().trim(),
  ].join("|");
}

export function routeUnifiedInterruptions(
  signals: CognitiveSignal[]
): UnifiedInterruptionPacket {
  const seen = new Set<string>();
  const primary: CognitiveSignal[] = [];
  const compressed: CognitiveSignal[] = [];
  let duplicateCount = 0;

  for (const signal of signals) {
    const key = signalKey(signal);

    if (seen.has(key)) {
      duplicateCount += 1;
      compressed.push(signal);
      continue;
    }

    seen.add(key);

    if (signal.severity === "critical" || signal.severity === "actionable") {
      primary.push(signal);
    } else {
      compressed.push(signal);
    }
  }

  return {
    primary,
    compressed,
    duplicateCount,
    explanation:
      compressed.length > 0
        ? `${compressed.length} lower-pressure or repeated signal${compressed.length > 1 ? "s were" : " was"} compressed for calmer execution.`
        : "No repeated or low-pressure interruptions required compression.",
  };
}
