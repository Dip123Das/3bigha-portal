import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { resolveHomepageProjection } from
  "../lib/3bos/homepage/resolve-homepage-projection.ts";

function runtime(overrides = {}) {
  return {
    identity: {
      humanConfirmed: true,
      requiresHumanSelection: false,
      ...overrides.identity,
    },
    workspaces: {
      primary: {
        key: "rental_business",
        label: "Rental Business Workspace",
        shortLabel: "Rental Business",
        status: "production",
        landingPath: "/rentals/my",
        ...overrides.workspace,
      },
    },
    availableActions: [
      {
        key: "my-rentals",
        label: "My Rentals",
        description: "Manage rental listings",
        href: "/rentals/my",
        status: "production",
        workspaceKey: "rental_business",
      },
      {
        key: "future-action",
        label: "Future action",
        description: "Not yet available",
        href: "/future",
        status: "future",
        workspaceKey: "rental_business",
      },
    ],
  };
}

assert.equal(
  resolveHomepageProjection(null).mode,
  "public",
  "visitors without runtime evidence must keep the public homepage",
);

assert.equal(
  resolveHomepageProjection({
    status: "ambiguous",
    runtime: runtime(),
  }).mode,
  "public",
  "ambiguous identity must not personalize the homepage",
);

assert.equal(
  resolveHomepageProjection({
    status: "ready",
    runtime: runtime({ identity: { humanConfirmed: false } }),
  }).mode,
  "public",
  "unconfirmed identity must not personalize the homepage",
);

const confirmed = resolveHomepageProjection({
  status: "ready",
  runtime: runtime(),
});

assert.equal(confirmed.mode, "confirmed-workspace");
assert.equal(confirmed.primaryWorkspaceHref, "/rentals/my");
assert.deepEqual(
  confirmed.workspaceActions.map((action) => action.href),
  ["/rentals/my"],
  "only safe, available actions from the confirmed workspace may be projected",
);

assert.equal(
  resolveHomepageProjection({
    status: "ready",
    runtime: runtime({ workspace: { status: "future" } }),
  }).mode,
  "public",
  "future workspaces must preserve the public fallback",
);

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

for (const journey of ["Build", "Buy", "Sell", "Hire", "Rent", "Manage", "Grow", "Submit Requirement"]) {
  assert.match(page, new RegExp(`"${journey}"`), `homepage must preserve the ${journey} journey`);
}

for (const legacyHref of ["/property", "/materials", "/services", "/rentals", "/rfq", "/dashboard"]) {
  assert.ok(page.includes(legacyHref), `homepage must preserve ${legacyHref}`);
}

for (const prohibited of [
  "Live AI Operations",
  "AI decisions",
  "AI Business Workdesk",
  "AI Business Work Desk",
  "AI Discovery Rails",
]) {
  assert.ok(!page.includes(prohibited), `homepage must not present ${prohibited} as human-facing authority`);
}

assert.ok(page.includes("useOptional3BOSRuntime"));
assert.ok(page.includes("Review the prepared options before you choose"));

console.log("NEEV-H02A homepage assertions passed (runtime, journeys, compatibility and AI posture)");
