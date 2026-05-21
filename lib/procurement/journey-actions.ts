export type ProcurementJourneyAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  tone: "primary" | "blue" | "green" | "purple" | "amber";
  updatedAt: number;
};

const KEY = "3bigha.procurement.journey.actions.v1";

export function readProcurementJourneyActions(): ProcurementJourneyAction[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function saveProcurementJourneyAction(action: ProcurementJourneyAction) {
  if (typeof window === "undefined") return;

  try {
    const prev = readProcurementJourneyActions();

    const next = [
      action,
      ...prev.filter((x) => x.id !== action.id),
    ].slice(0, 6);

    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function buildSearchJourneyActions(query: string, module: string): ProcurementJourneyAction[] {
  const q = String(query || "").trim();
  if (!q) return [];

  const encoded = encodeURIComponent(q);
  const mod = module && module !== "all" ? `&module=${encodeURIComponent(module)}` : "";

  return [
    {
      id: `rfq:${q}:${module}`,
      label: "Continue RFQ",
      description: "Convert this search into a vendor-ready requirement.",
      href: `/rfq/general/new?query=${encoded}${mod}`,
      tone: "primary",
      updatedAt: Date.now(),
    },
    {
      id: `vendors:${q}:${module}`,
      label: "Revisit vendors",
      description: "Continue vendor discovery for this procurement need.",
      href: `/vendor/discovery?q=${encoded}${mod}`,
      tone: "green",
      updatedAt: Date.now(),
    },
    {
      id: `price:${q}:${module}`,
      label: "Check price",
      description: "Review price movement before negotiation.",
      href: `/price-today?q=${encoded}`,
      tone: "blue",
      updatedAt: Date.now(),
    },
  ];
}