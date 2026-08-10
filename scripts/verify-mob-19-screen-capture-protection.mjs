import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const pkg = JSON.parse(read("apps/mobile/package.json"));
const layout = read("apps/mobile/app/_layout.tsx");
const protection = read("apps/mobile/src/features/privacy/ScreenCaptureProtection.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-19 assertion failed: ${message}`); };

assert(/^MOB-(?:19|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-19");
assert(pkg.dependencies?.["expo-screen-capture"], "Expo-supported native capture protection is absent");
assert(layout.includes("<ScreenCaptureProtection>") && layout.indexOf("<ScreenCaptureProtection>") < layout.indexOf("<AuthProvider>"), "capture guard does not cover authentication and navigation");
assert(protection.includes('usePreventScreenCapture(ROOT_CAPTURE_GUARD)') && protection.includes('"3bigha-root-private-surface"'), "one keyed root capture guard is not installed");
for (const forbidden of ["addScreenshotListener", "useScreenshotListener", "requestPermissionsAsync", "MediaLibrary", "fetch(", "console.", "AsyncStorage", "SecureStore", "session", "role", "approval"]) {
  assert(!protection.includes(forbidden), `capture guard contains forbidden data, permission or authority reference: ${forbidden}`);
}

console.log("MOB-19 native screen-capture protection assertions passed.");
