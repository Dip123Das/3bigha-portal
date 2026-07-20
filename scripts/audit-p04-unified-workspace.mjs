import fs from "node:fs";

const pagePath = "app/dashboard/workspace/page.tsx";
const cssPath = "app/dashboard/workspace/workspace.module.css";

const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const checks = [
  ["preferred route exists", fs.existsSync(pagePath)],
  ["responsive styles exist", fs.existsSync(cssPath) && css.includes("@media")],
  ["canonical runtime is consumed", page.includes("useOptional3BOSRuntime")],
  ["canonical resolved actions are consumed", page.includes("primaryWorkspaceActions") && page.includes("crossWorkspaceActions")],
  ["each action resolves to one operating area", page.includes("resolveOperatingArea(action) === area.key")],
  ["current cards use only primary workspace actions", page.includes("const areaActions = primaryActions.filter")],
  ["other workspaces are user disclosed", page.includes("showingOtherWork") && page.includes("Other workspaces")],
  ["work context chooser is user disclosed", page.includes("changingContext") && page.includes("Change work context")],
  ["inactive areas do not bypass resolution", page.includes("This area is not active") && !page.includes("fallbackHref")],
  ["human identity choice is preserved", page.includes("ThreeBOSWorkContextChooser")],
  ["signed-out users retain next route", page.includes("/login?next=/dashboard/workspace")],
  ["legacy dashboard remains linked", page.includes('href="/dashboard"')],
  ["marketplace area exists", page.includes('label: "Marketplace"')],
  ["procurement area exists", page.includes('label: "Procurement"')],
  ["business area exists", page.includes('label: "Business"')],
  ["finance area exists", page.includes('label: "Finance"')],
  ["projects area exists", page.includes('label: "Projects"')],
  ["assistance area exists", page.includes('label: "Assistance"')],
  ["no database mutation introduced", !page.match(/\.from\(|\.insert\(|\.update\(|\.delete\(/)],
  ["no AI endpoint duplicated", !page.includes("/api/ai/")],
];

let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(`\nP04 unified workspace: ${checks.length - failures}/${checks.length} checks passed.`);
if (failures > 0) process.exit(1);
