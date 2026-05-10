export type ProcurementLiveEvent = {
  id: string;
  title: string;
  description: string;
  module: string;
  eventType: string;
  priority: "critical" | "high" | "medium" | "low";
  score: number;
  createdAt: string;
};

function safe(v: unknown) {
  return String(v || "").trim();
}

function priorityFromScore(score: number): ProcurementLiveEvent["priority"] {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function buildProcurementLiveFeed(rows: any[] = []) {
  const events: ProcurementLiveEvent[] = rows.map((row, index) => {
    const eventType = safe(row.event_type || row.type || "procurement_event");
    const moduleName = safe(row.module || "procurement");
    const entityTitle =
      safe(row.entity_title) ||
      safe(row.title) ||
      safe(row.category) ||
      "Procurement Activity";

    const score =
      Number(row.score || row.priority_score || 0) ||
      (eventType.includes("chat") ? 70 : eventType.includes("rfq") ? 80 : 45);

    return {
      id: safe(row.id) || `event-${index}`,
      title: entityTitle,
      description: `${eventType.replace(/_/g, " ")} detected in ${moduleName}.`,
      module: moduleName,
      eventType,
      priority: priorityFromScore(score),
      score: Math.max(1, Math.min(100, Math.round(score))),
      createdAt: safe(row.created_at) || new Date().toISOString(),
    };
  });

  return events.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function summarizeProcurementLiveFeed(events: ProcurementLiveEvent[] = []) {
  const critical = events.filter((e) => e.priority === "critical").length;
  const high = events.filter((e) => e.priority === "high").length;
  const rfq = events.filter((e) => e.module === "rfq").length;
  const chat = events.filter((e) => e.eventType.includes("chat")).length;

  return {
    total: events.length,
    critical,
    high,
    rfq,
    chat,
    health:
      critical > 0
        ? "Critical activity requires immediate review."
        : high > 0
          ? "High-priority procurement events are active."
          : "Procurement live feed is stable.",
  };
}