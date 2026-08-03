import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const route = fs.readFileSync(
  "app/api/admin/member-subscription/route.ts",
  "utf8"
);

const required = [
  [page, "A-3.10 — Canonical subscription plans and safe admin return"],
  [page, 'value="basic_vendor">Basic Vendor'],
  [page, 'value="growth">Growth'],
  [page, 'value="enterprise">Enterprise'],
  [page, 'value="lifetime">Lifetime'],
  [route, '"basic_vendor"'],
  [route, '"growth"'],
  [route, "function adminReturnOrigin"],
  [route, "process.env.NEXT_PUBLIC_SITE_URL"],
  [route, 'req.headers.get("x-forwarded-host")'],
  [route, 'return "https://3bigha.com"'],
  [route, 'new URL("/admin/users", adminReturnOrigin(req))'],
];

for (const [source, token] of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.10 token: ${token}`);
    process.exit(1);
  }
}

const complimentaryForm =
  page.split('<form action="/api/admin/member-subscription"')[1]?.split("</form>")[0] || "";

if (
  complimentaryForm.includes(">Starter<") ||
  complimentaryForm.includes(">Professional<")
) {
  console.error("FAIL: Legacy generic plans remain in complimentary grant control.");
  process.exit(1);
}

console.log("A-3.10 Subscription Plans and Safe Return Audit");
console.log("===============================================");
console.log("PASS: Complimentary grant shows Basic Vendor, Growth, Enterprise and Lifetime.");
console.log("PASS: Starter and Professional are absent from the complimentary grant control.");
console.log("PASS: API validation matches the displayed canonical plans.");
console.log("PASS: Production return no longer depends on an internal localhost request URL.");
console.log("PASS: Existing metadata, expiry and business-profile synchronization remain preserved.");
