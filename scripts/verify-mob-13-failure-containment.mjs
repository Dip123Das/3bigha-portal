import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const layout = read("apps/mobile/app/_layout.tsx");
const boundary = read("apps/mobile/src/features/recovery/AppRecoveryBoundary.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-13 assertion failed: ${message}`); };

assert(/^MOB-(?:1[3-9]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-13");
assert(layout.includes("<AppRecoveryBoundary>"), "top-level recovery boundary is not installed");
assert(boundary.includes("getDerivedStateFromError"), "render failures are not contained");
assert(boundary.includes("Try again") && boundary.includes("Updates.reloadAsync()"), "human recovery choices are incomplete");
assert(boundary.includes('accessibilityRole="alert"') && boundary.includes('accessibilityRole="header"'), "recovery surface lacks accessibility semantics");
assert(boundary.includes("Your account, permissions and server-owned work have not been changed"), "authority-safe recovery explanation is absent");
assert(boundary.includes("No personal details, access tokens, raw error messages or stack traces are shown or stored here"), "privacy-safe diagnostic boundary is absent");
assert(!boundary.includes("error.message") && !boundary.includes("error.stack") && !boundary.includes("AsyncStorage") && !boundary.includes("SecureStore"), "raw failure data may be exposed or persisted");
assert(!boundary.includes("fetch(") && !boundary.includes("supabase") && !boundary.includes("Sentry"), "recovery boundary transmits data or depends on external authority");

console.log("MOB-13 native failure containment assertions passed.");
