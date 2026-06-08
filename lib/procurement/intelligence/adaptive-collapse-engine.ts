export type ExecutiveAttentionMode =
  | "focused"
  | "balanced"
  | "monitoring"
  | "critical";

export type IntelligenceDisclosureLevel =
  | "minimal"
  | "summary"
  | "detailed"
  | "full";

export type OperationalDensityMode =
  | "calm"
  | "standard"
  | "dense";

export type AdaptiveCollapseInput = {
  attentionScore?: number;
  priority?: string;
  tone?: string;
  isMobile?: boolean;
  visibleCards?: number;
  totalSignals?: number;
  stale?: boolean;
  blocked?: boolean;
  critical?: boolean;
};

function normalizeSignal(value?: string) {
  return String(value || "").toLowerCase();
}

export function getAttentionPriority(input: AdaptiveCollapseInput): ExecutiveAttentionMode {
  const score = Number(input.attentionScore || 0);
  const signal = `${normalizeSignal(input.priority)} ${normalizeSignal(input.tone)}`;

  if (input.critical || input.blocked || input.stale || signal.includes("critical")) {
    return "critical";
  }

  if (score >= 75 || signal.includes("high") || signal.includes("urgent")) {
    return "focused";
  }

  if (score >= 45 || signal.includes("medium") || signal.includes("watch")) {
    return "balanced";
  }

  return "monitoring";
}

export function getExecutiveDisclosureLevel(
  mode: ExecutiveAttentionMode,
  input: AdaptiveCollapseInput = {},
): IntelligenceDisclosureLevel {
  if (mode === "critical") return "full";
  if (mode === "focused") return input.isMobile ? "summary" : "detailed";
  if (mode === "balanced") return "summary";
  return input.isMobile ? "minimal" : "summary";
}

export function getAdaptiveDensity(
  mode: ExecutiveAttentionMode,
  input: AdaptiveCollapseInput = {},
): OperationalDensityMode {
  if (mode === "critical") return "dense";
  if (input.isMobile) return mode === "focused" ? "standard" : "calm";
  if (Number(input.visibleCards || 0) > 6 || Number(input.totalSignals || 0) > 12) {
    return "calm";
  }
  return "standard";
}

export function shouldCollapsePanel(input: AdaptiveCollapseInput): boolean {
  const mode = getAttentionPriority(input);
  const disclosure = getExecutiveDisclosureLevel(mode, input);

  if (mode === "critical") return false;
  if (input.blocked || input.stale) return false;
  if (disclosure === "minimal") return true;
  if (input.isMobile && mode === "monitoring") return true;
  if (Number(input.visibleCards || 0) > 6 && mode !== "focused") return true;

  return false;
}

export function shouldSuppressLowValueSignals(input: AdaptiveCollapseInput): boolean {
  const mode = getAttentionPriority(input);

  if (mode === "critical" || mode === "focused") return false;
  if (input.isMobile) return true;
  if (Number(input.totalSignals || 0) > 10) return true;

  return mode === "monitoring";
}

export function getAdaptiveVisibleLimit(input: AdaptiveCollapseInput): number {
  const mode = getAttentionPriority(input);
  const density = getAdaptiveDensity(mode, input);

  if (mode === "critical") return input.isMobile ? 6 : 10;
  if (density === "calm") return input.isMobile ? 3 : 5;
  if (density === "dense") return input.isMobile ? 6 : 12;

  return input.isMobile ? 4 : 8;
}
