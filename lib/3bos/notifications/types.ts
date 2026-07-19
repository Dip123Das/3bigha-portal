import type {
  ThreeBOSEvent,
  ThreeBOSEventSource,
} from "@/lib/3bos/events";

export type WorkspaceNotificationPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type WorkspaceNotificationKind =
  | "action_required"
  | "awaiting_response"
  | "deadline"
  | "success"
  | "warning"
  | "information";

export type WorkspaceNotificationStatus =
  | "unread"
  | "read"
  | "dismissed";

export type WorkspaceNotification = {
  id: string;
  eventId: string;

  kind: WorkspaceNotificationKind;
  priority: WorkspaceNotificationPriority;
  status: WorkspaceNotificationStatus;

  title: string;
  message: string;

  source: ThreeBOSEventSource;
  href?: string | null;

  workspaceKey?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;

  occurredAt: string;
  createdAt: string;

  actionLabel?: string | null;

  metadata?: Record<string, unknown> | null;
};

export type WorkspaceNotificationProjection = {
  notifications: WorkspaceNotification[];

  unread: WorkspaceNotification[];
  urgent: WorkspaceNotification[];
  actionRequired: WorkspaceNotification[];
  awaitingResponse: WorkspaceNotification[];
  deadlines: WorkspaceNotification[];
  successes: WorkspaceNotification[];
  warnings: WorkspaceNotification[];
  information: WorkspaceNotification[];

  total: number;
  unreadCount: number;
  urgentCount: number;
  actionRequiredCount: number;

  highestPriority:
    | WorkspaceNotificationPriority
    | null;

  latest:
    | WorkspaceNotification
    | null;
};

export type WorkspaceNotificationRuleContext = {
  event: ThreeBOSEvent;
  now: Date;
};

export type WorkspaceNotificationRuleResult = {
  kind: WorkspaceNotificationKind;
  priority: WorkspaceNotificationPriority;
  title?: string;
  message?: string;
  actionLabel?: string | null;
};

export type WorkspaceNotificationRule = (
  context: WorkspaceNotificationRuleContext
) => WorkspaceNotificationRuleResult | null;
