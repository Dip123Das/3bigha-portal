import fs from "node:fs";

const migrations = [
  "20260822000100_trusted_listing_media_foundation.sql",
  "20260827000100_admin_listing_media_moderation.sql",
  "20260827000200_user_security_event_authority.sql",
];
const assert = (condition, message) => { if (!condition) throw new Error(`REL-01 verification failed: ${message}`); };

const sources = migrations.map((name) => ({ name, sql: fs.readFileSync(`supabase/migrations/${name}`, "utf8").trim() }));
for (const { name, sql } of sources) {
  assert(/^begin;/i.test(sql), `${name} is not explicitly transactional at start`);
  assert(/commit;$/i.test(sql), `${name} is not explicitly transactional at end`);
  assert(!/\b(drop table|drop schema|truncate)\b/i.test(sql), `${name} contains destructive schema/data operation`);
}

const foundation = sources[0].sql;
for (const table of ["trusted_capture_sessions", "listing_media_assets", "listing_media_verifications", "listing_moderation_events"]) {
  assert(foundation.includes(`create table if not exists public.${table}`), `foundation table missing: ${table}`);
  assert(foundation.includes(`alter table public.${table} enable row level security`), `RLS missing: ${table}`);
}
assert(foundation.includes("listing-evidence-private") && foundation.includes("public = excluded.public"), "private evidence bucket contract missing");
assert(foundation.includes("No authenticated UPDATE or DELETE policy is intentionally provided"), "immutable evidence policy missing");

const moderation = sources[1].sql;
assert(moderation.includes("security definer") && moderation.includes("for update"), "atomic moderation authority missing");
assert(moderation.includes("revoke all") && moderation.includes("to service_role"), "moderation privilege boundary missing");

const security = sources[2].sql;
assert(security.includes("enable row level security") && security.includes("auth.uid()=user_id"), "security-event ownership policy missing");
assert(security.includes("revoke all") && security.includes("to service_role"), "security-event write boundary missing");

const runbook = fs.readFileSync("docs/admin/REL-01-MIGRATION-REHEARSAL.md", "utf8");
for (const marker of ["disposable-database rehearsal pending", "production-like database snapshot", "Structural verification queries", "Failure and rollback boundary", "Evidence required to close REL-01"]) assert(runbook.includes(marker), `runbook marker missing: ${marker}`);

console.log("REL-01 static migration readiness assertions passed; database rehearsal remains pending.");
