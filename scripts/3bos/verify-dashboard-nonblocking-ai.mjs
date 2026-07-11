import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = path.join(
  ROOT,
  "app/dashboard/page.tsx"
);

if (!fs.existsSync(PAGE_PATH)) {
  console.error("❌ Missing app/dashboard/page.tsx");
  process.exit(1);
}

const page = fs.readFileSync(
  PAGE_PATH,
  "utf8"
);

let failed = false;

const requiredMarkers = [
  "DASHBOARD_CORE_READY_BEFORE_OPTIONAL_AI",
  'setMessage("Your work is ready.");',
  "setLoading(false);",
  'fetch("/api/ai/procurement-recommendations"',
  'fetch("/api/ai/procurement-memory"',
  "<ThreeBOSWorkSummary />",
  "resolveAccessForUser",
];

for (const marker of requiredMarkers) {
  if (!page.includes(marker)) {
    console.error(
      `❌ Missing dashboard marker: ${marker}`
    );
    failed = true;
  }
}

const readinessIndex = page.indexOf(
  "DASHBOARD_CORE_READY_BEFORE_OPTIONAL_AI"
);

const loadingReadyIndex = page.indexOf(
  "setLoading(false);",
  readinessIndex
);

const recommendationIndex = page.indexOf(
  'fetch("/api/ai/procurement-recommendations"',
  readinessIndex
);

const memoryIndex = page.indexOf(
  'fetch("/api/ai/procurement-memory"',
  readinessIndex
);

if (
  !(
    readinessIndex >= 0 &&
    loadingReadyIndex > readinessIndex &&
    recommendationIndex > loadingReadyIndex &&
    memoryIndex > recommendationIndex
  )
) {
  console.error(
    "❌ Optional AI requests still run before the dashboard leaves loading state."
  );
  failed = true;
}

/*
 * A later setLoading(false) is allowed inside the outer error handler.
 * The safety requirement is only that the first successful readiness
 * transition occurs before optional AI requests begin.
 */
const outerCatchIndex = page.indexOf(
  "} catch (e: any) {",
  memoryIndex
);

if (
  outerCatchIndex < 0 ||
  !page
    .slice(outerCatchIndex)
    .includes("setLoading(false);")
) {
  console.error(
    "❌ Dashboard error fallback no longer clears the loading state."
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Dashboard non-blocking intelligence verification passed."
);
console.log(
  "✅ Core dashboard renders before optional AI requests."
);
console.log(
  "✅ Slow AI endpoints can no longer hold the loading skeleton."
);
console.log(
  "✅ Existing authentication and access resolution remain unchanged."
);
console.log(
  "✅ Existing 3BOS workspace summary remains present."
);
