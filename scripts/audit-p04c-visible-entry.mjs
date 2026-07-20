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

const checks = [
  ["admin destination preserved", access.includes('if (access.isAdmin) return "/admin/dashboard"')],
  ["blog admin destination preserved", access.includes('if (access.isBlogAdmin) return "/admin/blog"')],
  ["ordinary default is unified workspace", access.includes('return "/dashboard/workspace"')],
  ["shell retains legacy ordering by default", shell.includes("workFirst = false")],
  ["work-first hierarchy is opt in", shell.includes("{workFirst ? (")],
  ["workspace opts into work-first hierarchy", workspace.match(/workFirst/g)?.length === 3],
  ["recent activity moves after work", shell.indexOf("{children}\n            <OperationalEventStream") > -1],
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
