import type { OperationalEvent } from "./types";

const STORAGE_KEY = "3bigha_operational_events_v1";
const MAX_EVENTS = 12;

export function getOperationalEvents(): OperationalEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as OperationalEvent[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((event) => event?.id && event?.title && event?.module)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

export function saveOperationalEvent(event: OperationalEvent) {
  if (typeof window === "undefined") return;

  try {
    const existing = getOperationalEvents();

    const next = [
      {
        ...event,
        createdAt: event.createdAt || Date.now(),
      },
      ...existing.filter((item) => item.id !== event.id),
    ]
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, MAX_EVENTS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("operational-events-updated"));
  } catch {
    // Ignore storage failures silently.
  }
}

export function clearOperationalEvents() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("operational-events-updated"));
  } catch {
    // Ignore storage failures silently.
  }
}
