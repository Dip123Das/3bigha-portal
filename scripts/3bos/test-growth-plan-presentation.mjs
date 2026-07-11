import fs from "node:fs";

const source = fs.readFileSync(
  "lib/3bos/capability/presentation.ts",
  "utf8"
);

const requiredLabels = [
  "Start",
  "Grow",
  "Manage",
  "Scale",
  "Start — Essential",
  "Start — Extended",
];

const missing = requiredLabels.filter(
  (label) => !source.includes(label)
);

if (missing.length) {
  console.error("Missing Growth Plan presentation labels:", missing);
  process.exit(1);
}

if (!source.includes("resolveLegacyGrowthPlan")) {
  console.error("Legacy Growth Plan resolver is not used.");
  process.exit(1);
}

console.log("Growth Plan presentation source checks passed.");
