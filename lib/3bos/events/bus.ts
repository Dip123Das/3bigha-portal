import type {
  ThreeBOSEvent,
  ThreeBOSEventInput,
  ThreeBOSEventListener,
  ThreeBOSEventQuery,
} from "./types";

import {
  normalizeThreeBOSEvent,
} from "./normalize";

const STORAGE_KEY =
  "3bigha_3bos_operational_events_v2";

const UPDATE_EVENT =
  "3bos-operational-events-updated";

const MAX_EVENTS = 100;

const listeners =
  new Set<ThreeBOSEventListener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStoredEvents(): ThreeBOSEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (event): event is ThreeBOSEvent =>
          Boolean(
            event &&
            typeof event.id === "string" &&
            typeof event.type === "string" &&
            typeof event.title === "string" &&
            typeof event.occurredAt === "string"
          )
      )
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() -
          new Date(a.occurredAt).getTime()
      )
      .slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

function writeStoredEvents(
  events: ThreeBOSEvent[]
): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        events.slice(0, MAX_EVENTS)
      )
    );

    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT)
    );
  } catch {
    // Operational continuity must not block UI.
  }
}

function matchesQuery(
  event: ThreeBOSEvent,
  query?: ThreeBOSEventQuery | null
): boolean {
  if (!query) return true;

  if (
    query.source &&
    event.source !== query.source
  ) {
    return false;
  }

  if (
    query.workspaceKey &&
    event.workspace?.key !==
      query.workspaceKey
  ) {
    return false;
  }

  if (
    query.subjectType &&
    event.subject?.type !==
      query.subjectType
  ) {
    return false;
  }

  if (
    query.subjectId &&
    event.subject?.id !==
      query.subjectId
  ) {
    return false;
  }

  if (
    query.tone &&
    event.tone !== query.tone
  ) {
    return false;
  }

  return true;
}

export function getThreeBOSEvents(
  query?: ThreeBOSEventQuery | null
): ThreeBOSEvent[] {
  const events = readStoredEvents().filter(
    (event) => matchesQuery(event, query)
  );

  if (
    typeof query?.limit === "number"
  ) {
    return events.slice(
      0,
      Math.max(
        0,
        Math.floor(query.limit)
      )
    );
  }

  return events;
}

export function publishThreeBOSEvent(
  input: ThreeBOSEventInput
): ThreeBOSEvent {
  const event =
    normalizeThreeBOSEvent(input);

  if (isBrowser()) {
    const existing = readStoredEvents();

    const next = [
      event,
      ...existing.filter(
        (item) => item.id !== event.id
      ),
    ].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime()
    );

    writeStoredEvents(next);
  }

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // One listener must not break the bus.
    }
  }

  return event;
}

export function publishThreeBOSEvents(
  inputs: ThreeBOSEventInput[]
): ThreeBOSEvent[] {
  return inputs.map(
    publishThreeBOSEvent
  );
}

export function subscribeThreeBOSEvents(
  listener: ThreeBOSEventListener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function clearThreeBOSEvents(): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );

    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT)
    );
  } catch {
    // Ignore browser storage failures.
  }
}

export const THREE_BOS_EVENT_BUS_UPDATE =
  UPDATE_EVENT;
