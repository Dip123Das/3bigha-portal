import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const layout = read("apps/mobile/app/_layout.tsx");
const auth = read("apps/mobile/src/features/auth/AuthProvider.tsx");
const shield = read("apps/mobile/src/features/privacy/AppPrivacyShield.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-17 assertion failed: ${message}`); };

assert(/^MOB-(?:17|1[89]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-17");
assert(layout.indexOf("<AuthProvider>") < layout.indexOf("<AppPrivacyShield>"), "privacy surface cannot consume canonical authentication lifecycle state");
assert(layout.indexOf("<AppPrivacyShield>") < layout.indexOf("<Stack"), "foreground gate does not cover the rendered application");
assert(auth.includes("refreshSession(saved.session)") && auth.includes("setForegroundReady(false)"), "saved session is not revalidated before foreground disclosure");
assert(auth.includes('status === 400 || status === 401 || status === 403') && auth.includes('signOut({ scope: "local" })'), "authoritatively rejected sessions do not fail closed to signed-out state");
assert(auth.includes("setForegroundError(true)") && shield.includes("retryForegroundValidation"), "temporary validation failure lacks a privacy-safe deliberate retry");
assert(shield.includes("const privateState = !active || !foregroundReady") && shield.includes("accessibilityElementsHidden={privateState}"), "cached content can be exposed before validation completes");
for (const forbidden of ["access_token", "refresh_token", "error.message", "console.", "AsyncStorage", "SecureStore"]) assert(!shield.includes(forbidden), `foreground privacy surface contains forbidden material: ${forbidden}`);

console.log("MOB-17 native foreground session revalidation assertions passed.");
