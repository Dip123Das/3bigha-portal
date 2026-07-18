import {
  resolveWorkspaceSummary,
  type WorkspaceSummaryInput,
} from "../summary";

import type {
  WorkspaceKey,
} from "../types";

import type {
  WorkspaceSummaryAdapter,
  WorkspaceSummaryAdapterContext,
  WorkspaceSummaryAdapterResult,
  WorkspaceSummarySignals,
} from "./types";

export type WorkspaceSummaryAdapterPreset = {
  key: string;
  workspaceKeys: readonly WorkspaceKey[];

  /**
   * Used only when supplied signals do not already include
   * recent or attention action keys.
   */
  defaultRecentActionKeys?: readonly string[];
  defaultAttentionActionKeys?: readonly string[];
  defaultRecommendedActionLimit?: number;
};

function normalizeSignalCount(
  value: number | null | undefined
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeSignals(
  signals: WorkspaceSummarySignals | null | undefined
): WorkspaceSummarySignals {
  return {
    pendingWorkCount:
      normalizeSignalCount(signals?.pendingWorkCount),

    unreadConversationCount:
      normalizeSignalCount(
        signals?.unreadConversationCount
      ),

    openRequirementCount:
      normalizeSignalCount(
        signals?.openRequirementCount
      ),

    activeProjectCount:
      normalizeSignalCount(
        signals?.activeProjectCount
      ),

    activeListingCount:
      normalizeSignalCount(
        signals?.activeListingCount
      ),

    alertCount:
      normalizeSignalCount(signals?.alertCount),

    recentActivity: [
      ...(signals?.recentActivity ?? []),
    ],

    recentActionKeys: [
      ...(signals?.recentActionKeys ?? []),
    ],

    attentionActionKeys: [
      ...(signals?.attentionActionKeys ?? []),
    ],

    recommendedActionLimit:
      signals?.recommendedActionLimit ?? null,
  };
}

function createSummaryInput(
  context: WorkspaceSummaryAdapterContext,
  preset: WorkspaceSummaryAdapterPreset
): WorkspaceSummaryInput {
  const signals = normalizeSignals(
    context.signals
  );

  return {
    workspaceKey: context.workspaceKey,

    pendingWorkCount:
      signals.pendingWorkCount,

    unreadConversationCount:
      signals.unreadConversationCount,

    openRequirementCount:
      signals.openRequirementCount,

    activeProjectCount:
      signals.activeProjectCount,

    activeListingCount:
      signals.activeListingCount,

    alertCount:
      signals.alertCount,

    recentActivity:
      signals.recentActivity,

    recentActionKeys:
      signals.recentActionKeys?.length
        ? signals.recentActionKeys
        : [...(preset.defaultRecentActionKeys ?? [])],

    attentionActionKeys:
      signals.attentionActionKeys?.length
        ? signals.attentionActionKeys
        : [
            ...(preset.defaultAttentionActionKeys ??
              []),
          ],

    recommendedActionLimit:
      signals.recommendedActionLimit ??
      preset.defaultRecommendedActionLimit ??
      5,
  };
}

export function createWorkspaceSummaryAdapter(
  preset: WorkspaceSummaryAdapterPreset
): WorkspaceSummaryAdapter {
  const allowedWorkspaceKeys = new Set(
    preset.workspaceKeys
  );

  return {
    key: preset.key,
    workspaceKeys: preset.workspaceKeys,

    adapt(
      context: WorkspaceSummaryAdapterContext
    ): WorkspaceSummaryAdapterResult {
      if (
        !allowedWorkspaceKeys.has(
          context.workspaceKey
        )
      ) {
        throw new Error(
          `Workspace adapter "${preset.key}" cannot adapt workspace "${context.workspaceKey}".`
        );
      }

      const input = createSummaryInput(
        context,
        preset
      );

      return {
        workspaceKey: context.workspaceKey,
        input,
        summary: resolveWorkspaceSummary(input),
      };
    },
  };
}
