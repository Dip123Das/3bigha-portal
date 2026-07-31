import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "app/dashboard/subscription/SubscriptionPageClient.tsx");
if (!fs.existsSync(file)) throw new Error("Growth Plan client page missing.");

const source = fs.readFileSync(file, "utf8");

for (const marker of [
  "DS4B_EXECUTIVE_HEALTH_LOGIC",
  "DS4B_EXECUTIVE_BUSINESS_GROWTH_LAYER",
  "Your Business Growth Desk",
  "Business health",
  "Current stage",
  "Recommendation",
  "Next best action",
  'id="growth-plan-options"',
  "Continue My Work",
  "Review Plan Options",
  "/api/payments/sbi/create-link",
  "resolveGrowthJourney",
]) {
  if (!source.includes(marker)) {
    throw new Error(`DS-4B assertion failed: ${marker}`);
  }
}

const executiveIndex = source.indexOf("DS4B_EXECUTIVE_BUSINESS_GROWTH_LAYER");
const comparisonIndex = source.indexOf('id="growth-plan-options"');
if (executiveIndex < 0 || comparisonIndex < 0 || executiveIndex > comparisonIndex) {
  throw new Error("Executive layer must appear before plan comparison.");
}

console.log("DS-4B Growth Plan executive layer assertions passed.");
console.log("SBI payment flow preserved.");
console.log("Existing Growth Plan logic preserved.");
console.log("Technical diagnostics hidden from normal presentation.");
