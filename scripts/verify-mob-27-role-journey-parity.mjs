import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const identity = read("lib/identity/resolveCanonicalIdentity.ts");
const contract = read("lib/mobile/contracts/v1.ts");
const bootstrap = read("lib/mobile/server/bootstrap.ts");
const propertyWorkspace = read("lib/mobile/server/property-workspace.ts");
const propertyRoute = read("app/api/v1/mobile/property-workspace/route.ts");
const dashboard = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");
const mobileClient = read("apps/mobile/src/features/dashboard/api.ts");
const legalDocuments = read("app/api/property/builder/units/[unitId]/legal-documents/route.ts");

assert.match(identity, /case "property_owner":[\s\S]*?key: "property_owner"[\s\S]*?href: "\/property\/my"/);
assert.match(identity, /case "property_builder":[\s\S]*?key: "property_builder"[\s\S]*?href: "\/property\/builder\/projects"/);
assert.doesNotMatch(identity, /\/dashboard\/vendor\/property/);

assert.ok(
  fs.existsSync("app/property/my/page.tsx"),
  "Property-owner destination must exist.",
);
assert.ok(
  fs.existsSync("app/property/builder/projects/page.tsx"),
  "Property-builder destination must exist.",
);
assert.ok(
  !fs.existsSync("app/dashboard/vendor/property/page.tsx"),
  "The retired projected property destination must not be recreated.",
);

assert.match(bootstrap, /canonical\.navigationProjection\.map/);
assert.match(bootstrap, /key: item\.key/);
assert.match(bootstrap, /webPath: item\.href/);
assert.match(dashboard, /data\.navigation\.items\.map/);
assert.match(dashboard, /Linking\.openURL\(canonicalWebUrl\(item\.webPath\)\)/);

assert.match(legalDocuments, /const BUCKET = "property-documents-private"/);
assert.match(legalDocuments, /session\.auth\.getUser\(\)/);
assert.match(legalDocuments, /\.eq\("builder_profiles\.owner_user_id", user\.id\)/);
assert.match(legalDocuments, /createSignedUrl\(document\.storage_path, 300\)/);
assert.match(legalDocuments, /createSignedUrl\(path, 600\)/);
assert.match(legalDocuments, /UNIT_FORBIDDEN/);

const mobileSource = [
  read("apps/mobile/src/features/dashboard/DashboardGateway.tsx"),
  read("apps/mobile/src/features/dashboard/api.ts"),
].join("\n");
assert.doesNotMatch(mobileSource, /property-documents-private|createSignedUrl|property_project_legal_documents/);

assert.match(contract, /MobilePropertyWorkspaceProject/);
assert.match(contract, /MobilePropertyWorkspace/);
for (const field of [
  "canManageOwnerListings",
  "canManageBuilderProjects",
  "availableUnits",
  "reservedUnits",
  "soldUnits",
  "pricedUnits",
  "trustedUnits",
]) assert.match(contract, new RegExp(field));

assert.match(propertyWorkspace, /resolveCanonicalIdentity/);
assert.match(propertyWorkspace, /canonical\.permissionProjection\.vendorCapabilities/);
assert.match(propertyWorkspace, /canonical\.operatingProjection\.capabilityKeys/);
assert.match(propertyWorkspace, /capabilities\.has\("property_owner"\)/);
assert.match(propertyWorkspace, /capabilities\.has\("property_builder"\)/);
assert.match(propertyWorkspace, /from\("property_listings"\)/);
assert.match(propertyWorkspace, /from\("builder_profiles"\)/);
assert.match(propertyWorkspace, /from\("builder_projects"\)/);
assert.match(propertyWorkspace, /from\("builder_inventory_units"\)/);
assert.match(propertyWorkspace, /builder_inventory_pricing\(price_total\)/);
assert.doesNotMatch(
  propertyWorkspace,
  /getSupabaseAdmin|SUPABASE_SERVICE|property_project_legal_documents|property-documents-private|createSignedUrl/,
);

assert.match(contract, /PROPERTY_WORKSPACE_FAILED/);
assert.match(propertyRoute, /authenticateMobileRequest/);
assert.match(propertyRoute, /buildMobilePropertyWorkspace/);
assert.match(propertyRoute, /private, no-store/);
assert.match(propertyRoute, /PROPERTY_WORKSPACE_FAILED/);
assert.doesNotMatch(propertyRoute, /export async function (POST|PUT|PATCH|DELETE)/);
assert.doesNotMatch(propertyRoute + propertyWorkspace, /getSupabaseAdmin|SUPABASE_SERVICE/);

assert.match(mobileClient, /MobilePropertyWorkspaceProject/);
assert.match(mobileClient, /MobilePropertyWorkspace/);
assert.match(mobileClient, /loadPropertyWorkspace/);
assert.match(mobileClient, /\/api\/v1\/mobile\/property-workspace/);
assert.doesNotMatch(mobileClient, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);

assert.match(dashboard, /loadPropertyWorkspace/);
assert.match(dashboard, /PropertyWorkspaceCard/);
assert.match(dashboard, /PROPERTY WORKSPACE/);
assert.match(dashboard, /Manage My Properties/);
assert.match(dashboard, /Manage Builder Projects/);
assert.match(dashboard, /Browse Builder Projects/);
assert.match(dashboard, /Browse Available Units/);
assert.match(dashboard, /Private legal papers, uploads, holds, reservations, bookings and agreements are not loaded/);
assert.doesNotMatch(dashboard, /property_project_legal_documents|property-documents-private|createSignedUrl/);

console.log("MOB-27 role-aware journey and private property boundary assertions passed.");
