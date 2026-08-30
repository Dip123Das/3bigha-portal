import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync("app/admin/security-compliance/page.tsx", "utf8");
const helper = fs.readFileSync("lib/security/internal-job-authorization.ts", "utf8");
const command = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`ADMIN-15 verification failed: ${message}`); };

const routeFiles = ["app/api/cron", "app/api/system"].flatMap((root) => fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name, "route.ts"))).filter((file) => fs.existsSync(file));
assert(routeFiles.length === 12, `expected 12 internal job routes, found ${routeFiles.length}`);
for (const file of routeFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert(source.includes("authorizeInternalJobRequest"), `${file} lacks shared authorization`);
  assert(source.includes("if (denied) return denied"), `${file} does not stop unauthorized execution`);
  assert(!source.includes("searchParams.get(\"secret\")") && !source.includes("searchParams.get(\"key\")"), `${file} accepts query-string credentials`);
}
assert(helper.includes("timingSafeEqual"), "constant-time comparison missing");
assert(helper.includes("status: 503") && helper.includes("status: 401"), "fail-closed outcomes missing");
assert(!helper.includes("if (!configured) return null"), "missing secret must not authorize execution");
assert(page.includes("requireMasterAdmin") && page.includes('dynamic = "force-dynamic"'), "protected security center missing");
for (const table of ["user_security_events", "admin_account_action_audit", "member_role_transition_audit", "admin_account_deletion_audit", "listing_moderation_events", "registration_verification_events"]) assert(page.includes(table), `missing evidence ${table}`);
for (const gap of ["AAL2 enforcement", "dual approval", "data-subject request", "central SIEM", "penetration-test register", "not a legal certification"]) assert(page.includes(gap), `missing coverage gap ${gap}`);
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "security center must remain read-only");
assert(command.includes('href: "/admin/security-compliance"'), "command-center navigation missing");

console.log("ADMIN-15 enterprise security and compliance assertions passed.");
