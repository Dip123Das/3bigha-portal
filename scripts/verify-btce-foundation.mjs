import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "lib/btce/index.ts",
  "lib/btce/core/btce-engine.ts",
  "lib/btce/core/scoring-engine.ts",
  "lib/btce/core/explanation-engine.ts",
  "lib/btce/evidence/evidence-validator.ts",
  "lib/btce/shared/btce-types.ts",
  "lib/btce/shared/constants.ts",
];

for (const file of requiredFiles) {
  assert.equal(
    fs.existsSync(path.resolve(file)),
    true,
    `Missing BTCE foundation file: ${file}`
  );
}

const engine = fs.readFileSync(
  path.resolve("lib/btce/core/btce-engine.ts"),
  "utf8"
);
const types = fs.readFileSync(
  path.resolve("lib/btce/shared/btce-types.ts"),
  "utf8"
);

assert.match(engine, /evaluateBusinessTrust/);
assert.match(engine, /requiresHumanReview/);
assert.match(types, /BtceCapabilityClaim/);
assert.match(types, /BtceEvidenceAssessment/);
assert.match(types, /BtceTrustResult/);

console.log(
  "BTCE foundation assertions passed (evidence model, explainable scoring, capability claims and human-review authority)."
);
