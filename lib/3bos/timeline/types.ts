import type {
  WorkspaceSummaryActivity,
} from "@/lib/3bos/workspace";

export type WorkspaceTimelineTone =
  | "neutral"
  | "information"
  | "success"
  | "attention"
  | "warning";

export type WorkspaceTimelinePeriod =
  | "today"
  | "yesterday"
  | "earlier"
  | "unknown";

export type WorkspaceTimelineEvent =
  WorkspaceSummaryActivity & {
    normalizedCategory: string;
    tone: WorkspaceTimelineTone;
    period: WorkspaceTimelinePeriod;
    timestamp: number | null;
    humanLabel: string;
    humanDescription: string | null;
  };

export type WorkspaceTimelineProjection = {
  events: WorkspaceTimelineEvent[];
  today: WorkspaceTimelineEvent[];
  yesterday: WorkspaceTimelineEvent[];
  earlier: WorkspaceTimelineEvent[];
  unknown: WorkspaceTimelineEvent[];
  total: number;
  attentionCount: number;
  successCount: number;
  latestEvent: WorkspaceTimelineEvent | null;
};
