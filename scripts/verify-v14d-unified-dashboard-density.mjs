import fs from "node:fs";
import path from "node:path";

const shellPath = path.join(
  process.cwd(),
  "components/3bos/vendor/VendorDashboardApplicationShell.tsx"
);

const shell = fs.readFileSync(shellPath, "utf8");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(shell.includes("V14D_UNIFIED_DASHBOARD_DENSITY"), "Unified density layer missing.");

for (const marker of [
  "V14A_FINAL_DENSITY_OVERRIDE",
  "V14B_READABLE_FINAL_OVERRIDE",
  "V14C_FINAL_GAP_COMPRESSION",
]) {
  check(!shell.includes(marker), `Conflicting old override remains: ${marker}`);
}

for (const marker of [
  "font-size: 14px",
  "font-size:17px",
  "font-size:11px",
  "margin-top: -54px",
  "min-height:126px",
  "min-height:102px",
]) {
  check(shell.includes(marker), `Missing unified rule: ${marker}`);
}

console.log("V-14D Unified Dashboard Density assertions passed.");
console.log("Old conflicting override layers were removed.");
console.log("Readable typography and compact spacing now come from one authoritative block.");
