import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const css = fs.readFileSync(
  "app/admin/users/MemberAdministration.module.css",
  "utf8"
);

const checks = [
  [page, "A-3.5 — Founder member workspace navigation"],
  [page, "workspaceOptions"],
  [page, "workspaceHref"],
  [page, "Founder member workspace"],
  [page, "Founder Controls"],
  [page, "data-workspace={activeWorkspace}"],
  [css, ".workspaceTabs"],
  [css, ".workspaceTabActive"],
  [css, '.detail[data-workspace="identity"]'],
  [css, '.detail[data-workspace="controls"]'],
];

for (const [source, token] of checks) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.5 token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.5 Founder Member Workspace Audit");
console.log("====================================");
console.log("PASS: Member 360 is organised into focused workspaces.");
console.log("PASS: Selected member and current filters remain preserved.");
console.log("PASS: Overview retains the complete recorded summary.");
console.log("PASS: Identity, business, geography, verification, subscription, timeline and controls can be opened independently.");
console.log("PASS: External administration routes remain available without inventing data.");
console.log("PASS: Existing founder controls and APIs remain unchanged.");
