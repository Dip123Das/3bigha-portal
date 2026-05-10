export type BehaviorEvent = {
  userId?: string;
  sessionId?: string;

  module?: "property" | "materials" | "services" | "rentals" | "rfq" | string;

  action:
    | "view"
    | "click"
    | "search"
    | "enquiry"
    | "rfq"
    | "chat"
    | "compare"
    | "shortlist"
    | "call"
    | "recommendation_click";

  entityId?: string;
  entityTitle?: string;

  category?: string;
  type?: string;

  city?: string;
  district?: string;
  locality?: string;

  price?: number | null;

  createdAt?: string;
};

export type BehaviorMemory = {
  totalEvents: number;
  lastAction?: string;
  lastModule?: string;
  hotModules: string[];
  hotCategories: string[];
  hotLocations: string[];
  hotActions: string[];
  estimatedIntentScore: number;
  summary: string;
};

function safe(v: unknown) {
  return String(v || "").trim();
}

function countTop(values: string[], limit = 5) {
  const map = new Map<string, number>();

  values.map(safe).filter(Boolean).forEach((v) => {
    map.set(v, (map.get(v) || 0) + 1);
  });

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function actionWeight(action: string) {
  const key = safe(action).toLowerCase();

  if (key === "rfq") return 25;
  if (key === "enquiry") return 22;
  if (key === "chat") return 20;
  if (key === "call") return 18;
  if (key === "compare") return 15;
  if (key === "shortlist") return 14;
  if (key === "recommendation_click") return 12;
  if (key === "search") return 8;
  if (key === "click") return 6;
  if (key === "view") return 4;

  return 3;
}

export function buildBehaviorMemory(events: BehaviorEvent[] = []): BehaviorMemory {
  const clean = Array.isArray(events) ? events : [];

  const score = Math.min(
    100,
    clean.reduce((sum, event) => sum + actionWeight(event.action), 0)
  );

  const last = clean[0];

  const hotModules = countTop(clean.map((e) => safe(e.module)));
  const hotCategories = countTop(clean.map((e) => safe(e.category)));
  const hotLocations = countTop(
    clean.flatMap((e) => [safe(e.locality), safe(e.city), safe(e.district)])
  );
  const hotActions = countTop(clean.map((e) => safe(e.action)));

  const summary =
    score >= 75
      ? "User behavior shows strong buying or procurement intent."
      : score >= 40
        ? "User behavior shows active discovery and comparison intent."
        : "User behavior is still early-stage and needs broader discovery support.";

  return {
    totalEvents: clean.length,
    lastAction: last?.action,
    lastModule: last?.module,
    hotModules,
    hotCategories,
    hotLocations,
    hotActions,
    estimatedIntentScore: score,
    summary,
  };
}

export function mergeBehaviorSignals(
  memory: BehaviorMemory,
  fallback?: {
    module?: string;
    category?: string;
    city?: string;
    district?: string;
    locality?: string;
  }
) {
  return {
    module: memory.hotModules[0] || fallback?.module || "",
    category: memory.hotCategories[0] || fallback?.category || "",
    location:
      memory.hotLocations[0] ||
      fallback?.locality ||
      fallback?.city ||
      fallback?.district ||
      "",
    intentScore: memory.estimatedIntentScore,
    summary: memory.summary,
  };
}