import type { BtceEvidenceSignal } from "@/lib/btce/shared/btce-types";

function clampConfidence(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeBieSignal(
  signal: BtceEvidenceSignal
): BtceEvidenceSignal {
  return {
    ...signal,
    key: signal.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    label: signal.label.trim(),
    confidence: clampConfidence(signal.confidence),
    explanation: signal.explanation?.trim() || null,
  };
}

export function mergeBieSignals(
  signals: BtceEvidenceSignal[]
): BtceEvidenceSignal[] {
  const merged = new Map<string, BtceEvidenceSignal>();

  for (const input of signals.map(normalizeBieSignal)) {
    const existing = merged.get(input.key);

    if (!existing) {
      merged.set(input.key, input);
      continue;
    }

    const existingConfidence = existing.confidence ?? -1;
    const nextConfidence = input.confidence ?? -1;

    if (nextConfidence > existingConfidence) {
      merged.set(input.key, input);
    }
  }

  return [...merged.values()];
}
