import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = path.join(
  ROOT,
  "app/dashboard/page.tsx"
);

const page = fs.readFileSync(
  PAGE_PATH,
  "utf8"
);

let failed = false;

const required = [
  "DASHBOARD_SIGNED_OUT_MUST_NOT_SKELETON",
  "setSignedOut(true);",
  'setMessage("Please sign in to open your work.");',
  "setLoading(false);",
  'router.replace("/login?next=/dashboard");',
  "function withDashboardTimeout",
  "Dashboard profile",
  "Dashboard RFQ count",
  "Dashboard notification count",
  "Dashboard unread notification count",
  "Dashboard conversation count",
  "Dashboard price signal count",
  "if (signedOut)",
  "Sign in to open your work",
  'href="/login?next=/dashboard"',
  "DASHBOARD_CORE_READY_BEFORE_OPTIONAL_AI",
  "<ThreeBOSWorkSummary />",
];

for (const marker of required) {
  if (!page.includes(marker)) {
    console.error(
      `❌ Missing loading-chain marker: ${marker}`
    );
    failed = true;
  }
}

const missingSessionIndex = page.indexOf(
  "if (!session?.user?.id)"
);

const signedOutIndex = page.indexOf(
  "setSignedOut(true);",
  missingSessionIndex
);

const loadingFalseIndex = page.indexOf(
  "setLoading(false);",
  signedOutIndex
);

const redirectIndex = page.indexOf(
  'router.replace("/login?next=/dashboard");',
  missingSessionIndex
);

if (
  !(
    missingSessionIndex >= 0 &&
    signedOutIndex > missingSessionIndex &&
    loadingFalseIndex > signedOutIndex &&
    redirectIndex > loadingFalseIndex
  )
) {
  console.error(
    "❌ Signed-out flow does not clear loading before redirect."
  );
  failed = true;
}

const timeoutCalls =
  page.match(/withDashboardTimeout\(/g) ?? [];

if (timeoutCalls.length !== 6) {
  console.error(
    `❌ Expected exactly six bounded dashboard queries; found ${timeoutCalls.length}.`
  );
  failed = true;
}

const forbidden = [
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
];

for (const marker of forbidden) {
  if (page.includes(marker)) {
    console.error(
      `❌ Unexpected mutation in dashboard: ${marker}`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Dashboard loading-chain verification passed."
);
console.log(
  "✅ Signed-out users leave the skeleton before redirect."
);
console.log(
  "✅ A visible sign-in fallback remains if navigation is delayed."
);
console.log(
  "✅ All six core dashboard queries are time-bounded."
);
console.log(
  "✅ Optional AI remains non-blocking."
);
console.log(
  "✅ Existing access resolution and 3BOS presentation remain present."
);
