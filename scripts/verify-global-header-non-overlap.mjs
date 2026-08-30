import fs from "node:fs";

const styles = fs.readFileSync("app/globals.css", "utf8");
const controller = fs.readFileSync("app/_components/MobileMenuAutoClose.tsx", "utf8");

if (!styles.includes("--threebigha-header-menu-space")) {
  throw new Error("Header non-overlap verification failed: measured layout space is missing");
}

for (const selector of ["rfqTogglePanel", "postMenuPanel", "megaMenuPanel"]) {
  if (!controller.includes(selector)) {
    throw new Error(`Header non-overlap verification failed: ${selector} is not measured`);
  }
}

if (!controller.includes("panelBottom - headerBottom + 12")) {
  throw new Error("Header non-overlap verification failed: exact panel clearance is missing");
}

if (!controller.includes('addEventListener("toggle", syncHeaderMenuSpace)')) {
  throw new Error("Header non-overlap verification failed: menu toggle synchronization is missing");
}

console.log("Global header non-overlap assertions passed.");
