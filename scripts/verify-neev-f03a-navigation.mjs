import assert from "node:assert/strict";

import { resolveShellNavigation } from
  "../lib/3bos/navigation/resolve-shell-navigation.ts";

const legacyMenus = [
  {
    label: "My Work",
    href: "/dashboard",
    groups: [
      {
        title: "Work Actions",
        links: [["My RFQs", "/dashboard/buyer/rfqs"]],
      },
    ],
  },
];

function runtime(overrides = {}) {
  const primaryWorkspace = {
    key: "rental_business",
    shortLabel: "Rental Business",
    status: "production",
    landingPath: "/rentals/my",
    ...overrides.workspace,
  };

  return {
    identity: {
      suggestions: [{ identity: { key: "rental_business" } }],
      requiresHumanSelection: false,
      humanConfirmed: true,
      ...overrides.identity,
    },
    workspaces: {
      primary: primaryWorkspace,
      available: [primaryWorkspace],
    },
    availableActions: [
      {
        key: "my-rentals",
        label: "My Rentals",
        href: "/rentals/my",
        status: "production",
        workspaceKey: "rental_business",
      },
    ],
  };
}

function resolve(inputRuntime, runtimeStatus = "ready") {
  return resolveShellNavigation({
    menus: structuredClone(legacyMenus),
    showSmart: true,
    runtime: inputRuntime,
    runtimeStatus,
  });
}

assert.equal(
  resolve(runtime())[0].href,
  "/rentals/my",
  "confirmed work context should open its existing workspace landing path"
);

assert.equal(
  resolve(runtime({ identity: { humanConfirmed: false } }))[0].href,
  "/dashboard",
  "unconfirmed identity must preserve the legacy dashboard entry"
);

assert.equal(
  resolve(runtime({ workspace: { status: "future" } }))[0].href,
  "/dashboard",
  "future workspace must preserve the legacy dashboard entry"
);

assert.equal(
  resolve(runtime({ workspace: { landingPath: "rentals/my" } }))[0].href,
  "/dashboard",
  "invalid workspace path must preserve the legacy dashboard entry"
);

assert.equal(
  resolve(runtime(), "uninitialized")[0].href,
  "/dashboard",
  "uninitialized runtime must preserve the legacy dashboard entry"
);

console.log("NEEV-F03A navigation assertions passed (5/5)");
