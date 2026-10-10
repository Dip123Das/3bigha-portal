import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const gateway = read(
  "apps/mobile/src/features/dashboard/DashboardGateway.tsx",
);
const api = read(
  "apps/mobile/src/features/vendor/api.ts",
);
const screen = read(
  "apps/mobile/src/features/vendor/VendorRfqInboxScreen.tsx",
);
const property = read(
  "apps/mobile/src/features/property/PropertyDiscoveryScreen.tsx",
);

assert.match(
  gateway,
  /VendorRfqInboxScreen/,
  "Dashboard must include the native vendor RFQ inbox.",
);
assert.match(
  gateway,
  /item\.key === "assigned_rfqs"/,
  "Assigned-RFQ metric must route natively.",
);
assert.match(
  gateway,
  /setShowVendorRfqs\(true\)/,
  "Assigned-RFQ navigation must stay inside the app.",
);
assert.match(
  api,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
  "Native vendor requests must use the encrypted app session.",
);
assert.match(
  api,
  /\/api\/vendor\/rfqs\?limit=100/,
  "Native vendor inbox must use the canonical assigned-RFQ authority.",
);
assert.doesNotMatch(
  screen,
  /Linking\.openURL|openBrowserAsync|WebView/,
  "The native vendor RFQ inbox must not open a browser or WebView.",
);
assert.match(
  screen,
  /Protected native view/,
  "RFQ details must retain the native security boundary.",
);
assert.match(
  property,
  /PropertyLegalReviewScreen/,
  "The established native property journey must remain present.",
);

const vendorServer = read(
  "lib/mobile/server/vendor-workspace.ts",
);
const vendorRoute = read(
  "app/api/v1/mobile/vendor-workspace/route.ts",
);

assert.match(
  vendorRoute,
  /authenticateMobileRequest/,
  "Vendor notifications and conversations must accept the encrypted app session.",
);
assert.match(
  vendorRoute,
  /buildMobileVendorWorkspace/,
  "The mobile route must use the canonical vendor projection.",
);
assert.doesNotMatch(
  vendorRoute,
  /cookies\(|createServerClient|SUPABASE_SERVICE_ROLE/,
  "The mobile vendor route must not depend on browser cookies or service-role authority.",
);
assert.match(
  vendorServer,
  /\.eq\("vendor_user_id", user\.id\)/,
  "Conversation discovery must remain scoped to the authenticated vendor.",
);
assert.match(
  vendorServer,
  /\.eq\("user_id", user\.id\)/,
  "Notifications and read state must remain scoped to the authenticated user.",
);
assert.match(
  vendorServer,
  /conversation_participants/,
  "Conversation unread state must use the canonical participant ledger.",
);
assert.match(
  vendorServer,
  /senderIsSelf/,
  "Messages sent by the current user must not count as unread.",
);
assert.match(
  vendorServer,
  /system/,
  "System messages must not count as unread vendor messages.",
);

const nativeVendorWorkspaceScreen = read(
  "apps/mobile/src/features/vendor/VendorWorkspaceScreen.tsx",
);
const nativeVendorApi = read(
  "apps/mobile/src/features/vendor/api.ts",
);

assert.match(
  nativeVendorApi,
  /mobileApiRequest<VendorWorkspace>/,
  "Vendor notifications and conversations must use the authenticated mobile request boundary.",
);
assert.match(
  nativeVendorApi,
  /\/api\/v1\/mobile\/vendor-workspace/,
  "Vendor workspace client must use the canonical mobile endpoint.",
);
assert.match(
  nativeVendorWorkspaceScreen,
  /loadVendorWorkspace/,
  "Native vendor workspace must load its authenticated projection.",
);
assert.match(
  nativeVendorWorkspaceScreen,
  /Notifications/,
  "Native vendor workspace must render business notifications.",
);
assert.match(
  nativeVendorWorkspaceScreen,
  /Conversations/,
  "Native vendor workspace must render RFQ conversation summaries.",
);
assert.doesNotMatch(
  nativeVendorWorkspaceScreen,
  /Linking|WebView|canonicalWebUrl|openURL/,
  "Native vendor notifications and conversations must not open a browser or WebView.",
);
assert.match(
  gateway,
  /\["unread_alerts", "conversations"\]\.includes\(item\.key\)/,
  "Vendor notification and conversation metrics must open the native workspace.",
);
assert.match(
  gateway,
  /setShowVendorWorkspace\(true\)/,
  "Dashboard must activate the native vendor workspace.",
);

console.log(
  "MOB-48 native vendor RFQ workspace assertions passed.",
);
