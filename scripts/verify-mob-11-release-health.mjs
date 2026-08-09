import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const dynamicConfig = read("apps/mobile/app.config.ts");
const packageJson = JSON.parse(read("apps/mobile/package.json"));
const card = read("apps/mobile/src/features/release/ReleaseHealthCard.tsx");
const dashboard = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");

const assert = (condition, message) => {
  if (!condition) throw new Error(`MOB-11 assertion failed: ${message}`);
};

assert(app.extra?.mobSprint === "MOB-11", "resolved milestone marker is stale");
assert(app.plugins?.includes("expo-updates"), "native update plugin is missing");
assert(packageJson.dependencies?.["expo-updates"], "native update runtime is missing");
assert(dynamicConfig.includes("https://u.expo.dev/${projectId}"), "project-scoped update URL is missing");
assert(dynamicConfig.includes('checkAutomatically: "ON_ERROR_RECOVERY"'), "updates must remain human-controlled");
assert(dynamicConfig.includes('runtimeVersion: { policy: "appVersion" }'), "native compatibility boundary changed");
assert(card.includes("Updates.checkForUpdateAsync()") && card.includes("Updates.fetchUpdateAsync()"), "bounded check and download flow is missing");
assert(card.includes("Updates.isEmergencyLaunch"), "embedded-build recovery state is not presented");
assert(!card.includes("setUpdateURLAndRequestHeadersOverride") && !card.includes("setUpdateRequestHeadersOverride"), "runtime update authority must not be client-controlled");
assert(card.includes("Your current version remains safe to use"), "download failure is not non-blocking");
assert(dashboard.includes("<ReleaseHealthCard />"), "release health is not reachable from the authenticated dashboard");

console.log("MOB-11 native release health assertions passed.");
