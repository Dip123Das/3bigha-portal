import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-02 verification failed: ${message}`);
};

const page = read("app/admin/dashboard/page.tsx");
const model = read("lib/admin/command-center.ts");
const styles = read("app/admin/dashboard/AdminCommandCenter.module.css");
const policy = read("lib/admin/access-policy.ts");

assert(page.includes("Admin Command Center"), "the canonical dashboard route must render the command center");
assert(page.includes("loadAdminCommandCenter"), "the page must use the server command-center view model");
assert(page.includes("isAdminRole"), "the page must use the canonical ADMIN-01 role authority");
assert(page.includes("account_status") && page.includes('accountStatus !== "active"'), "inactive admins must be rejected");
assert(!page.includes("getSession("), "the command center must not trust getSession for authorization");
assert(model.startsWith('import "server-only"'), "the view model must remain server-only");
assert(model.includes("adminRoleHasCapability"), "module and queue visibility must use capability policy");
assert(model.includes("Promise.all"), "live authority counts must be loaded concurrently");
assert(model.includes("dataIssues"), "partial database failures must be surfaced explicitly");
assert(!model.includes("299") && !model.includes("499") && !model.includes("999"), "executive revenue must not use hard-coded plan prices");
assert(styles.includes("@media(max-width:780px)"), "the command center must include tablet/mobile responsiveness");
assert(styles.includes("@media(max-width:470px)"), "the command center must include narrow-mobile responsiveness");
assert(policy.includes('"admin:dashboard"'), "dashboard capability authority must remain declared");

console.log("ADMIN-02 command-center architecture assertions passed.");
