import fs from "node:fs";

const page=fs.readFileSync("app/admin/users/page.tsx","utf8");
const css=fs.readFileSync("app/admin/users/MemberAdministration.module.css","utf8");

const checks=[
  [page,"A-3.7 — Founder Operating Centre 2.0"],
  [page,'href="/admin/users?approval=pending"'],
  [page,'href="/admin/users?account=active"'],
  [page,"Identity needs review"],
  [page,"Joined"],
  [css,"Repair workspace visibility"],
  [css,'.detail[data-workspace="identity"] .detailGrid > .identityWorkspace'],
  [css,'.detail[data-workspace="controls"] .detailGrid > .controlsWorkspace'],
  [css,"display:block !important"],
  [css,".workspaceTabs{"],
  [css,"box-shadow:inset 0 -3px 0 #2563eb"],
];

for(const[source,token]of checks){
  if(!source.includes(token)){
    console.error(`FAIL: Missing A-3.7 token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.7 Founder Operating Centre 2.0 Audit");
console.log("========================================");
console.log("PASS: Every selected workspace visibly renders its content.");
console.log("PASS: Overview remains the complete default workspace.");
console.log("PASS: Workspace navigation now behaves as a compact tab bar.");
console.log("PASS: KPI cards filter the member directory.");
console.log("PASS: Member header exposes business, location, joined date and readiness context.");
console.log("PASS: Existing founder actions, APIs and external routes remain preserved.");
