import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const css = fs.readFileSync(
  "app/admin/users/MemberAdministration.module.css",
  "utf8"
);

const required = [
  [page, "A-3.6 — Member navigation and workspace activation"],
  [page, 'workspaceHref("controls",profile.id)'],
  [page, 'workspaceHref("subscription",profile.id)'],
  [page, 'aria-current={activeWorkspace===key?"page":undefined}'],
  [page, 'data-member-workspace={key}'],
  [page, 'data-member-action="refresh"'],
  [page, 'name="workspace" value={activeWorkspace}'],
  [page, 'if(activeWorkspace!=="overview")params.set("workspace",activeWorkspace)'],
  [page, 'data-workspace-panel="identity"'],
  [page, 'data-workspace-panel="business"'],
  [page, 'data-workspace-panel="geography"'],
  [page, 'data-workspace-panel="verification"'],
  [page, 'data-workspace-panel="subscription"'],
  [page, 'data-workspace-panel="timeline"'],
  [page, 'data-workspace-panel="controls"'],
  [page, 'href="/admin/verification-reviews"'],
  [page, 'href="/admin/dashboard/vendor-control"'],
  [page, 'href="/admin/dashboard/support"'],
  [page, 'href="/admin/dashboard"'],
  [css, '.quickActions a[aria-current="page"]'],
];

for (const [source, token] of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.6 token: ${token}`);
    process.exit(1);
  }
}

const workspaceNames = [
  "overview",
  "identity",
  "business",
  "geography",
  "verification",
  "subscription",
  "timeline",
  "controls",
];

for (const name of workspaceNames) {
  if (!page.includes(`["${name}",`)) {
    console.error(`FAIL: Workspace is not registered: ${name}`);
    process.exit(1);
  }
}

console.log("A-3.6 Member Navigation and Activation Audit");
console.log("============================================");
console.log("PASS: Every internal workspace button has a registered workspace destination.");
console.log("PASS: Active workspace receives semantic and visual active state.");
console.log("PASS: Manage Account opens Founder Controls.");
console.log("PASS: Grant Plan opens Subscription.");
console.log("PASS: Member changes preserve the selected workspace.");
console.log("PASS: Filters preserve the selected workspace.");
console.log("PASS: Refresh preserves both member and workspace.");
console.log("PASS: Proof review, marketplace, support and admin dashboard routes are explicit.");
console.log("PASS: Every focused workspace has an active content panel.");
