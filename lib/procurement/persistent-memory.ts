export type PersistentProcurementMemory = {
  query: string;
  module?: string;
  source?: string;
  title?: string;
  href?: string;
  timestamp: number;
};

const STORAGE_KEY = "procurement_persistent_memory_v1";

export function readPersistentProcurementMemory() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as PersistentProcurementMemory[];
  } catch {
    return [];
  }
}

export function savePersistentProcurementMemory(
  memory: PersistentProcurementMemory
) {
  if (typeof window === "undefined") return;

  try {
    const existing = readPersistentProcurementMemory();

    const cleaned = existing.filter(
      (item) =>
        !(
          item.query === memory.query &&
          item.module === memory.module
        )
    );

    const next = [memory, ...cleaned].slice(0, 20);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next)
    );
  } catch {}
}

export function rankPersistentProcurementMemory(
  items: PersistentProcurementMemory[]
) {
  const now = Date.now();

  return [...items]
    .map((item) => {
      const ageHours = Math.max(
        0,
        (now - Number(item.timestamp || 0)) / 36e5
      );

      let score = 100;

      if (ageHours > 24) score -= 10;
      if (ageHours > 72) score -= 15;
      if (ageHours > 168) score -= 20;

      const source = String(item.source || "").toLowerCase();
      const module = String(item.module || "").toLowerCase();
      const query = String(item.query || "").toLowerCase();

      if (source.includes("rfq")) score += 25;
      if (source.includes("vendor")) score += 18;
      if (source.includes("search")) score += 10;

      if (module === "materials") score += 10;
      if (module === "services") score += 8;
      if (module === "property") score += 6;
      if (module === "rentals") score += 6;

      if (
        query.includes("urgent") ||
        query.includes("today") ||
        query.includes("tomorrow") ||
        query.includes("need") ||
        query.includes("দরকার") ||
        query.includes("লাগবে")
      ) {
        score += 18;
      }

      if (
        query.includes("cement") ||
        query.includes("rod") ||
        query.includes("steel") ||
        query.includes("sand") ||
        query.includes("brick")
      ) {
        score += 10;
      }

      return {
        ...item,
        intelligenceScore: Math.max(1, Math.round(score)),
      };
    })
    .sort(
      (a, b) =>
        (Number((b as any).intelligenceScore || 0) -
          Number((a as any).intelligenceScore || 0)) ||
        Number(b.timestamp || 0) - Number(a.timestamp || 0)
    );
}

export function clearPersistentProcurementMemory() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}