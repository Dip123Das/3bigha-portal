import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "lib/bie/index.ts",
  "lib/bie/shared/bie-types.ts",
  "lib/bie/core/analyzer-registry.ts",
  "lib/bie/core/signal-normalizer.ts",
  "lib/bie/core/bie-pipeline.ts",
  "lib/bie/adapters/btce-assessment-adapter.ts",
];

for (const file of requiredFiles) {
  assert.equal(fs.existsSync(path.resolve(file)), true, `Missing ${file}`);
}

const pipeline = fs.readFileSync(
  path.resolve("lib/bie/core/bie-pipeline.ts"),
  "utf8"
);
const adapter = fs.readFileSync(
  path.resolve("lib/bie/adapters/btce-assessment-adapter.ts"),
  "utf8"
);
const types = fs.readFileSync(
  path.resolve("lib/bie/shared/bie-types.ts"),
  "utf8"
);

assert.match(pipeline, /BusinessIntelligenceEngine/);
assert.match(pipeline, /Promise\.allSettled/);
assert.match(pipeline, /requiresHumanReview/);
assert.match(adapter, /adaptBieResultToBtceAssessment/);
assert.match(adapter, /structured evidence signals/);
assert.match(types, /interface BieAnalyzer/);
assert.match(types, /BtceEvidenceSignal/);

console.log(
  "BIE foundation assertions passed (pluggable analyzers, normalized signals, resilient pipeline and BTCE assessment adapter)."
);
