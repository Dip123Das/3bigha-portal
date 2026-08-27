import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-03 verification failed: ${message}`);
};

const page = read("app/admin/verification-operations/page.tsx");
const model = read("lib/admin/trust-command-center.ts");
const styles = read("app/admin/verification-operations/TrustCommandCenter.module.css");
const adminCommand = read("lib/admin/command-center.ts");

assert(page.includes("Trust & Verification Center"), "the existing operations route must host the consolidated trust center");
assert(page.includes("requireMasterAdmin"), "the trust center must use canonical master authority");
assert(page.includes("loadTrustCommandCenter"), "the page must use its server-side operating view model");
assert(model.startsWith('import "server-only"'), "trust aggregation must remain server-only");
assert(model.includes("Promise.all"), "independent trust authorities must load concurrently");
for (const table of [
  "registration_verification_cases",
  "registration_review_assignments",
  "individual_professional_profiles",
  "trusted_capture_sessions",
  "listing_media_verifications",
  "registration_operations_notifications",
  "admin_account_action_audit",
  "property_listings",
  "builder_projects",
]) assert(model.includes(`from(\"${table}\")`), `${table} must remain an explicit authority source`);
assert(!/\.(insert|update|delete|upsert)\(/.test(model), "the consolidated command layer must remain read-only");
assert(page.includes("/admin/verification-workbench") && page.includes("/admin/verification-reviews"), "existing business-review workflows must be preserved");
assert(page.includes("/admin/individual-professional-reviews"), "the skilled-worker review workflow must be preserved");
assert(page.includes("/admin/users"), "the audited account restriction workflow must be preserved");
assert(page.includes("Partial data notice"), "partial authority failures must remain visible");
assert(styles.includes("@media(max-width:780px)") && styles.includes("@media(max-width:480px)"), "the trust center must be mobile responsive");
assert(adminCommand.includes('href: "/admin/verification-operations"'), "the executive command center must link to the trust center");

console.log("ADMIN-03 trust command-center architecture assertions passed.");
