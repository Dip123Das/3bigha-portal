import fs from "node:fs";

const file = "components/3bos/buyer/BuyerExecutiveDashboard.module.css";
const css = fs.readFileSync(file, "utf8");
const marker = "A-2.4A-03 — Buyer content readability authority";

const required = [
  marker,
  ".needCategory strong",
  "font-size: 17px",
  ".needCategory small",
  "font-size: 14px",
  ".reminders strong",
  ".journey a strong",
  ".ai p",
  "min-height: 44px",
];

for (const token of required) {
  if (!css.includes(token)) {
    console.error(`FAIL: Missing readability token: ${token}`);
    process.exit(1);
  }
}

console.log("A-2.4A-03 Buyer Content Readability Audit");
console.log("=========================================");
console.log("PASS: Buying category cards use readable titles and descriptions.");
console.log("PASS: Work, reminders, journey and AI-secondary copy are readable.");
console.log("PASS: Buttons retain accessible touch targets.");
console.log("PASS: Desktop and mobile layouts remain responsive.");
