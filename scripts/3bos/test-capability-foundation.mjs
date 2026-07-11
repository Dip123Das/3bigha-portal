import fs from "node:fs";

const types = fs.readFileSync(
  "lib/3bos/capability/types.ts",
  "utf8"
);
const registry = fs.readFileSync(
  "lib/3bos/capability/registry.ts",
  "utf8"
);
const eligibility = fs.readFileSync(
  "lib/3bos/capability/eligibility.ts",
  "utf8"
);

const requiredPlans = ["start", "grow", "manage", "scale"];
const missingPlans = requiredPlans.filter(
  (key) => !registry.includes(`  ${key}: {`)
);

if (missingPlans.length) {
  console.error("Missing Growth Plans:", missingPlans);
  process.exit(1);
}

const requiredLegacyPlans = [
  "free",
  "basic_vendor",
  "silver_vendor",
  "gold_vendor",
  "platinum_vendor",
  "premium_vendor",
  "hub_vendor",
];

const missingLegacyPlans = requiredLegacyPlans.filter(
  (key) => !registry.includes(key)
);

if (missingLegacyPlans.length) {
  console.error("Missing legacy plan compatibility:", missingLegacyPlans);
  process.exit(1);
}

const requiredCapabilities = [
  "marketplace",
  "inventory",
  "billing",
  "business_operations",
  "customer_relationships",
  "rfq",
  "intelligent_assistance",
  "business_insights",
  "enterprise",
];

const missingCapabilities = requiredCapabilities.filter(
  (key) => !registry.includes(`  ${key}: capability({`)
);

if (missingCapabilities.length) {
  console.error("Missing capability definitions:", missingCapabilities);
  process.exit(1);
}

if (!types.includes("GrowthPlanKey")) {
  console.error("GrowthPlanKey is missing.");
  process.exit(1);
}

if (!eligibility.includes("resolveCapabilityForIdentityAndPlan")) {
  console.error("Capability resolver is missing.");
  process.exit(1);
}

console.log("Capability and Growth Plan source checks passed.");
