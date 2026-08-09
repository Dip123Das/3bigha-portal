import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read("app/api/v1/mobile/dashboard/route.ts");
const server = read("lib/mobile/server/dashboard-aggregates.ts");
const client = read("apps/mobile/src/features/dashboard/api.ts");
const screen = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");

assert.match(route, /authenticateMobileRequest/);
assert.match(route, /private, no-store/);
assert.doesNotMatch(route + server, /SUPABASE_SERVICE_ROLE_KEY|createClient\s*\(/);
assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
assert.match(server, /resolveCanonicalIdentity/);
assert.match(server, /resolveMobileDashboardKey/);
for (const field of ["requester_user_id", "vendor_user_id", "author_id", "investor_user_id", "user_id"]) assert.match(server, new RegExp(field));
assert.doesNotMatch(server, /select\(["']\*["']\)/);
assert.match(client, /\/api\/v1\/mobile\/dashboard/);
assert.match(screen, /summary\?\.dashboard === bootstrap\.navigation\.primaryDashboard/);
assert.match(screen, /LIVE WORK SUMMARY/);

console.log("MOB-06 native dashboard aggregate assertions passed.");
