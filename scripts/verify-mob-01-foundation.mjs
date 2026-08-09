import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const mobileRoot = path.join(root, "apps", "mobile");

const [appConfigSource, packageSource, foundationSource] = await Promise.all([
  readFile(path.join(mobileRoot, "app.json"), "utf8"),
  readFile(path.join(mobileRoot, "package.json"), "utf8"),
  readFile(
    path.join(
      mobileRoot,
      "src",
      "features",
      "foundation",
      "FoundationScreen.tsx",
    ),
    "utf8",
  ),
]);

const appConfig = JSON.parse(appConfigSource);
const mobilePackage = JSON.parse(packageSource);
const failures = [];

if (appConfig.expo.android?.package !== "com.threebigha.mobile") {
  failures.push("Android application identifier is not canonical.");
}

if (appConfig.expo.ios?.bundleIdentifier !== "com.threebigha.mobile") {
  failures.push("iOS bundle identifier is not canonical.");
}

if (appConfig.expo.newArchEnabled !== true) {
  failures.push("React Native New Architecture is not enabled.");
}

if (mobilePackage.main !== "expo-router/entry") {
  failures.push("Expo Router is not the mobile entry authority.");
}

const prohibitedRuntimePatterns = [
  /react-native-webview/i,
  /\bWebView\b/,
  /server\s*:\s*\{[^}]*url\s*:/s,
  /https:\/\/(?:www\.)?3bigha\.com/,
];

for (const pattern of prohibitedRuntimePatterns) {
  if (
    pattern.test(appConfigSource) ||
    pattern.test(packageSource) ||
    pattern.test(foundationSource)
  ) {
    failures.push(`Prohibited WebView/runtime pattern found: ${pattern}`);
  }
}

if (failures.length > 0) {
  console.error("MOB-01 foundation verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("MOB-01 native foundation assertions passed.");
