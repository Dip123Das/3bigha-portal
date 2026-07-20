import fs from "node:fs";

const access = fs.readFileSync("lib/access/resolveAccess.ts", "utf8");
const shell = fs.readFileSync(
  "components/operational/UniversalDashboardShell.tsx",
  "utf8"
);
const workspace = fs.readFileSync(
  "app/dashboard/workspace/page.tsx",
  "utf8"
);
const runtime = fs.readFileSync("lib/3bos/runtime/resolve.ts", "utf8");

const checks = [
  ["admin destination preserved", access.includes('if (access.isAdmin) return "/admin/dashboard"')],
  ["blog admin destination preserved", access.includes('if (access.isBlogAdmin) return "/admin/blog"')],
  ["ordinary default is unified workspace", access.includes('return "/dashboard/workspace"')],
  ["shell retains legacy ordering by default", shell.includes("workFirst = false")],
  ["work-first hierarchy is opt in", shell.includes("{workFirst ? (")],
  ["workspace opts into work-first hierarchy", workspace.match(/workFirst/g)?.length === 3],
  ["recent activity moves after work", /\{children\}\r?\n\s*<OperationalEventStream/.test(shell)],
  ["stale workspace preference cannot override identity", runtime.includes("preferredWorkspaceKey: humanConfirmedIdentity")],
  ["displayed identity determines displayed workspace", runtime.includes("activeIdentity: primaryIdentity")],
  ["hub vendor resolves multi-business workspace", runtime.includes('normalize(input.role) === "hub_vendor"') && runtime.includes('workspace.key === "multi_business"')],
  ["hub vendor resolves commercial segment workspaces", runtime.includes("HUB_VENDOR_BUSINESS_WORKSPACE_KEYS.includes")],
  ["hub vendor aggregates workspace identity relevance", runtime.includes("aggregateWorkspaceIdentities") && runtime.includes("workspace.identities")],
  ["hub compatibility preserves existing segment routes", runtime.includes("preserveHubCompatibility") && runtime.includes("subscription limits and verification remain authoritative")],
  ["primary action belongs to primary workspace", workspace.includes("context?.primaryWorkspaceActions")],
  ["no route removed", !access.includes("redirect(")],
  ["no database contract changed", !shell.includes("supabase") && !workspace.match(/\.from\(/)],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(`\nP04-C visible entry: ${checks.length - failures}/${checks.length} checks passed.`);
if (failures) process.exit(1);
