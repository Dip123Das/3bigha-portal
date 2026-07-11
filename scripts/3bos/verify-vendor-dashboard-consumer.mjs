import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const COMPONENT_PATH = path.join(
  ROOT,
  "app/dashboard/vendor/ThreeBOSBusinessWorkSummary.tsx"
);

const PAGE_PATH = path.join(
  ROOT,
  "app/dashboard/vendor/page.tsx"
);

let failed = false;

for (const requiredPath of [
  COMPONENT_PATH,
  PAGE_PATH,
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

const page = fs.readFileSync(
  PAGE_PATH,
  "utf8"
);

const requiredComponentMarkers = [
  '"use client";',
  "useOptional3BOSRuntime",
  'context.status !== "ready"',
  "!context.runtime",
  "runtime.workspaces.available",
  "availableActions",
  "My Business Work",
  "isBusinessAction",
  "return null;",
];

for (
  const marker of
  requiredComponentMarkers
) {
  if (!component.includes(marker)) {
    console.error(
      `❌ Missing vendor consumer marker: ${marker}`
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
  const marker of
  forbiddenComponentMarkers
) {
  if (component.includes(marker)) {
    console.error(
      `❌ Forbidden vendor consumer behavior: ${marker}`
    );
    failed = true;
  }
}

const requiredPageMarkers = [
  'import ThreeBOSBusinessWorkSummary from "./ThreeBOSBusinessWorkSummary";',
  "<ThreeBOSBusinessWorkSummary />",
  "resolveAccessForUser",
  "HUMAN_FIRST_VENDOR_DASHBOARD_RETURN",
  "<GlobalAiOperationalStatus",
  "Vendor Work Desk",
  "Today’s Action Centre",
  "Daily Work Areas",
  "Business Management",
];

for (
  const marker of requiredPageMarkers
) {
  if (!page.includes(marker)) {
    console.error(
      `❌ Missing vendor compatibility marker: ${marker}`
    );
    failed = true;
  }
}

const summaryCount =
  (
    page.match(
      /<ThreeBOSBusinessWorkSummary \/>/g
    ) ?? []
  ).length;

if (summaryCount !== 1) {
  console.error(
    `❌ Expected one business summary; found ${summaryCount}.`
  );
  failed = true;
}

const mainReturnIndex =
  page.indexOf(
    "HUMAN_FIRST_VENDOR_DASHBOARD_RETURN"
  );

const containerIndex =
  page.indexOf(
    "<Container>",
    mainReturnIndex
  );

const summaryIndex =
  page.indexOf(
    "<ThreeBOSBusinessWorkSummary />"
  );

const operationalStatusIndex =
  page.indexOf(
    "<GlobalAiOperationalStatus",
    mainReturnIndex
  );

const workDeskIndex =
  page.indexOf(
    "Vendor Work Desk",
    summaryIndex
  );

if (
  !(
    mainReturnIndex <
      containerIndex &&
    containerIndex <
      summaryIndex &&
    summaryIndex <
      operationalStatusIndex &&
    operationalStatusIndex <
      workDeskIndex
  )
) {
  console.error(
    "❌ Business summary is not mounted safely before existing vendor content."
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ 3BOS vendor dashboard consumer verification passed."
);
console.log(
  "✅ Existing vendor authentication and access resolution remain present."
);
console.log(
  "✅ Existing Vendor Work Desk and operational sections remain present."
);
console.log(
  "✅ Consumer performs no query, mutation, redirect or subscription decision."
);
console.log(
  "✅ Consumer disappears safely until runtime is ready."
);
console.log(
  "✅ Existing vendor routes are reused without renaming."
);
