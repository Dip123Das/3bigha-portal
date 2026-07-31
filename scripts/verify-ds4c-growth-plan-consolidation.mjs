import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "app/dashboard/subscription/SubscriptionPageClient.tsx",
);

if (!fs.existsSync(file)) {
  throw new Error("Growth Plan client page missing.");
}

const source = fs.readFileSync(file, "utf8");

for (const marker of [
  "DS4B_EXECUTIVE_BUSINESS_GROWTH_LAYER",
  "DS4C_CONSOLIDATED_GROWTH_PRESENTATION",
  'className="legacyGrowthComparison"',
  "Growth support readiness",
  "does not measure the true health of your business",
  'id="growth-plan-options"',
  "/api/payments/sbi/create-link",
  "resolveGrowthJourney",
]) {
  if (!source.includes(marker)) {
    throw new Error(`DS-4C assertion failed: ${marker}`);
  }
}

const executiveIndex = source.indexOf("DS4B_EXECUTIVE_BUSINESS_GROWTH_LAYER");
const planIndex = source.indexOf('id="growth-plan-options"');

if (executiveIndex < 0 || planIndex < 0 || executiveIndex > planIndex) {
  throw new Error("Executive guidance must remain before plan options.");
}

if (
  !source.includes(".subPage .revenueHero,") ||
  !source.includes(".subPage .legacyGrowthComparison")
) {
  throw new Error("Duplicated legacy growth sections were not visually retired.");
}

console.log("DS-4C Growth Plan consolidation assertions passed.");
console.log("Executive guidance remains primary.");
console.log("Duplicated legacy guidance and comparison are retired.");
console.log("SBI payment and Growth Journey logic remain preserved.");
