export type DiscoveryMemoryItem = {
  id: string;
  module: "property" | "materials" | "services" | "rentals";
  title: string;
  href: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  type?: string | null;
  category?: string | null;
  price?: number | null;
  viewedAt: number;
};

const KEY = "3bigha.discovery.memory.v1";

export function readDiscoveryMemory(): DiscoveryMemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function rememberDiscoveryView(item: Omit<DiscoveryMemoryItem, "viewedAt">) {
  if (typeof window === "undefined") return;

  const next: DiscoveryMemoryItem = {
    ...item,
    viewedAt: Date.now(),
  };

  const previous = readDiscoveryMemory().filter(
    (x) => !(x.module === item.module && x.id === item.id)
  );

  window.localStorage.setItem(KEY, JSON.stringify([next, ...previous].slice(0, 24)));
}

export function scorePersonalizedDiscoveryRow(
  row: {
    id?: string | null;
    title?: string | null;
    city?: string | null;
    district?: string | null;
    locality?: string | null;
    type?: string | null;
    category?: string | null;
    price?: number | null;
    expected_price?: number | null;
  },
  memory: DiscoveryMemoryItem[]
) {
  if (!memory.length) return 0;

  const text = `${row.title || ""} ${row.city || ""} ${row.district || ""} ${row.locality || ""} ${row.type || ""} ${row.category || ""}`.toLowerCase();

  let score = 0;

  for (const item of memory.slice(0, 12)) {
    const recency = Math.max(0.25, 1 - (Date.now() - item.viewedAt) / 1000 / 60 / 60 / 24 / 14);

    if (item.city && row.city && item.city.toLowerCase() === row.city.toLowerCase()) score += 18 * recency;
    if (item.district && row.district && item.district.toLowerCase() === row.district.toLowerCase()) score += 12 * recency;
    if (item.locality && row.locality && item.locality.toLowerCase() === row.locality.toLowerCase()) score += 24 * recency;
    if (item.type && text.includes(item.type.toLowerCase())) score += 10 * recency;
    if (item.category && text.includes(item.category.toLowerCase())) score += 8 * recency;
  }

  return Math.round(score);
}