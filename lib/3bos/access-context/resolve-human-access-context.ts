import {
  HUMAN_IDENTITY_REGISTRY,
  getPrimaryLegacyIdentitySuggestion,
  resolveLegacyIdentitySuggestions,
} from "../identity";
import {
  getGrowthPlan,
  getGrowthPlanPresentation,
  resolveLegacyGrowthPlan,
} from "../capability";
import {
  getWorkspace,
  getWorkspacesForIdentity,
} from "../workspace";
import type { WorkspaceDefinition } from "../workspace";
import type {
  HumanAccessContext,
  HumanAccessContextInput,
  SubscriptionState,
  VerificationState,
} from "./types";

function resolveSubscriptionState(input: {
  commercialPlan: string;
  status?: string | null;
  expiresAt?: string | null;
}): SubscriptionState {
  if (input.commercialPlan === "free") return "free";

  const status = String(input.status ?? "").trim().toLowerCase();
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt).getTime()
    : null;

  if (
    expiresAt != null &&
    Number.isFinite(expiresAt) &&
    expiresAt <= Date.now()
  ) {
    return "expired";
  }

  if (status === "active") return "active";

  if (
    status === "inactive" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "inactive";
  }

  return "unknown";
}

function resolveVerification(
  value: HumanAccessContextInput["verification"]
): VerificationState {
  return Object.freeze({
    identityVerified: Boolean(value?.identityVerified),
    businessVerified: Boolean(value?.businessVerified),
    locationVerified: Boolean(value?.locationVerified),
  });
}

function uniqueWorkspaces(
  workspaces: WorkspaceDefinition[]
): WorkspaceDefinition[] {
  const seen = new Set<string>();

  return workspaces.filter((workspace) => {
    if (seen.has(workspace.key)) return false;
    seen.add(workspace.key);
    return true;
  });
}

export function resolveHumanAccessContext(
  input: HumanAccessContextInput
): HumanAccessContext {
  const legacySignals = input.legacyIdentitySignals ?? {};
  const identitySuggestions = resolveLegacyIdentitySuggestions(legacySignals);

  const selectedIdentity = input.selectedIdentity
    ? HUMAN_IDENTITY_REGISTRY[input.selectedIdentity]
    : null;

  const primarySuggestion = selectedIdentity
    ? null
    : getPrimaryLegacyIdentitySuggestion(legacySignals);

  const primaryIdentity =
    selectedIdentity ?? primarySuggestion?.identity ?? null;

  const identitySource = selectedIdentity
    ? "selected"
    : primarySuggestion
      ? "legacy_suggestion"
      : "unresolved";

  const applicableWorkspaces = primaryIdentity
    ? getWorkspacesForIdentity(primaryIdentity.key)
    : uniqueWorkspaces(
        identitySuggestions.flatMap((suggestion) =>
          getWorkspacesForIdentity(suggestion.identity.key)
        )
      );

  const requestedWorkspace = input.activeWorkspace
    ? getWorkspace(input.activeWorkspace)
    : null;

  const activeWorkspace =
    requestedWorkspace &&
    applicableWorkspaces.some(
      (workspace) => workspace.key === requestedWorkspace.key
    )
      ? requestedWorkspace
      : applicableWorkspaces[0] ?? null;

  const planResolution = resolveLegacyGrowthPlan(input.commercialPlan);
  const growthPlanDefinition = getGrowthPlan(planResolution.growthPlan);
  const growthPlanPresentation = getGrowthPlanPresentation(
    input.commercialPlan
  );

  return Object.freeze({
    primaryIdentity,
    identitySource,
    identitySuggestions: Object.freeze([...identitySuggestions]),
    legacyRole: legacySignals.role
      ? String(legacySignals.role)
      : null,

    applicableWorkspaces: Object.freeze([...applicableWorkspaces]),
    activeWorkspace,

    commercialPlan: planResolution.legacyPlan,
    growthPlan: planResolution.growthPlan,
    growthPlanDefinition,
    growthPlanPresentation,
    subscriptionState: resolveSubscriptionState({
      commercialPlan: planResolution.legacyPlan,
      status: input.subscriptionStatus,
      expiresAt: input.subscriptionExpiresAt,
    }),
    subscriptionExpiresAt: input.subscriptionExpiresAt ?? null,

    verification: resolveVerification(input.verification),
    readOnly: true,
  });
}
