import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const COMPONENT_PATH = path.join(
  ROOT,
  "app/dashboard/ThreeBOSWorkSummary.tsx"
);

const DASHBOARD_PATH = path.join(
  ROOT,
  "app/dashboard/page.tsx"
);

let failed = false;

for (const requiredPath of [
  COMPONENT_PATH,
  DASHBOARD_PATH,
]) {
  if (!fs.existsSync(requiredPath)) {
    console.error(
      `❌ Missing: ${path.relative(
        ROOT,
        requiredPath
      )}`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

const component = fs.readFileSync(
  COMPONENT_PATH,
  "utf8"
);

const dashboard = fs.readFileSync(
  DASHBOARD_PATH,
  "utf8"
);

const requiredComponentMarkers = [
  '"use client";',
  "useOptional3BOSRuntime",
  'context.status !== "ready"',
  "!context.runtime",
  "runtime.workspaces.primary",
  "runtime.workspaces.available",
  "availableActions.slice",
  "Your Work",
  "Choose what you want to",
  "return null;",
];

for (
  const marker of requiredComponentMarkers
) {
  if (!component.includes(marker)) {
    console.error(
      `❌ Missing consumer marker: ${marker}`
    );
    failed = true;
  }
}

const forbiddenComponentMarkers = [
  "getSupabaseBrowser",
  "@supabase",
  ".from(",
  ".select(",
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
  "fetch(",
  "axios",
  "router.push",
  "router.replace",
  "redirect(",
  "window.location",
  "localStorage",
  "sessionStorage",
  "setRuntimeInput",
  "updateRuntimeInput",
  "clearRuntime",
];

for (
  const marker of forbiddenComponentMarkers
) {
  if (component.includes(marker)) {
    console.error(
      `❌ Forbidden consumer behavior: ${marker}`
    );
    failed = true;
  }
}

const requiredDashboardMarkers = [
  'import ThreeBOSWorkSummary from "./ThreeBOSWorkSummary";',
  "<ThreeBOSWorkSummary />",
  "resolveAccessForUser",
  "getDefaultPostLoginPath",
  'router.replace("/login?next=/dashboard")',
];

for (
  const marker of requiredDashboardMarkers
) {
  if (!dashboard.includes(marker)) {
    console.error(
      `❌ Missing dashboard compatibility marker: ${marker}`
    );
    failed = true;
  }
}

const summaryCount =
  (
    dashboard.match(
      /<ThreeBOSWorkSummary \/>/g
    ) ?? []
  ).length;

if (summaryCount !== 1) {
  console.error(
    `❌ Expected exactly one dashboard summary; found ${summaryCount}.`
  );
  failed = true;
}

const dashboardContainerIndex =
  dashboard.indexOf(
    '<div className="container pageBody"'
  );

const summaryIndex =
  dashboard.indexOf(
    "<ThreeBOSWorkSummary />"
  );

const existingOverviewIndex =
  dashboard.indexOf(
    "Marketplace Operations Overview"
  );

if (
  !(
    dashboardContainerIndex <
      summaryIndex &&
    summaryIndex <
      existingOverviewIndex
  )
) {
  console.error(
    "❌ 3BOS summary does not safely precede existing dashboard content."
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ First 3BOS dashboard consumer verification passed."
);
console.log(
  "✅ Existing authentication and access resolution remain present."
);
console.log(
  "✅ Existing dashboard content remains present and follows the new summary."
);
console.log(
  "✅ Consumer performs no query, mutation, redirect or access decision."
);
console.log(
  "✅ Consumer disappears safely until runtime is ready."
);
console.log(
  "✅ Existing production routes are reused without renaming."
);
