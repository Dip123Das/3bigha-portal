import fs from "node:fs";

const provider = fs.readFileSync("apps/mobile/src/features/privacy/DeviceReauthenticationProvider.tsx", "utf8");
const shield = fs.readFileSync("apps/mobile/src/features/privacy/AppPrivacyShield.tsx", "utf8");
const app = JSON.parse(fs.readFileSync("apps/mobile/app.json", "utf8"));

const requiredProvider = [
  "FOREGROUND_INACTIVITY_INTERVAL_MS = 5 * 60_000",
  "registerLocalInteraction",
  "clearInactivityTimer",
  "authenticateReturningPerson",
  "AppState.currentState !== \"active\"",
];
for (const marker of requiredProvider) {
  if (!provider.includes(marker)) throw new Error(`MOB-21 missing provider boundary: ${marker}`);
}
if (!shield.includes("onTouchStart={registerLocalInteraction}")) {
  throw new Error("MOB-21 root privacy shield does not observe local touch activity");
}
if (app.expo?.extra?.mobSprint !== "MOB-21") throw new Error("MOB-21 app metadata is not current");
if (/AsyncStorage|SecureStore|fetch\(|console\./.test(provider)) {
  throw new Error("MOB-21 must not persist, transmit or log interaction activity");
}

console.log("MOB-21 foreground inactivity lock assertions passed.");
