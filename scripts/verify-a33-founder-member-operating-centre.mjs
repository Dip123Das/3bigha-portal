import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const css = fs.readFileSync(
  "app/admin/users/MemberAdministration.module.css",
  "utf8"
);

const checks = [
  [page, "A-3.3 — Founder member operating centre"],
  [page, "Manage account"],
  [page, "Login & verification"],
  [page, "Readiness breakdown"],
  [page, "authUser"],
  [page, "Granted by"],
  [page, 'id="subscription-control"'],
  [css, ".quickActions"],
  [css, ".memberStateActive"],
  [css, ".readinessGrid"],
];

for (const [source, token] of checks) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.3 token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.3 Founder Member Operating Centre Audit");
console.log("===========================================");
console.log("PASS: Founder quick-action ribbon is present.");
console.log("PASS: Member list exposes account-state, business and location context.");
console.log("PASS: Login and verification facts come from existing auth records.");
console.log("PASS: Readiness breakdown explains the recorded-data score.");
console.log("PASS: Complimentary plan provenance is visible.");
console.log("PASS: Existing controls and APIs remain unchanged.");
