import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const layout = read("apps/mobile/app/_layout.tsx");
const provider = read("apps/mobile/src/features/privacy/DeviceReauthenticationProvider.tsx");
const shield = read("apps/mobile/src/features/privacy/AppPrivacyShield.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-18 assertion failed: ${message}`); };

assert(/^MOB-(?:18|19|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-18");
assert(app.plugins?.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-local-authentication"), "native local-authentication configuration is absent");
assert(layout.indexOf("<DeviceReauthenticationProvider>") < layout.indexOf("<AppPrivacyShield>"), "privacy shield cannot consume device verification state");
assert(provider.includes("REAUTHENTICATION_INTERVAL_MS = 60_000") && provider.includes("Date.now() - awaySince"), "brief task switching is not separated from extended absence");
assert(provider.includes("LocalAuthentication.authenticateAsync") && provider.includes("disableDeviceFallback: false"), "operating-system verification and secure fallback are incomplete");
assert(provider.includes("AppState.currentState !== \"active\"") && provider.includes("currentAttempt !== attempt.current"), "stale or backgrounded verification can disclose work");
assert(shield.includes("!foregroundReady || !deviceReady") && shield.includes("accessibilityElementsHidden={privateState}"), "device and canonical session gates do not jointly protect the mounted tree");
assert(shield.includes("retryDeviceAuthentication") && shield.includes("signOutSafely"), "cancelled or unavailable verification lacks safe recovery");
assert(provider.includes('setDeviceReady(false);\n    if (supabase) void supabase.auth.signOut({ scope: "local" })'), "local sign-out can reveal work before the session is removed");
for (const forbidden of ["access_token", "refresh_token", "biometricType", "supportedAuthenticationTypes", "console.", "AsyncStorage", "SecureStore", "fetch("]) {
  assert(!provider.includes(forbidden), `device gate contains forbidden data or authority reference: ${forbidden}`);
}

console.log("MOB-18 native device reauthentication assertions passed.");
