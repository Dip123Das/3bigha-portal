import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const contract = read("lib/mobile/contracts/v1.ts");
const auth = read("lib/mobile/server/auth.ts");
const bootstrap = read("lib/mobile/server/bootstrap.ts");
const route = read("app/api/v1/mobile/bootstrap/route.ts");
const access = read("lib/access/resolveAccess.ts");

assert.match(contract, /MOBILE_API_VERSION = "1"/);
assert.match(contract, /MobileDashboardKey/);
assert.match(contract, /primaryDashboard: MobileDashboardKey/);
assert.match(contract, /MobileApiFailure/);

assert.match(auth, /source: "bearer" \| "cookie"/);
assert.match(auth, /supabase\.auth\.getUser\(bearerToken\)/);
assert.match(auth, /getSupabaseServerClient\(cookieStore\)/);
assert.doesNotMatch(auth, /SERVICE_ROLE/i);

assert.match(bootstrap, /repairCompatibilityGrantsForUser/);
assert.match(bootstrap, /resolveCanonicalIdentity/);
assert.match(bootstrap, /resolveRegistrationState/);
assert.match(bootstrap, /vendor_home/);
assert.match(bootstrap, /buyer_home/);
assert.doesNotMatch(bootstrap, /profile:\s*canonical\.profile/);
assert.doesNotMatch(bootstrap, /businessProfile:/);

assert.match(route, /authenticateMobileRequest/);
assert.match(route, /buildMobileBootstrap/);
assert.match(route, /private, no-store/);
assert.match(route, /Vary: "Cookie, Authorization"/);

const resolverStart = access.indexOf("export async function resolveAccessForUser");
const repairStart = access.indexOf("export async function repairCompatibilityGrantsForUser");
assert.ok(resolverStart >= 0 && repairStart > resolverStart);
const readOnlyResolver = access.slice(resolverStart, repairStart);
assert.doesNotMatch(readOnlyResolver, /\.insert\(/);
assert.doesNotMatch(readOnlyResolver, /\.update\(/);
assert.doesNotMatch(readOnlyResolver, /\.upsert\(/);

console.log("MOB-02 mobile backend contract assertions passed.");
