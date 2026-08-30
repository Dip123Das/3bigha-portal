import fs from "node:fs";

const styles = fs.readFileSync("app/globals.css", "utf8");
const marker = "HDR-03 — Non-overlapping desktop workspace menus";
const contract = styles.slice(styles.indexOf(marker));

if (!contract.includes(".rfqToggle[open]")) {
  throw new Error("Header non-overlap verification failed: open-menu layout contract is missing");
}

if (!contract.includes("position: static !important")) {
  throw new Error("Header non-overlap verification failed: workspace panels still leave document flow");
}

if (!contract.includes("width: min(430px, calc(100vw - 32px))")) {
  throw new Error("Header non-overlap verification failed: laptop-safe panel width is missing");
}

console.log("Global header non-overlap assertions passed.");
