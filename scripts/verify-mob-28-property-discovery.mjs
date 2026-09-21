import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("lib/mobile/contracts/v1.ts");
const reader = read("lib/mobile/server/property-discovery.ts");
const route = read("app/api/v1/mobile/property-discovery/route.ts");
const publicUnits = read("app/api/property/projects/[slug]/units/route.ts");
const client = read("apps/mobile/src/features/property/api.ts");
const screen = read("apps/mobile/src/features/property/PropertyDiscoveryScreen.tsx");
const dashboard = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");

for (const value of [
  "MobilePropertyUnitStatus",
  "MobilePropertyDiscoveryProject",
  "MobilePropertyDiscoveryCatalogue",
  "MobilePropertyDiscoveryUnit",
  "MobilePropertyLayoutPlacement",
  "MobilePropertyPublishedLayout",
  "MobilePropertyProjectPreview",
  "MobilePropertyDiscovery",
  "PROPERTY_DISCOVERY_FAILED",
]) {
  assert.match(contract, new RegExp(value));
}

assert.match(reader, /\.eq\("status", "active"\)/);
assert.match(reader, /\.eq\("is_active", true\)/);
assert.match(reader, /\.eq\("trust_status", "verified"\)/);
assert.match(reader, /\.eq\("status", "published"\)/);
assert.match(reader, /\.eq\("is_public", true\)/);
assert.match(reader, /property_project_layouts/);
assert.match(reader, /property_project_layout_units/);
assert.match(reader, /visibleIds/);
assert.match(reader, /status === "reserved"\) return "hold"/);

assert.match(route, /authenticateMobileRequest\(request\)/);
assert.match(route, /buildMobilePropertyDiscovery/);
assert.match(route, /getSupabaseAdmin\(\)/);
assert.match(route, /private, no-store, max-age=0/);
assert.match(route, /PROPERTY_DISCOVERY_FAILED/);

assert.match(publicUnits, /PROJECT_NOT_PUBLIC/);
assert.match(publicUnits, /unit\.trust_status === "verified"/);
assert.match(publicUnits, /status", "published"/);
assert.match(publicUnits, /is_public", true/);

assert.match(client, /export async function loadPropertyDiscovery/);
assert.match(client, /\/api\/v1\/mobile\/property-discovery/);
assert.match(client, /encodeURIComponent\(slug\)/);
assert.match(client, /mobileApiRequest/);

assert.match(screen, /export function PropertyDiscoveryScreen/);
assert.match(screen, /loadPropertyDiscovery\(session, slug\)/);
assert.match(screen, /Active projects/);
assert.match(screen, /Availability filter/);
assert.match(screen, /Published layout v/);
assert.match(screen, /preview\.layout\.placements\.map/);
assert.match(screen, /Verified units/);
assert.match(screen, /accessibilityRole="button"/);
assert.match(screen, /accessibilityState=\{\{ selected:/);
assert.match(screen, /Declared four-side boundaries/);
assert.match(
  screen,
  /Private legal papers are never loaded into public discovery\./,
);

assert.match(
  dashboard,
  /import \{ PropertyDiscoveryScreen \} from "@\/features\/property\/PropertyDiscoveryScreen"/,
);
assert.match(
  dashboard,
  /const \[showPropertyDiscovery, setShowPropertyDiscovery\] = useState\(false\)/,
);
assert.match(
  dashboard,
  /if \(showPropertyDiscovery\) return <PropertyDiscoveryScreen session=\{session\}/,
);
assert.match(
  dashboard,
  /onExplore=\{\(\) => setShowPropertyDiscovery\(true\)\}/,
);
assert.match(dashboard, /label="Explore Projects in App"/);
assert.match(dashboard, /label="Browse Builder Projects"/);
assert.match(dashboard, /label="Browse Available Units"/);

const discoveryBoundary = [
  contract,
  reader,
  route,
  client,
  screen,
  dashboard,
].join("\n");
assert.doesNotMatch(
  discoveryBoundary,
  /property_project_legal_documents|property_unit_legal|property-documents-private|createSignedUrl|storage_path/i,
);
assert.doesNotMatch(
  [reader, route].join("\n"),
  /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/,
);
assert.doesNotMatch(reader, /ownerPreview|preview=builder/);
assert.doesNotMatch(
  [client, screen, dashboard].join("\n"),
  /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/,
);
assert.doesNotMatch(
  client,
  /ownerPreview|preview=builder/,
);
assert.doesNotMatch(
  contract,
  /legalDocuments|documentUrl|signedUrl|storagePath/,
);

console.log(
  "MOB-28 native buyer property discovery and privacy-boundary assertions passed.",
);
