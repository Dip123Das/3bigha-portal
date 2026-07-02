import type { AmeSignal } from "./types";

export function estimateSignalValue(signals: AmeSignal[]): number | null {
  const values = signals
    .map((signal) => signal.metadata?.estimated_value)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return null;

  return Math.round(values.reduce((sum, value) => sum + value, 0));
}
