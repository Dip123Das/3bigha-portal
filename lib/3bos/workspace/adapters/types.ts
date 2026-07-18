import type {
  WorkspaceKey,
} from "../types";

import type {
  WorkspaceSummary,
  WorkspaceSummaryActivity,
  WorkspaceSummaryInput,
} from "../summary";

export type WorkspaceSummarySignals = {
  pendingWorkCount?: number | null;
  unreadConversationCount?: number | null;
  openRequirementCount?: number | null;
  activeProjectCount?: number | null;
  activeListingCount?: number | null;
  alertCount?: number | null;

  recentActivity?: WorkspaceSummaryActivity[] | null;
  recentActionKeys?: string[] | null;
  attentionActionKeys?: string[] | null;

  recommendedActionLimit?: number | null;
};

export type WorkspaceSummaryAdapterContext = {
  workspaceKey: WorkspaceKey;
  signals?: WorkspaceSummarySignals | null;
};

export type WorkspaceSummaryAdapterResult = {
  workspaceKey: WorkspaceKey;
  input: WorkspaceSummaryInput;
  summary: WorkspaceSummary;
};

export type WorkspaceSummaryAdapter = {
  key: string;
  workspaceKeys: readonly WorkspaceKey[];
  adapt(
    context: WorkspaceSummaryAdapterContext
  ): WorkspaceSummaryAdapterResult;
};
