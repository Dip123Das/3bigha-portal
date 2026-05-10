function safe(value: unknown) {
  return String(value || "").trim();
}

function isLikelyId(value: string) {
  const v = safe(value);

  if (!v) return false;

  if (/^[0-9a-f]{8,}-[0-9a-f-]{8,}$/i.test(v)) return true;
  if (/^[A-Za-z0-9_-]{14,}$/.test(v) && !/\s/.test(v)) return true;

  return false;
}

export function normalizeMemoryLabel(
  value: unknown,
  fallback = "Learning"
) {
  const raw = safe(value);

  if (!raw) return fallback;

  if (isLikelyId(raw)) return fallback;

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function normalizeMemoryList(
  values: unknown[],
  fallback = "Learning"
) {
  const cleaned = values
    .map((v) => normalizeMemoryLabel(v, ""))
    .filter(Boolean)
    .filter((v) => v !== "Learning");

  return cleaned.length ? cleaned : [fallback];
}

export function normalizeModuleLabel(value: unknown) {
  const v = safe(value).toLowerCase();

  if (v === "rfq") return "RFQ";
  if (v === "property") return "Property";
  if (v === "materials") return "Materials";
  if (v === "services") return "Services";
  if (v === "rentals") return "Rentals";
  if (v === "investment") return "Investment";
  if (v === "direct") return "Direct Chat";

  return normalizeMemoryLabel(value, "Learning");
}

export function normalizeActionLabel(value: unknown) {
  const v = safe(value).toLowerCase();

  if (v === "rfq") return "RFQ Created";
  if (v === "chat") return "Chat Activity";
  if (v === "compare") return "Quote Comparison";
  if (v === "view") return "Viewed";
  if (v === "search") return "Search";
  if (v === "enquiry") return "Enquiry";
  if (v === "shortlist") return "Shortlisted";
  if (v === "call") return "Call Intent";
  if (v === "recommendation_click") return "Recommendation Click";

  return normalizeMemoryLabel(value, "Learning");
}

export function normalizeBehaviorMemory(memory: {
  hotModules?: string[];
  hotCategories?: string[];
  hotLocations?: string[];
  hotActions?: string[];
}) {
  return {
    hotModules: normalizeMemoryList(
      (memory.hotModules || []).map(normalizeModuleLabel)
    ),
    hotCategories: normalizeMemoryList(memory.hotCategories || []),
    hotLocations: normalizeMemoryList(memory.hotLocations || []),
    hotActions: normalizeMemoryList(
      (memory.hotActions || []).map(normalizeActionLabel)
    ),
  };
}