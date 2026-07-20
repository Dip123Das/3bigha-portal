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

const [page, hero, journeys, layout, founderPopup, installPrompt] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/home/ConstitutionalHero.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/home/SahajJourney.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/_components/BuildConVendorPopup.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/pwa/PWAInstallPrompt.tsx", import.meta.url), "utf8"),
]);

const homepageSource = [page, hero, journeys].join("\n");

for (const journey of ["Build", "Buy", "Sell", "Hire", "Rent", "Manage", "Grow", "Submit Requirement"]) {
  assert.match(journeys, new RegExp(`title: "${journey}"`), `homepage must preserve the ${journey} journey`);
}

for (const legacyHref of ["/property", "/materials", "/services", "/rentals", "/rfq", "/dashboard"]) {
  assert.ok(homepageSource.includes(legacyHref), `homepage must preserve ${legacyHref}`);
}

for (const prohibited of [
  "Live AI Operations",
  "AI decisions",
  "AI Business Workdesk",
  "AI Business Work Desk",
  "AI Discovery Rails",
]) {
  assert.ok(!homepageSource.includes(prohibited), `homepage must not present ${prohibited} as human-facing authority`);
}

assert.ok(page.includes("useOptional3BOSRuntime"));
assert.ok(homepageSource.includes("Review the prepared options before you choose"));
assert.ok(hero.includes("India&apos;s Human-First Business Operating System"));
assert.ok(hero.includes("you remain in control"));
assert.ok(hero.includes("Manage My Business"));
assert.ok(!hero.includes("Sahaj AI"));
assert.ok(!hero.includes(">RFQ<"));
assert.ok(page.includes('href: "/price-today"'));
assert.ok(!page.includes('scope === "investment" ? "/investment/opportunities"'));
assert.ok(page.includes("lgdLocation"), "homepage discovery must preserve LGD-backed location evidence");
assert.ok(layout.includes("India&apos;s Human-First Business Operating System"));
assert.ok(!page.includes("Marketplace Utility Engine"));
assert.ok(!page.includes("100% Verified"));
assert.ok(!page.includes("RFQs Posted Today"));
assert.ok(!page.includes("Selected high-return"));
assert.ok(founderPopup.includes('pathname === "/"'));
assert.ok(installPrompt.includes('pathname === "/"'));

console.log("NEEV-H02A homepage assertions passed (runtime, journeys, compatibility and AI posture)");
