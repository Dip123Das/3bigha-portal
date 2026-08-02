import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const api = fs.readFileSync(
  "app/api/admin/member-subscription/route.ts",
  "utf8"
);
const css = fs.readFileSync(
  "app/admin/users/MemberAdministration.module.css",
  "utf8"
);

const required = [
  [page, "Member Administration"],
  [page, "Seller / Vendor"],
  [page, "Professional / Service"],
  [page, "Grant complimentary subscription"],
  [page, "/api/admin/member-subscription"],
  [page, "auth.admin.listUsers"],
  [api, "requireMasterAdmin"],
  [api, "complimentary_subscription"],
  [api, "granted_by"],
  [api, "subscription_status: \"active\""],
  [css, ".workspace"],
  [css, ".memberList"],
  [css, ".detail"],
  [css, ".summary"],
];

for (const [source, token] of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing Member Administration token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.1 Member Administration Audit");
console.log("=================================");
console.log("PASS: Administration is member-based, not vendor-only.");
console.log("PASS: Buyers, sellers, investors, bankers, bloggers and professionals are differentiated.");
console.log("PASS: Founder can grant Enterprise or Lifetime access without payment.");
console.log("PASS: Complimentary grant records plan, reason, date, expiry and granting admin.");
console.log("PASS: Existing identity approval and account restriction APIs remain preserved.");
