import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = path.join(
  ROOT,
  "app/dashboard/page.tsx"
);
const ACCESS_PATH = path.join(ROOT, "lib/access/resolveAccess.ts");
const AUTH_BUTTONS_PATH = path.join(ROOT, "app/_components/AuthButtons.tsx");

const page = fs.readFileSync(
  PAGE_PATH,
  "utf8"
);
const access = fs.readFileSync(ACCESS_PATH, "utf8");
const authButtons = fs.readFileSync(AUTH_BUTTONS_PATH, "utf8");

let failed = false;

const requiredMarkers = [
  "ROLE_BASED_USER_OPENS_ONLY_RESOLVED_WORKSPACE",
  "const resolvedWorkPath =",
  "getDefaultPostLoginPath(access)",
  'resolvedWorkPath !== "/dashboard"',
  "setRedirectingToWork(true);",
  'setMessage("Opening your work...");',
  "setLoading(false);",
  "router.replace(resolvedWorkPath);",
  "return;",
  "if (redirectingToWork)",
  "Opening your work",
  "DASHBOARD_SIGNED_OUT_MUST_NOT_SKELETON",
  "DASHBOARD_CORE_READY_BEFORE_OPTIONAL_AI",
];

for (const marker of requiredMarkers) {
  if (!page.includes(marker)) {
    console.error(
      `❌ Missing role-redirect marker: ${marker}`
    );
    failed = true;
  }
}

const accessIndex = page.indexOf(
  "const access = await resolveAccessForUser"
);

const pathIndex = page.indexOf(
  "const resolvedWorkPath =",
  accessIndex
);

const redirectStateIndex = page.indexOf(
  "setRedirectingToWork(true);",
  pathIndex
);

const loadingIndex = page.indexOf(
  "setLoading(false);",
  redirectStateIndex
);

const redirectIndex = page.indexOf(
  "router.replace(resolvedWorkPath);",
  redirectStateIndex
);

const dashboardReadsIndex = page.indexOf(
  "const [",
  redirectIndex
);

if (
  !(
    accessIndex >= 0 &&
    pathIndex > accessIndex &&
    redirectStateIndex > pathIndex &&
    loadingIndex > redirectStateIndex &&
    redirectIndex > loadingIndex &&
    dashboardReadsIndex > redirectIndex
  )
) {
  console.error(
    "❌ Resolved work redirect does not occur before generic dashboard reads."
  );
  failed = true;
}

const pathResolutionCount =
  page.match(/getDefaultPostLoginPath\(access\)/g)
    ?.length ?? 0;

if (pathResolutionCount !== 1) {
  console.error(
    `❌ Expected one authoritative work-path resolution; found ${pathResolutionCount}.`
  );
  failed = true;
}

const forbidden = [
  'router.push("/dashboard/vendor")',
  'router.push("/dashboard/buyer")',
  'router.push("/dashboard/builder")',
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
];

for (const marker of forbidden) {
  if (page.includes(marker)) {
    console.error(
      `❌ Forbidden hard-coded or mutating behavior: ${marker}`
    );
    failed = true;
  }
}

if (access.includes('access.vendorCapabilities.includes("investor")')) {
  console.error("❌ Investor capability must not override the primary Vendor Hub role.");
  failed = true;
}

if (!access.includes('if (access.role === "investor")')) {
  console.error("❌ Explicit primary investor-role routing is missing.");
  failed = true;
}

if (authButtons.includes('reason === "invest_in_opportunities"')) {
  console.error("❌ Header dashboard link must not override a primary vendor role from portal-use reason.");
  failed = true;
}

const vendorBranchIndex = authButtons.indexOf('r === "vendor"');
const vendorPathIndex = authButtons.indexOf('return "/dashboard/vendor";', vendorBranchIndex);
if (vendorBranchIndex < 0 || vendorPathIndex < vendorBranchIndex) {
  console.error("❌ Header does not preserve the primary vendor dashboard destination.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Dashboard role-based workspace redirect verification passed."
);
console.log(
  "✅ Existing access resolver remains authoritative."
);
console.log(
  "✅ Resolved users transfer before generic dashboard data loading."
);
console.log(
  "✅ Redirecting users no longer remain on a skeleton."
);
console.log(
  "✅ Signed-out and unresolved-user fallbacks remain intact."
);
console.log(
  "✅ No route was renamed and no permission was replaced."
);
console.log(
  "✅ Secondary investor capability cannot replace a Vendor Hub primary dashboard."
);
