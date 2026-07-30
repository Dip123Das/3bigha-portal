import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "lib/design/business-os-tokens.ts",
  "components/3bos/framework/types.ts",
  "components/3bos/framework/BusinessOsSection.tsx",
  "components/3bos/framework/BusinessOsMetricGrid.tsx",
  "components/3bos/framework/index.ts",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing DS-3A foundation file: ${relative}`);
  }
}

const types = fs.readFileSync(path.join(root, "components/3bos/framework/types.ts"), "utf8");
for (const expected of ["BusinessOsProjection", "BusinessOsAction", "BusinessOsJourneyStage", "BusinessOsMetric"]) {
  if (!types.includes(expected)) throw new Error(`Missing DS-3A contract: ${expected}`);
}

console.log("DS-3A Business Operating System foundation assertions passed.");
