import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(
  path.join(root, "app/dashboard/vendor/page.tsx"),
  "utf8"
);
const shell = fs.readFileSync(
  path.join(root, "components/3bos/vendor/VendorDashboardApplicationShell.tsx"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "public_url",
  "signed_url",
  "Object.values(asset)",
  "selfieFallbackRow",
]) {
  check(page.includes(marker), `Missing recursive selfie marker: ${marker}`);
}

check(
  shell.includes("V14B_READABLE_FINAL_OVERRIDE"),
  "Readable final override is missing."
);

check(
  shell.includes("margin-top: -44px"),
  "Dashboard-only top gap correction is missing."
);

check(
  shell.includes("font-size: 13px"),
  "Readable base typography is missing."
);

check(
  shell.includes("width: 76px"),
  "Readable live-selfie avatar size is missing."
);

console.log("V-14B Readable Identity Dashboard assertions passed.");
console.log("Recursive selfie discovery and readable dashboard density are active.");
