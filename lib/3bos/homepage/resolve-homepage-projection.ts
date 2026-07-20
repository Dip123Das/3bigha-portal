import type {
  HomepageProjection,
  HomepageRuntimeEvidence,
  HomepageWorkspaceAction,
} from "./types";

const PUBLIC_PROJECTION: HomepageProjection = {
  mode: "public",
  workdeskLabel: "Manage My Business",
  workdeskTitle: "Keep your daily business work together.",
  workdeskDescription:
    "After signing in, continue listings, requirements, messages, stock, billing, delivery and other work available to your business.",
  primaryWorkspaceLabel: null,
  primaryWorkspaceHref: "/dashboard",
  primaryWorkspaceActionLabel: "Manage My Business →",
  workspaceActions: [],
};

function isSafeInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function resolveHomepageProjection(
  evidence: HomepageRuntimeEvidence | null | undefined,
): HomepageProjection {
  const runtime = evidence?.runtime;
  const primaryWorkspace = runtime?.workspaces.primary;

  if (
    evidence?.status !== "ready" ||
    !runtime ||
    !runtime.identity.humanConfirmed ||
    runtime.identity.requiresHumanSelection ||
    !primaryWorkspace ||
    primaryWorkspace.status === "future"
  ) {
    return PUBLIC_PROJECTION;
  }

  const seen = new Set<string>();
  const workspaceActions: HomepageWorkspaceAction[] = runtime.availableActions
    .filter(
      (action) =>
        action.workspaceKey === primaryWorkspace.key &&
        action.status !== "future" &&
        isSafeInternalHref(action.href),
    )
    .filter((action) => {
      if (seen.has(action.href)) return false;
      seen.add(action.href);
      return true;
    })
    .slice(0, 5)
    .map((action) => ({
      key: action.key,
      label: action.label,
      description: action.description,
      href: action.href,
    }));

  const landingPath = isSafeInternalHref(primaryWorkspace.landingPath)
    ? primaryWorkspace.landingPath
    : PUBLIC_PROJECTION.primaryWorkspaceHref;

  return {
    mode: "confirmed-workspace",
    workdeskLabel: "Your confirmed business work",
    workdeskTitle: `Continue in ${primaryWorkspace.shortLabel}.`,
    workdeskDescription:
      "Your confirmed work context keeps the relevant daily actions together. You remain in control and can change context at any time.",
    primaryWorkspaceLabel: primaryWorkspace.label,
    primaryWorkspaceHref: landingPath,
    primaryWorkspaceActionLabel: `Open ${primaryWorkspace.shortLabel} →`,
    workspaceActions,
  };
}
