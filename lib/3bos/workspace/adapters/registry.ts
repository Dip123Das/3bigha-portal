import type {
  WorkspaceKey,
} from "../types";

import type {
  WorkspaceSummaryAdapter,
  WorkspaceSummaryAdapterContext,
  WorkspaceSummaryAdapterResult,
} from "./types";

import {
  builderWorkspaceSummaryAdapter,
  customerWorkspaceSummaryAdapter,
  financeWorkspaceSummaryAdapter,
  investmentWorkspaceSummaryAdapter,
  materialWorkspaceSummaryAdapter,
  operationsWorkspaceSummaryAdapter,
  propertyWorkspaceSummaryAdapter,
  rentalWorkspaceSummaryAdapter,
  serviceWorkspaceSummaryAdapter,
} from "./presets";

export const WORKSPACE_SUMMARY_ADAPTERS:
  readonly WorkspaceSummaryAdapter[] = [
    customerWorkspaceSummaryAdapter,
    propertyWorkspaceSummaryAdapter,
    builderWorkspaceSummaryAdapter,
    serviceWorkspaceSummaryAdapter,
    materialWorkspaceSummaryAdapter,
    rentalWorkspaceSummaryAdapter,
    financeWorkspaceSummaryAdapter,
    investmentWorkspaceSummaryAdapter,
    operationsWorkspaceSummaryAdapter,
  ];

const WORKSPACE_ADAPTER_BY_KEY = new Map<
  WorkspaceKey,
  WorkspaceSummaryAdapter
>();

for (const adapter of WORKSPACE_SUMMARY_ADAPTERS) {
  for (const workspaceKey of adapter.workspaceKeys) {
    if (
      WORKSPACE_ADAPTER_BY_KEY.has(workspaceKey)
    ) {
      throw new Error(
        `Duplicate workspace summary adapter registration for "${workspaceKey}".`
      );
    }

    WORKSPACE_ADAPTER_BY_KEY.set(
      workspaceKey,
      adapter
    );
  }
}

export function findWorkspaceSummaryAdapter(
  workspaceKey: WorkspaceKey
): WorkspaceSummaryAdapter | null {
  return (
    WORKSPACE_ADAPTER_BY_KEY.get(workspaceKey) ??
    null
  );
}

export function getWorkspaceSummaryAdapter(
  workspaceKey: WorkspaceKey
): WorkspaceSummaryAdapter {
  const adapter =
    findWorkspaceSummaryAdapter(workspaceKey);

  if (!adapter) {
    throw new Error(
      `Workspace summary adapter not found for "${workspaceKey}".`
    );
  }

  return adapter;
}

export function adaptWorkspaceSummary(
  context: WorkspaceSummaryAdapterContext
): WorkspaceSummaryAdapterResult {
  return getWorkspaceSummaryAdapter(
    context.workspaceKey
  ).adapt(context);
}

export function getRegisteredWorkspaceAdapterKeys(): WorkspaceKey[] {
  return [...WORKSPACE_ADAPTER_BY_KEY.keys()];
}
