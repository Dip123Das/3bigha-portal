import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const layout = read("apps/mobile/app/_layout.tsx");
const shield = read("apps/mobile/src/features/privacy/AppPrivacyShield.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-16 assertion failed: ${message}`); };

assert(/^MOB-(?:1[6-9]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-16");
assert(layout.includes("<AppPrivacyShield>") && layout.indexOf("<AppPrivacyShield>") < layout.indexOf("<AuthProvider>"), "root privacy boundary does not cover authentication and business surfaces");
assert(shield.includes('AppState.addEventListener("change"') && shield.includes('state === "active"'), "every non-active application state is not shielded");
assert(shield.includes("{children}") && shield.includes("!active &&") && shield.includes('position: "absolute"') && shield.includes("top: 0") && shield.includes("bottom: 0"), "state-preserving privacy overlay is absent");
assert(shield.includes("accessibilityElementsHidden={!active}") && shield.includes('"no-hide-descendants"'), "covered content remains exposed to accessibility services");
assert(shield.includes('accessibilityRole="summary"') && shield.includes('accessibilityRole="header"'), "privacy surface lacks accessibility semantics");
for (const forbidden of ["session", "user.id", "access_token", "notification", "error.message", "console.", "AsyncStorage", "SecureStore", "fetch(", "supabase"]) {
  assert(!shield.includes(forbidden), `privacy boundary contains forbidden data or authority reference: ${forbidden}`);
}

console.log("MOB-16 native background privacy assertions passed.");
