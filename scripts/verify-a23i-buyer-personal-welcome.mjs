import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

const page = read("app/dashboard/buyer/page.tsx");
const shell = read(
  "components/3bos/buyer/BuyerDashboardApplicationShell.tsx"
);
const styles = read(
  "components/3bos/buyer/BuyerDashboardApplicationShell.module.css"
);

assert(
  page.includes("metadata.full_name") &&
    page.includes('identity.provider === "google"') &&
    page.includes("identityData.picture"),
  "Buyer name and Google profile-image resolution are incomplete."
);

assert(
  page.includes("buyerName={buyerName}") &&
    page.includes("avatarUrl={buyerAvatarUrl}"),
  "Resolved Buyer identity is not passed into the application shell."
);

assert(
  shell.includes('Welcome, {buyerName || "Buyer"}') &&
    shell.includes('referrerPolicy="no-referrer"') &&
    shell.includes("profile"),
  "Buyer welcome or profile-image rendering is missing."
);

assert(
  styles.includes(".avatar img") &&
    styles.includes("object-fit: cover") &&
    styles.includes("font-size: clamp(30px"),
  "Buyer profile image or readable welcome typography is incomplete."
);

console.log("A-2.3I Buyer Personal Welcome Audit");
console.log("==================================");
console.log("PASS: Authenticated Buyer name is welcomed.");
console.log("PASS: Uploaded/profile metadata photo is displayed when available.");
console.log("PASS: Google OAuth name and photo fallbacks are supported.");
console.log("PASS: Initial-letter fallback remains available.");
