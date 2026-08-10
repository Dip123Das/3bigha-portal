import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const installation = read("apps/mobile/src/lib/auth/installation.ts");
const supabase = read("apps/mobile/src/lib/auth/supabase.ts");
const app = JSON.parse(read("apps/mobile/app.json"));
const pkg = JSON.parse(read("apps/mobile/package.json"));

const assertions = [
  [pkg.dependencies["@react-native-async-storage/async-storage"], "ordinary installation storage dependency"],
  [installation.includes("AsyncStorage.getItem(INSTALLATION_SENTINEL)"), "ordinary sentinel read"],
  [installation.includes("SecureStore.getItemAsync(SECURE_SENTINEL)"), "encrypted sentinel read"],
  [installation.includes("localSentinel === null && secureSentinel !== null"), "reinstall detection"],
  [installation.includes('AsyncStorage.setItem(INSTALLATION_SENTINEL, "present")'), "non-secret local sentinel"],
  [installation.includes("WHEN_UNLOCKED_THIS_DEVICE_ONLY"), "device-only encrypted sentinel"],
  [supabase.includes("restorationCheck ??= wasRestoredAfterRemoval()"), "session restoration gate"],
  [supabase.includes("restorationChecked = true"), "one-time restoration decision"],
  [supabase.includes("SecureStore.deleteItemAsync(secureKey)"), "surviving session deletion"],
  [app.expo.extra.mobSprint === "MOB-20", "resolved sprint marker"],
];

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`MOB-20 assertion failed: ${label}`);
}

console.log("MOB-20 reinstall session boundary assertions passed");
