import type {
  WorkspaceSummary,
  WorkspaceSummaryAction,
  WorkspaceSummaryActivity,
  WorkspaceSummaryMetric,
} from "@/lib/3bos/workspace";

export type WorkspaceCommandAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  reason:
    | "attention"
    | "continue_work"
    | "primary"
    | "discovery";
  priority: number;
  onSelect?: () => void;
};

export type WorkspaceCommandCenterProps = {
  summary: WorkspaceSummary;
  continueActions: WorkspaceCommandAction[];
  quickActions: WorkspaceCommandAction[];
  priorities?: WorkspaceSummaryAction[];
  metrics?: WorkspaceSummaryMetric[];
  recentActivity?: WorkspaceSummaryActivity[];
  activityLimit?: number;
};
