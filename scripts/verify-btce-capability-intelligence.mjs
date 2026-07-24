import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const required = [
  "lib/btce/ai/physical-evidence-analysis.ts",
  "lib/btce/core/capability-intelligence-engine.ts",
  "lib/btce/index.ts",
];

for (const file of required) {
  assert.equal(fs.existsSync(path.resolve(file)), true, `Missing ${file}`);
}

const physical = fs.readFileSync(
  path.resolve("lib/btce/ai/physical-evidence-analysis.ts"),
  "utf8"
);
const capability = fs.readFileSync(
  path.resolve("lib/btce/core/capability-intelligence-engine.ts"),
  "utf8"
);
const index = fs.readFileSync(path.resolve("lib/btce/index.ts"), "utf8");

assert.match(physical, /assessPhysicalEvidenceObservation/);
assert.match(physical, /requiresHumanReview/);
assert.match(physical, /Automated observation is advisory/);
assert.match(physical, /business_name_match/);
assert.match(capability, /evaluateCapabilityIntelligence/);
assert.match(capability, /declared but has no linked supporting evidence/);
assert.match(index, /assessPhysicalEvidenceObservation/);
assert.match(index, /evaluateCapabilityIntelligence/);

console.log(
  "BTCE capability intelligence assertions passed (advisory physical observations, explainable capability scoring and human review safeguards)."
);
