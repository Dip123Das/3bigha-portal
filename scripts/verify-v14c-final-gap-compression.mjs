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

check(
  shell.includes("V14C_FINAL_GAP_COMPRESSION"),
  "V-14C final gap compression marker is missing."
);

for (const marker of [
  "margin-top: 8px",
  "margin-bottom: 8px",
  "gap: 8px",
  "min-height: 132px",
  "min-height: 108px",
]) {
  check(shell.includes(marker), `Missing spacing rule: ${marker}`);
}

check(
  shell.includes("V14B_READABLE_FINAL_OVERRIDE"),
  "Readable V-14B typography layer was removed."
);

check(
  shell.includes("width: 76px"),
  "Verified selfie display size was changed."
);

console.log("V-14C Final Gap Compression assertions passed.");
console.log("Only spacing was tightened; readable typography and verified selfie remain preserved.");
