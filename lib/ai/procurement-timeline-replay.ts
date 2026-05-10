export type ProcurementTimelineStep = {
  id: string;
  title: string;
  description: string;
  module: string;
  eventType: string;
  stage:
    | "created"
    | "matched"
    | "engaged"
    | "negotiation"
    | "risk"
    | "conversion"
    | "memory"
    | "closed";
  score: number;
  createdAt: string;
};

function safe(v: unknown) {
  return String(v || "").trim();
}

function detectStage(eventType: string): ProcurementTimelineStep["stage"] {
  const e = safe(eventType).toLowerCase();

  if (e.includes("rfq_created")) return "created";
  if (e.includes("vendor") || e.includes("match")) return "matched";
  if (e.includes("chat") || e.includes("message")) return "engaged";
  if (e.includes("quote") || e.includes("compare") || e.includes("negotiation")) {
    return "negotiation";
  }
  if (e.includes("risk") || e.includes("sla") || e.includes("anomaly")) return "risk";
  if (e.includes("close") || e.includes("deal")) return "closed";
  if (e.includes("click") || e.includes("view") || e.includes("memory")) return "memory";

  return "memory";
}

export function buildProcurementTimelineReplay(rows: any[] = []) {
  return rows
    .map((row, index): ProcurementTimelineStep => {
      const eventType = safe(row.event_type || row.type || "memory_event");
      const moduleName = safe(row.module || "procurement");
      const title =
        safe(row.entity_title) ||
        safe(row.title) ||
        safe(row.category) ||
        "Procurement Event";

      const score =
        Number(row.score || row.priority_score || 0) ||
        (eventType.includes("rfq") ? 85 : eventType.includes("chat") ? 70 : 45);

      return {
        id: safe(row.id) || `timeline-${index}`,
        title,
        description: `${eventType.replace(/_/g, " ")} captured in ${moduleName}.`,
        module: moduleName,
        eventType,
        stage: detectStage(eventType),
        score: Math.max(1, Math.min(100, Math.round(score))),
        createdAt: safe(row.created_at) || new Date().toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function summarizeProcurementTimelineReplay(
  steps: ProcurementTimelineStep[] = []
) {
  const byStage = steps.reduce<Record<string, number>>((acc, step) => {
    acc[step.stage] = (acc[step.stage] || 0) + 1;
    return acc;
  }, {});

  const latest = steps[steps.length - 1] || null;

  return {
    total: steps.length,
    created: byStage.created || 0,
    matched: byStage.matched || 0,
    engaged: byStage.engaged || 0,
    negotiation: byStage.negotiation || 0,
    risk: byStage.risk || 0,
    conversion: byStage.conversion || 0,
    memory: byStage.memory || 0,
    closed: byStage.closed || 0,
    latestStage: latest?.stage || "memory",
    executiveSummary:
      steps.length === 0
        ? "No procurement timeline events available yet."
        : `Procurement timeline contains ${steps.length} events. Latest stage: ${
            latest?.stage || "memory"
          }.`,
  };
}