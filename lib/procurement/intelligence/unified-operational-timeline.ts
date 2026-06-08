import {
  AttentionSeverity,
  getAttentionSeverityRank,
  normalizeAttentionSeverity,
} from "./attention-severity";
import {
  CompressibleOperationalEvent,
  compressOperationalEvents,
} from "./operational-event-compression";

export type UnifiedOperationalEvent = {
  id: string;
  module: string;
  category: string;
  title: string;
  description?: string;
  priority: AttentionSeverity;
  continuityStage?: string;
  operationalImpact: number;
  attentionScore: number;
  timestamp: number;
  source?: string;
  href?: string;
};

export type UnifiedOperationalTimeline = {
  events: UnifiedOperationalEvent[];
  compressed: ReturnType<typeof compressOperationalEvents>;
  highestSeverity: AttentionSeverity;
  unresolvedCount: number;
  attentionScore: number;
};

function toTimestamp(value?: number | string) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function normalizeOperationalEvents(
  events: CompressibleOperationalEvent[] = [],
): UnifiedOperationalEvent[] {
  return events.map((event, index) => {
    const priority = normalizeAttentionSeverity({
      priority: event.priority,
      tone: event.tone,
      score: event.score,
    });

    const rank = getAttentionSeverityRank(priority);

    return {
      id: String(event.id || `${event.module || "operations"}-${index}`),
      module: event.module || "operations",
      category: event.category || event.tone || event.priority || "activity",
      title: event.title || "Operational event",
      description: event.description,
      priority,
      operationalImpact: rank * 20,
      attentionScore: Math.max(Number(event.score || 0), rank * 20),
      timestamp: toTimestamp(event.timestamp),
    };
  });
}

export function resolveOperationalAttention(events: UnifiedOperationalEvent[]) {
  if (!events.length) return "stable" as AttentionSeverity;

  return events
    .map((event) => event.priority)
    .sort((a, b) => getAttentionSeverityRank(b) - getAttentionSeverityRank(a))[0];
}

export function groupContinuityChains(events: UnifiedOperationalEvent[]) {
  return events.reduce<Record<string, UnifiedOperationalEvent[]>>((acc, event) => {
    const key = `${event.module}:${event.continuityStage || event.category}`;
    acc[key] = acc[key] || [];
    acc[key].push(event);
    return acc;
  }, {});
}

export function buildOperationalTimeline(
  rawEvents: CompressibleOperationalEvent[] = [],
): UnifiedOperationalTimeline {
  const events = normalizeOperationalEvents(rawEvents).sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  const compressed = compressOperationalEvents(rawEvents);
  const highestSeverity = resolveOperationalAttention(events);
  const unresolvedCount = events.filter((event) =>
    ["critical", "high", "medium"].includes(event.priority),
  ).length;

  const attentionScore = events.length
    ? Math.round(
        events.reduce((sum, event) => sum + event.attentionScore, 0) /
          events.length,
      )
    : 0;

  return {
    events,
    compressed,
    highestSeverity,
    unresolvedCount,
    attentionScore,
  };
}

export function compressOperationalNoise(events: CompressibleOperationalEvent[] = []) {
  return compressOperationalEvents(events);
}
