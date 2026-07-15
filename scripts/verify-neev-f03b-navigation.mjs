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
        links: [
          ["My RFQs", "/dashboard/buyer/rfqs"],
          ["Legacy Property", "/property/my"],
        ],
      },
    ],
  },
];

function runtime(overrides = {}) {
  const primary = {
    key: "rental_business",
    shortLabel: "Rental Business",
    status: "production",
    landingPath: "/rentals/my",
  };

  return {
    identity: {
      suggestions: [
        { identity: { key: "rental_business" } },
        { identity: { key: "material_business" } },
      ],
      requiresHumanSelection: false,
      humanConfirmed: true,
      ...overrides.identity,
    },
    workspaces: {
      primary,
      available: [
        primary,
        {
          key: "material_business",
          shortLabel: "Material Business",
          status: "production",
          landingPath: "/materials/my",
        },
        {
          key: "property",
          shortLabel: "Property",
          status: "production",
          landingPath: "/property/my",
        },
        {
          key: "future_workspace",
          shortLabel: "Future Work",
          status: "future",
          landingPath: "/future",
        },
        {
          key: "invalid_workspace",
          shortLabel: "Invalid Work",
          status: "production",
          landingPath: "invalid",
        },
      ],
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
  })[0];
}

const confirmedMenu = resolve(runtime());
const otherWork = confirmedMenu.groups.find(
  (group) => group.title === "Other registered work"
);

assert.deepEqual(
  otherWork?.links,
  [
    ["Material Business", "/materials/my"],
    ["Property", "/property/my"],
  ],
  "confirmed focus should retain every other registered non-future workspace"
);

assert.equal(
  confirmedMenu.groups[0].title,
  "Rental Business",
  "confirmed workspace must remain the first focused group"
);

assert.equal(
  confirmedMenu.groups.at(-1)?.links.some(
    ([, href]) => href === "/property/my"
  ),
  false,
  "compatibility groups must not duplicate registered workspace landings"
);

assert.equal(
  resolve(runtime({ identity: { humanConfirmed: false } })).groups.some(
    (group) => group.title === "Other registered work"
  ),
  false,
  "unconfirmed context must preserve the unchanged legacy menu"
);

assert.equal(
  resolve(runtime(), "uninitialized").groups.some(
    (group) => group.title === "Other registered work"
  ),
  false,
  "uninitialized runtime must preserve the unchanged legacy menu"
);

console.log("NEEV-F03B navigation assertions passed (5/5)");
