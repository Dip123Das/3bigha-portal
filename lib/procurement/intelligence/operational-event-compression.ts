import { normalizeAttentionSeverity } from "./attention-severity";

export type CompressibleOperationalEvent = {
  id?: string;
  module?: string;
  category?: string;
  title?: string;
  description?: string;
  priority?: string;
  tone?: string;
  timestamp?: number | string;
  score?: number;
};

export type CompressedOperationalEventCluster = {
  key: string;
  module: string;
  category: string;
  count: number;
  severity: ReturnType<typeof normalizeAttentionSeverity>;
  latestTimestamp: number;
  representative: CompressibleOperationalEvent;
  events: CompressibleOperationalEvent[];
};

function toTime(value?: number | string) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function compressOperationalEvents(
  events: CompressibleOperationalEvent[] = [],
): CompressedOperationalEventCluster[] {
  const clusters = new Map<string, CompressedOperationalEventCluster>();

  for (const event of events) {
    const module = event.module || "operations";
    const category = event.category || event.tone || event.priority || "activity";
    const key = `${module}:${category}`;
    const timestamp = toTime(event.timestamp);
    const severity = normalizeAttentionSeverity({
      priority: event.priority,
      tone: event.tone,
      score: event.score,
    });

    const existing = clusters.get(key);

    if (!existing) {
      clusters.set(key, {
        key,
        module,
        category,
        count: 1,
        severity,
        latestTimestamp: timestamp,
        representative: event,
        events: [event],
      });
      continue;
    }

    existing.count += 1;
    existing.events.push(event);

    if (timestamp >= existing.latestTimestamp) {
      existing.latestTimestamp = timestamp;
      existing.representative = event;
    }

    if (
      normalizeAttentionSeverity({ priority: severity }) === "critical" ||
      severity === "high"
    ) {
      existing.severity = severity;
    }
  }

  return Array.from(clusters.values()).sort(
    (a, b) => b.latestTimestamp - a.latestTimestamp,
  );
}

export function shouldCompressOperationalEvent(event: CompressibleOperationalEvent) {
  const severity = normalizeAttentionSeverity({
    priority: event.priority,
    tone: event.tone,
    score: event.score,
  });

  return severity === "stable" || severity === "watch";
}
