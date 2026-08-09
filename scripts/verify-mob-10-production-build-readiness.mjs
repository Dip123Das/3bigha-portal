import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const eas = JSON.parse(read("apps/mobile/eas.json"));
const dynamicConfig = read("apps/mobile/app.config.ts");
const envExample = read("apps/mobile/.env.example");

const assert = (condition, message) => {
  if (!condition) throw new Error(`MOB-10 assertion failed: ${message}`);
};

assert(app.version === "1.0.0", "release application version must be explicit");
assert(app.android?.package === "com.threebigha.mobile", "Android identity changed");
assert(app.ios?.bundleIdentifier === "com.threebigha.mobile", "iOS identity changed");
assert(app.icon === "./assets/icon.png", "canonical application icon is missing");
assert(app.android?.adaptiveIcon?.foregroundImage === "./assets/adaptive-icon.png", "adaptive icon is missing");
assert(fs.existsSync("apps/mobile/assets/icon.png"), "application icon asset is absent");
assert(fs.existsSync("apps/mobile/assets/adaptive-icon.png"), "adaptive icon asset is absent");
assert(/^MOB-(?:1[0-9]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-10");
assert(eas.build?.development && eas.build?.preview && eas.build?.production, "all build profiles are required");
assert(eas.build.production.environment === "production", "production must use the production EAS environment");
assert(eas.build.production.autoIncrement === true, "store build numbers must be monotonic");
assert(dynamicConfig.includes("EXPO_PROJECT_ID"), "Expo project identity must come from release configuration");
assert(dynamicConfig.includes('runtimeVersion: { policy: "appVersion" }'), "runtime compatibility policy is missing");
assert(envExample.includes("EXPO_PUBLIC_API_URL=https://3bigha.com"), "canonical production origin is undocumented");
assert(!/SERVICE_ROLE|PRIVATE_KEY|PASSWORD|KEYSTORE/i.test(envExample), "private credentials must not enter mobile environment examples");

console.log("MOB-10 production build readiness assertions passed.");
