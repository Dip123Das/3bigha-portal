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

console.log(
  "MOB-48 native vendor RFQ workspace assertions passed.",
);
