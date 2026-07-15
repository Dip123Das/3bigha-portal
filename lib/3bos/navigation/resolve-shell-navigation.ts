import type { MenuItem } from "@/lib/navigation/main-menu";

import type { ThreeBOSRuntimeContextStatus } from "../context";
import type { ThreeBOSRuntime } from "../runtime";

export type ResolveShellNavigationInput = {
  menus: MenuItem[];
  showSmart: boolean;
  runtime: ThreeBOSRuntime | null;
  runtimeStatus: ThreeBOSRuntimeContextStatus;
};

/**
 * Adds constitutional workspace context without replacing legacy navigation.
 *
 * This resolver is presentation-only. It does not authorize access, change a
 * route, write data or decide a person's identity. If runtime context is not
 * ready and unambiguous, the existing menu behavior is returned unchanged.
 */
export function resolveShellNavigation({
  menus,
  showSmart,
  runtime,
  runtimeStatus,
}: ResolveShellNavigationInput): MenuItem[] {
  const legacyVisibleMenus = menus.filter(
    (menu) => showSmart || menu.label !== "Business"
  );

  const primaryWorkspace = runtime?.workspaces.primary ?? null;
  const awaitsHumanConfirmation = Boolean(
    runtime &&
      runtime.identity.suggestions.length > 1 &&
      !runtime.identity.humanConfirmed
  );

  if (
    runtimeStatus !== "ready" ||
    !runtime ||
    !primaryWorkspace ||
    runtime.identity.requiresHumanSelection ||
    awaitsHumanConfirmation
  ) {
    return legacyVisibleMenus;
  }

  const workspaceLinks = runtime.availableActions
    .filter(
      (action) =>
        action.workspaceKey === primaryWorkspace.key &&
        action.status !== "future"
    )
    .map(
      (action): [string, string] => [
        action.label,
        action.href,
      ]
    );

  if (workspaceLinks.length === 0) {
    return legacyVisibleMenus;
  }

  const workspaceHrefs = new Set(
    workspaceLinks.map(([, href]) => href)
  );

  const otherRegisteredWorkspaceLinks = runtime.workspaces.available
    .filter(
      (workspace) =>
        workspace.key !== primaryWorkspace.key &&
        workspace.status !== "future" &&
        workspace.landingPath.startsWith("/") &&
        !workspaceHrefs.has(workspace.landingPath)
    )
    .map(
      (workspace): [string, string] => [
        workspace.shortLabel,
        workspace.landingPath,
      ]
    )
    .filter(([, href], index, links) =>
      links.findIndex(([, candidateHref]) => candidateHref === href) === index
    );

  const presentedWorkspaceHrefs = new Set([
    ...workspaceHrefs,
    ...otherRegisteredWorkspaceLinks.map(([, href]) => href),
  ]);

  const confirmedWorkspaceLandingPath =
    runtime.identity.humanConfirmed &&
    primaryWorkspace.status !== "future" &&
    primaryWorkspace.landingPath.startsWith("/")
      ? primaryWorkspace.landingPath
      : null;

  return legacyVisibleMenus.map((menu) => {
    if (menu.label !== "My Work") return menu;

    return {
      ...menu,
      href: confirmedWorkspaceLandingPath ?? menu.href,
      groups: [
        {
          title: primaryWorkspace.shortLabel,
          links: workspaceLinks,
        },
        ...(otherRegisteredWorkspaceLinks.length > 0
          ? [
              {
                title: "Other registered work",
                links: otherRegisteredWorkspaceLinks,
              },
            ]
          : []),
        ...menu.groups
          .map((group) => ({
            ...group,
            compatibility: true,
            links: group.links.filter(
              ([, href]) => !presentedWorkspaceHrefs.has(href)
            ),
          }))
          .filter((group) => group.links.length > 0),
      ],
    };
  });
}
