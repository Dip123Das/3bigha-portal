import type {
  ThreeBOSEvent,
  ThreeBOSEventInput,
  ThreeBOSEventTone,
} from "./types";

function toIsoDate(
  value: string | number | Date | null | undefined,
  fallback: Date
): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? fallback.toISOString()
      : value.toISOString();
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return fallback.toISOString();
}

function normalizeText(
  value: unknown,
  fallback = ""
): string {
  const result = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return result || fallback;
}

function normalizeTone(
  tone: ThreeBOSEventInput["tone"]
): ThreeBOSEventTone {
  const allowed: ThreeBOSEventTone[] = [
    "neutral",
    "information",
    "success",
    "attention",
    "warning",
    "danger",
  ];

  return allowed.includes(tone)
    ? tone
    : "neutral";
}

export function normalizeThreeBOSEvent(
  input: ThreeBOSEventInput,
  now = new Date()
): ThreeBOSEvent {
  const occurredAt = toIsoDate(
    input.occurredAt ??
      input.createdAt,
    now
  );

  const createdAt = toIsoDate(
    input.createdAt,
    now
  );

  return {
    ...input,
    id: normalizeText(
      input.id,
      `3bos-event-${now.getTime()}`
    ),
    type: normalizeText(
      input.type,
      "workspace.activity"
    ),
    source: input.source ?? "general",
    title: normalizeText(
      input.title,
      "Workspace activity"
    ),
    description:
      normalizeText(input.description) || null,
    href: normalizeText(input.href) || null,
    tone: normalizeTone(input.tone),
    visibility:
      input.visibility ?? "workspace",
    occurredAt,
    createdAt,
    actor: input.actor ?? null,
    workspace: input.workspace ?? null,
    subject: input.subject ?? null,
    journey: input.journey ?? null,
    metadata: input.metadata ?? null,
  };
}
