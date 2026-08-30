import fs from "node:fs";

const page = fs.readFileSync("app/admin/release-readiness/page.tsx", "utf8");
const checklist = fs.readFileSync("docs/admin/ADMIN-16-RELEASE-READINESS.md", "utf8");
const command = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`ADMIN-16 verification failed: ${message}`); };

assert(page.includes("requireMasterAdmin") && page.includes('dynamic = "force-dynamic"'), "protected readiness center missing");
for (const migration of ["20260822000100_trusted_listing_media_foundation.sql", "20260827000100_admin_listing_media_moderation.sql", "20260827000200_user_security_event_authority.sql"]) {
  assert(page.includes(migration) && checklist.includes(migration) && fs.existsSync(`supabase/migrations/${migration}`), `migration contract missing: ${migration}`);
}
for (let phase = 1; phase <= 15; phase += 1) {
  const prefix = `verify-admin-${String(phase).padStart(2, "0")}`;
  assert(fs.readdirSync("scripts").some((file) => file.startsWith(prefix)), `phase verifier missing: ${prefix}`);
}
for (const gate of ["production release not yet approved", "accessibility", "load", "penetration", "restore", "21 known locked production dependency advisories", "founder, security and operations acceptance"]) assert(page.includes(gate) || checklist.includes(gate), `blocking gate missing: ${gate}`);
for (const boundary of ["does not create one", "Never improvise destructive SQL", "Values are never rendered", "additive schema in place"]) assert(page.includes(boundary), `release boundary missing: ${boundary}`);
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "readiness center must remain read-only");
assert(command.includes('href: "/admin/release-readiness"'), "command-center navigation missing");

console.log("ADMIN-16 production readiness and closure assertions passed.");
