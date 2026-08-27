import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ADMIN-01 verification failed: ${message}`);
  }
}

const policy = read("lib/admin/access-policy.ts");
const resolver = read("lib/admin/requireAdminAccess.ts");
const middleware = read("middleware.ts");

for (const role of [
  "master_admin",
  "property_admin",
  "materials_admin",
  "services_admin",
  "rentals_admin",
  "blog_admin",
  "investment_admin",
]) {
  assert(policy.includes(`"${role}"`), `admin role is missing: ${role}`);
}

for (const capability of [
  "admin:property",
  "admin:materials",
  "admin:services",
  "admin:rentals",
  "admin:blog",
  "admin:investment",
  "admin:geography",
  "admin:operations",
]) {
  assert(policy.includes(`"${capability}"`), `admin capability is missing: ${capability}`);
}

assert(
  middleware.includes("adminRoleCanAccessPath"),
  "middleware must use the canonical admin path policy",
);
assert(
  resolver.includes('import "server-only"'),
  "privileged admin resolver must remain server-only",
);
assert(
  resolver.includes("admin.auth.getUser(token)"),
  "bearer sessions must be verified with getUser",
);
assert(
  resolver.includes("sessionClient.auth.getUser()"),
  "cookie sessions must be verified with getUser",
);
assert(
  !resolver.includes("getSession("),
  "server authorization must not trust getSession",
);

const protectedAdminRoutes = [
  "app/api/admin/geography/route.ts",
  "app/api/admin/geography/manage/route.ts",
  "app/api/admin/geography/resolve/route.ts",
  "app/api/admin/geography-audit/route.ts",
  "app/api/admin/schema-audit/route.ts",
  "app/api/admin/operations/status/route.ts",
  "app/api/admin/vendor-control/route.ts",
  "app/api/admin/price-updates/route.ts",
  "app/api/admin/price-updates/ai-draft/route.ts",
];

for (const routePath of protectedAdminRoutes) {
  const route = read(routePath);
  assert(
    route.includes("requireMasterAdmin"),
    `privileged route must use canonical authorization: ${routePath}`,
  );
}

for (const routePath of [
  "app/api/admin/geography/route.ts",
  "app/api/admin/geography/manage/route.ts",
  "app/api/admin/geography-audit/route.ts",
  "app/api/admin/schema-audit/route.ts",
]) {
  const route = read(routePath);
  assert(
    !route.includes("SUPABASE_SERVICE_ROLE_KEY"),
    `route must not construct an unguarded service-role client: ${routePath}`,
  );
}

console.log("ADMIN-01 security and authority assertions passed.");
