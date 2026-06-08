import { AttentionSeverity, normalizeAttentionSeverity } from "./attention-severity";

export type ContinuityModule =
  | "procurement"
  | "inbox"
  | "vendor"
  | "buyer"
  | "rfq"
  | "rentals"
  | "services"
  | "materials"
  | "operations";

export type UnifiedContinuityState = {
  id: string;
  module: ContinuityModule;
  stage: string;
  health: "healthy" | "watching" | "attention" | "stale" | "blocked";
  severity: AttentionSeverity;
  summary: string;
  updatedAt: number;
  href?: string;
};

export function normalizeContinuityModule(module?: string): ContinuityModule {
  const value = String(module || "operations").toLowerCase();

  if (value.includes("procurement")) return "procurement";
  if (value.includes("inbox")) return "inbox";
  if (value.includes("vendor")) return "vendor";
  if (value.includes("buyer")) return "buyer";
  if (value.includes("rfq")) return "rfq";
  if (value.includes("rental")) return "rentals";
  if (value.includes("service")) return "services";
  if (value.includes("material")) return "materials";

  return "operations";
}

export function normalizeContinuityHealth(value?: string): UnifiedContinuityState["health"] {
  const signal = String(value || "").toLowerCase();

  if (signal.includes("blocked")) return "blocked";
  if (signal.includes("stale")) return "stale";
  if (signal.includes("attention") || signal.includes("risk")) return "attention";
  if (signal.includes("watch")) return "watching";

  return "healthy";
}

export function buildUnifiedContinuityState(input: Partial<UnifiedContinuityState> & {
  priority?: string;
  tone?: string;
}): UnifiedContinuityState {
  const health = normalizeContinuityHealth(input.health);
  const severity = normalizeAttentionSeverity({
    priority: input.priority || input.severity,
    tone: input.tone || health,
    stale: health === "stale",
    blocked: health === "blocked",
  });

  return {
    id: input.id || `${input.module || "operations"}-${Date.now()}`,
    module: normalizeContinuityModule(input.module),
    stage: input.stage || "review",
    health,
    severity,
    summary: input.summary || "Operational continuity preserved.",
    updatedAt: Number(input.updatedAt || Date.now()),
    href: input.href,
  };
}

export function unifyContinuityStates(
  states: Array<Partial<UnifiedContinuityState> & { priority?: string; tone?: string }> = [],
) {
  return states.map(buildUnifiedContinuityState);
}
