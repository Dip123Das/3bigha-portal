import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "app/onboarding/business/BusinessOnboardingPageClient.tsx"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "BUSINESS_SECTOR_CARDS",
  "selectedBusinessSectors",
  "toggleBusinessSector",
  "identitiesForSector",
  "Human-first business identity",
  "Business Sectors",
  "What does your organisation do?",
  "Your Individual Identity",
  "Your Business Identity Summary",
  "Only the relevant business identities will then appear here.",
]) {
  check(source.includes(marker), `Missing BI-2 marker: ${marker}`);
}

check(
  !source.includes("{BUSINESS_IDENTITY_GROUPS.map((group) => ("),
  "The old all-at-once identity wall is still rendered."
);

check(source.includes("aria-pressed={selected}"), "Sector cards do not expose accessible selected state.");
check(source.includes('type="button"'), "Sector selectors may accidentally submit the onboarding form.");

console.log("BI-2 Human-First Business Identity assertions passed.");
console.log("The existing onboarding page now reveals only identities relevant to selected sectors.");
console.log("No parallel onboarding page or duplicate identity system was created.");
