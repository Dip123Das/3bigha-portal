import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const files = [
  "apps/mobile/src/features/auth/AuthGatewayScreen.tsx",
  "apps/mobile/src/features/onboarding/OnboardingScreen.tsx",
  "apps/mobile/src/features/dashboard/DashboardGateway.tsx",
  "apps/mobile/src/features/notifications/NotificationDeviceCard.tsx",
  "apps/mobile/src/features/release/ReleaseHealthCard.tsx",
];
const source = files.map(read).join("\n");

function assert(condition, message) {
  if (!condition) throw new Error(`MOB-12 assertion failed: ${message}`);
}

assert(app.extra?.mobSprint === "MOB-12", "resolved milestone marker is not MOB-12");
assert(source.includes('accessibilityRole="header"'), "screen-reader heading structure is absent");
assert(source.includes("accessibilityLiveRegion="), "status changes are not announced");
assert(source.includes("accessibilityState="), "control state is not exposed");
assert(source.includes("accessibilityLabel="), "interactive controls lack explicit names");
assert(source.includes("importantForAccessibility=\"no-hide-descendants\""), "decorative dashboard arrow remains exposed");
assert(!source.includes("maxFontSizeMultiplier"), "dynamic text scaling is artificially capped");
assert(!source.includes("allowFontScaling={false}"), "dynamic text scaling is disabled");

for (const file of files) {
  const value = read(file);
  const pressables = [...value.matchAll(/<Pressable\b([^>]*)>/g)];
  for (const [, props] of pressables) {
    assert(/accessibilityRole=/.test(props), `${file} contains a Pressable without an accessibility role`);
  }
  const inputs = [...value.matchAll(/<TextInput\b([^>]*)\/?\s*>/g)];
  for (const [, props] of inputs) {
    assert(/accessibilityLabel=/.test(props), `${file} contains a TextInput without an accessibility label`);
  }
}

console.log("MOB-12 native accessibility assertions passed.");
