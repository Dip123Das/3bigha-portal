import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

import type {
  WorkspaceTimelineEvent,
  WorkspaceTimelinePeriod,
  WorkspaceTimelineProjection,
  WorkspaceTimelineTone,
} from "./types";

const SUCCESS_WORDS = [
  "accepted",
  "approved",
  "completed",
  "closed",
  "delivered",
  "paid",
  "published",
  "resolved",
  "success",
];

const ATTENTION_WORDS = [
  "awaiting",
  "due",
  "new",
  "open",
  "pending",
  "received",
  "reply",
  "required",
  "urgent",
];

const WARNING_WORDS = [
  "cancelled",
  "declined",
  "failed",
  "overdue",
  "rejected",
  "risk",
  "spam",
];

const INFORMATION_WORDS = [
  "created",
  "draft",
  "message",
  "quote",
  "submitted",
  "updated",
  "viewed",
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(value: string): string {
  if (!value) return "";

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function includesAny(
  text: string,
  words: string[]
): boolean {
  return words.some((word) =>
    text.includes(word)
  );
}

function resolveTone(
  activity: WorkspaceSummaryActivity
): WorkspaceTimelineTone {
  const searchable = normalizeText(
    [
      activity.label,
      activity.description,
      activity.category,
    ].join(" ")
  ).toLowerCase();

  if (includesAny(searchable, WARNING_WORDS)) {
    return "warning";
  }

  if (includesAny(searchable, SUCCESS_WORDS)) {
    return "success";
  }

  if (includesAny(searchable, ATTENTION_WORDS)) {
    return "attention";
  }

  if (
    includesAny(
      searchable,
      INFORMATION_WORDS
    )
  ) {
    return "information";
  }

  return "neutral";
}

function startOfDayTimestamp(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

function resolvePeriod(
  timestamp: number | null,
  now: Date
): WorkspaceTimelinePeriod {
  if (timestamp === null) {
    return "unknown";
  }

  const todayStart = startOfDayTimestamp(now);
  const yesterdayStart =
    todayStart - 24 * 60 * 60 * 1000;

  if (timestamp >= todayStart) {
    return "today";
  }

  if (timestamp >= yesterdayStart) {
    return "yesterday";
  }

  return "earlier";
}

function humanizeCategory(
  category?: string | null
): string {
  const normalized = normalizeText(
    category || "activity"
  ).toLowerCase();

  const known: Record<string, string> = {
    rfq: "RFQ",
    procurement: "Procurement",
    conversation: "Conversation",
    conversations: "Conversation",
    enquiry: "Enquiry",
    enquiries: "Enquiry",
    listing: "Listing",
    property: "Property",
    materials: "Materials",
    material: "Materials",
    service: "Service",
    services: "Service",
    rental: "Rental",
    rentals: "Rental",
    payment: "Payment",
    delivery: "Delivery",
    dispatch: "Dispatch",
  };

  return (
    known[normalized] ??
    sentenceCase(normalized)
  );
}

function humanizeLabel(
  activity: WorkspaceSummaryActivity
): string {
  const label = normalizeText(activity.label);

  return label
    ? sentenceCase(label)
    : "Workspace activity";
}

function humanizeDescription(
  activity: WorkspaceSummaryActivity
): string | null {
  const description = normalizeText(
    activity.description
  );

  if (!description) {
    return null;
  }

  const statusMatch =
    description.match(/^status\s*:\s*(.+)$/i);

  if (statusMatch) {
    const status = sentenceCase(
      normalizeText(statusMatch[1])
    );

    return `Current status: ${status}.`;
  }

  return sentenceCase(description);
}

function parseTimestamp(
  value?: string | null
): number | null {
  if (!value) return null;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function eventIdentity(
  event: WorkspaceTimelineEvent
): string {
  return [
    event.id,
    event.humanLabel.toLowerCase(),
    event.timestamp ?? "unknown",
  ].join(":");
}

export function projectWorkspaceTimeline(
  activity:
    | WorkspaceSummaryActivity[]
    | null
    | undefined,
  options?: {
    now?: Date;
    limit?: number;
  }
): WorkspaceTimelineProjection {
  const now = options?.now ?? new Date();

  const projected = (activity ?? []).map(
    (item): WorkspaceTimelineEvent => {
      const timestamp = parseTimestamp(
        item.occurredAt
      );

      return {
        ...item,
        normalizedCategory:
          humanizeCategory(item.category),
        tone: resolveTone(item),
        period: resolvePeriod(timestamp, now),
        timestamp,
        humanLabel: humanizeLabel(item),
        humanDescription:
          humanizeDescription(item),
      };
    }
  );

  const deduplicated =
    Array.from(
      new Map(
        projected.map((event) => [
          eventIdentity(event),
          event,
        ])
      ).values()
    );

  deduplicated.sort((a, b) => {
    if (
      a.timestamp === null &&
      b.timestamp === null
    ) {
      return 0;
    }

    if (a.timestamp === null) return 1;
    if (b.timestamp === null) return -1;

    return b.timestamp - a.timestamp;
  });

  const events =
    typeof options?.limit === "number"
      ? deduplicated.slice(
          0,
          Math.max(
            0,
            Math.floor(options.limit)
          )
        )
      : deduplicated;

  return {
    events,
    today: events.filter(
      (event) => event.period === "today"
    ),
    yesterday: events.filter(
      (event) =>
        event.period === "yesterday"
    ),
    earlier: events.filter(
      (event) =>
        event.period === "earlier"
    ),
    unknown: events.filter(
      (event) =>
        event.period === "unknown"
    ),
    total: events.length,
    attentionCount: events.filter(
      (event) =>
        event.tone === "attention" ||
        event.tone === "warning"
    ).length,
    successCount: events.filter(
      (event) => event.tone === "success"
    ).length,
    latestEvent: events[0] ?? null,
  };
}
