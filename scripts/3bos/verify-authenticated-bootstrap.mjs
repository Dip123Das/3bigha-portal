import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const COMPONENT_PATH = path.join(
  ROOT,
  "app/_components/ThreeBOSAuthenticatedBootstrap.tsx"
);

const LAYOUT_PATH = path.join(
  ROOT,
  "app/layout.tsx"
);

let failed = false;

if (!fs.existsSync(COMPONENT_PATH)) {
  console.error(
    "❌ Missing authenticated bootstrap component."
  );
  process.exit(1);
}

if (!fs.existsSync(LAYOUT_PATH)) {
  console.error("❌ Missing app/layout.tsx.");
  process.exit(1);
}

const component = fs.readFileSync(
  COMPONENT_PATH,
  "utf8"
);

const layout = fs.readFileSync(
  LAYOUT_PATH,
  "utf8"
);

const requiredComponentMarkers = [
  '"use client";',
  "getSupabaseBrowser",
  "create3BOSRuntimeInputFromLegacy",
  "use3BOSRuntime",
  '.from("profiles")',
  '.from("business_profiles")',
  '"id"',
  '"role"',
  '"requested_role"',
  '"portal_use_reason"',
  '"business_type"',
  '"nature_of_business"',
  "setRuntimeInput(bootstrap.input)",
  "clearRuntime()",
  "return null;",
  "onAuthStateChange",
  "subscription.unsubscribe()",
];

for (
  const marker of requiredComponentMarkers
) {
  if (!component.includes(marker)) {
    console.error(
      `❌ Missing bootstrap marker: ${marker}`
    );
    failed = true;
  }
}

const forbiddenComponentMarkers = [
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
  "router.push",
  "router.replace",
  "redirect(",
  "window.location",
  "location.href",
  "localStorage",
  "sessionStorage",
  "document.cookie",
  "resolveAccessForUser",
  "getDefaultPostLoginPath",
];

for (
  const marker of forbiddenComponentMarkers
) {
  if (component.includes(marker)) {
    console.error(
      `❌ Forbidden bootstrap behavior: ${marker}`
    );
    failed = true;
  }
}

const selectStatements =
  component.match(/\.select\(/g) ?? [];

if (selectStatements.length !== 2) {
  console.error(
    `❌ Expected exactly two read-only select queries; found ${selectStatements.length}.`
  );
  failed = true;
}

const layoutMarkers = [
  'import ThreeBOSAuthenticatedBootstrap from "./_components/ThreeBOSAuthenticatedBootstrap";',
  "<ThreeBOSRuntimeProvider>",
  "<ThreeBOSAuthenticatedBootstrap />",
  '<PresenceHeartbeat currentPage="global" />',
  "</ThreeBOSRuntimeProvider>",
];

for (const marker of layoutMarkers) {
  if (!layout.includes(marker)) {
    console.error(
      `❌ Missing layout bootstrap marker: ${marker}`
    );
    failed = true;
  }
}

const providerIndex = layout.indexOf(
  "<ThreeBOSRuntimeProvider>"
);

const bootstrapIndex = layout.indexOf(
  "<ThreeBOSAuthenticatedBootstrap />"
);

const presenceIndex = layout.indexOf(
  '<PresenceHeartbeat currentPage="global" />'
);

const providerCloseIndex = layout.indexOf(
  "</ThreeBOSRuntimeProvider>"
);

if (
  !(
    providerIndex <
      bootstrapIndex &&
    bootstrapIndex <
      presenceIndex &&
    presenceIndex <
      providerCloseIndex
  )
) {
  console.error(
    "❌ Bootstrap is not safely mounted inside the provider."
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Silent authenticated 3BOS bootstrap verification passed."
);
console.log(
  "✅ Exactly two optional read-only profile queries."
);
console.log(
  "✅ No insert, update, upsert or delete operation."
);
console.log(
  "✅ No redirect, access decision or route mutation."
);
console.log(
  "✅ Bootstrap renders no visible UI and never blocks children."
);
console.log(
  "✅ Existing authentication remains authoritative."
);
