export type ThreeBOSEventTone =
  | "neutral"
  | "information"
  | "success"
  | "attention"
  | "warning"
  | "danger";

export type ThreeBOSEventActorType =
  | "human"
  | "business"
  | "system"
  | "ai"
  | "unknown";

export type ThreeBOSEventVisibility =
  | "private"
  | "workspace"
  | "participants"
  | "public";

export type ThreeBOSEventSource =
  | "rfq"
  | "quote"
  | "conversation"
  | "enquiry"
  | "procurement"
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "inventory"
  | "billing"
  | "payment"
  | "dispatch"
  | "delivery"
  | "vendor"
  | "buyer"
  | "workspace"
  | "system"
  | "general";

export type ThreeBOSEvent = {
  id: string;
  type: string;
  source: ThreeBOSEventSource;

  title: string;
  description?: string | null;
  href?: string | null;

  tone: ThreeBOSEventTone;
  visibility: ThreeBOSEventVisibility;

  occurredAt: string;
  createdAt: string;

  actor?: {
    type: ThreeBOSEventActorType;
    id?: string | null;
    label?: string | null;
  } | null;

  workspace?: {
    key?: string | null;
    userId?: string | null;
    businessId?: string | null;
  } | null;

  subject?: {
    type?: string | null;
    id?: string | null;
    label?: string | null;
  } | null;

  journey?: {
    key?: string | null;
    step?: string | null;
  } | null;

  metadata?: Record<string, unknown> | null;
};

export type ThreeBOSEventInput = Omit<
  ThreeBOSEvent,
  "createdAt" | "occurredAt"
> & {
  createdAt?: string | number | Date | null;
  occurredAt?: string | number | Date | null;
};

export type ThreeBOSEventListener = (
  event: ThreeBOSEvent
) => void;

export type ThreeBOSEventQuery = {
  source?: ThreeBOSEventSource | null;
  workspaceKey?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  tone?: ThreeBOSEventTone | null;
  limit?: number | null;
};
