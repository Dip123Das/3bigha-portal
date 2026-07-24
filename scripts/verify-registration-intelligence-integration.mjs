import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const resolverPath = path.resolve(
  "lib/registration/intelligence/resolve-registration-intelligence.ts"
);
const indexPath = path.resolve(
  "lib/registration/intelligence/index.ts"
);

assert.equal(fs.existsSync(resolverPath), true, "Missing registration intelligence resolver.");
assert.equal(fs.existsSync(indexPath), true, "Missing registration intelligence public index.");

const resolver = fs.readFileSync(resolverPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.match(resolver, /adaptRegistrationEvidence/);
assert.match(resolver, /adaptBieResultToBtceAssessment/);
assert.match(resolver, /evaluateBusinessTrust/);
assert.match(resolver, /evaluateCapabilityIntelligence/);
assert.match(resolver, /unmatchedBieResultCount/);
assert.match(resolver, /requiresHumanReview/);
assert.match(resolver, /registration-intelligence-v1/);
assert.match(index, /resolveRegistrationIntelligence/);

console.log(
  "Registration intelligence integration assertions passed (registration evidence, BIE assessments, BTCE trust and capability intelligence orchestration)."
);
