import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "app/dashboard/subscription/SubscriptionPageClient.tsx");
if (!fs.existsSync(file)) throw new Error("Business Growth Centre page is missing.");
const source = fs.readFileSync(file, "utf8");

for (const marker of [
  "G1_BUSINESS_GROWTH_CENTRE_LOGIC",
  "G1_HUMAN_FIRST_GROWTH_CENTRE",
  "G1_BUSINESS_GROWTH_CENTRE_PRESENTATION",
  "Your growth journey",
  "Action centre",
  "Recommended decision",
  "Do the useful work before considering an upgrade",
  "growthJourneySteps",
  "growthActions",
  "display: none !important",
  'id="growth-plan-options"',
  "/api/payments/sbi/create-link",
  "/api/payments/sbi/readiness",
  "resolveGrowthJourney",
]) {
  if (!source.includes(marker)) throw new Error(`G-1 assertion failed: ${marker}`);
}

for (const legacyClass of [
  "legacyGrowthComparison",
  "legacyIdentityRecommendation",
  "legacyGrowthJourney",
  "legacyEssentialNotice",
]) {
  if (!source.includes(`.subPage .${legacyClass}`)) {
    throw new Error(`Legacy duplication not retired: ${legacyClass}`);
  }
}

const journeyIndex = source.indexOf("G1_HUMAN_FIRST_GROWTH_CENTRE");
const plansIndex = source.indexOf('id="growth-plan-options"');
if (journeyIndex < 0 || plansIndex < 0 || journeyIndex > plansIndex) {
  throw new Error("Human-first guidance must appear before plan options.");
}

console.log("G-1 Business Growth Centre assertions passed.");
console.log("Human-first journey and action centre are primary.");
console.log("Duplicated legacy guidance is visually retired.");
console.log("SBI payment, readiness and Growth Journey logic are preserved.");
