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

  if (
    runtimeStatus !== "ready" ||
    !runtime ||
    !primaryWorkspace ||
    runtime.identity.requiresHumanSelection
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

  return legacyVisibleMenus.map((menu) => {
    if (menu.label !== "My Work") return menu;

    return {
      ...menu,
      groups: [
        {
          title: primaryWorkspace.shortLabel,
          links: workspaceLinks,
        },
        ...menu.groups,
      ],
    };
  });
}
