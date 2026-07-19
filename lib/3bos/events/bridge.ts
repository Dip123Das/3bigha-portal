import type {
  OperationalEvent,
  OperationalEventModule,
  OperationalEventTone,
} from "@/lib/operational-events/types";

import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

import type {
  ThreeBOSEvent,
  ThreeBOSEventSource,
  ThreeBOSEventTone,
} from "./types";

import {
  normalizeThreeBOSEvent,
} from "./normalize";

const SOURCE_BY_MODULE: Record<
  OperationalEventModule,
  ThreeBOSEventSource
> = {
  inbox: "conversation",
  rfq: "rfq",
  quote: "quote",
  thread: "conversation",
  vendor: "vendor",
  buyer: "buyer",
  procurement: "procurement",
  dispatch: "dispatch",
  billing: "billing",
  inventory: "inventory",
  property: "property",
  services: "services",
  rentals: "rentals",
  materials: "materials",
  general: "general",
};

const TONE_BY_LEGACY_TONE: Record<
  OperationalEventTone,
  ThreeBOSEventTone
> = {
  normal: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "information",
};

function inferEventType(
  event: OperationalEvent
): string {
  const title = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return title
    ? `${event.module}.${title}`
    : `${event.module}.activity`;
}

export function operationalEventToThreeBOSEvent(
  event: OperationalEvent
): ThreeBOSEvent {
  return normalizeThreeBOSEvent({
    id: event.id,
    type: inferEventType(event),
    source:
      SOURCE_BY_MODULE[event.module] ??
      "general",
    title: event.title,
    description: event.detail ?? null,
    href: event.href ?? null,
    tone:
      TONE_BY_LEGACY_TONE[
        event.tone ?? "normal"
      ],
    visibility: "workspace",
    occurredAt: event.createdAt,
    createdAt: event.createdAt,
    metadata: {
      legacyModule: event.module,
      legacyTone: event.tone ?? "normal",
      compatibilitySource:
        "operational-events-v1",
    },
  });
}

export function threeBOSEventToWorkspaceActivity(
  event: ThreeBOSEvent
): WorkspaceSummaryActivity {
  return {
    id: event.id,
    label: event.title,
    description:
      event.description ?? undefined,
    href: event.href ?? undefined,
    occurredAt: event.occurredAt,
    category: event.source,
  };
}
