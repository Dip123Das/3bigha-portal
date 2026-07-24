import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterPath = path.resolve(
  "lib/btce/adapters/registration-evidence-adapter.ts"
);
const indexPath = path.resolve("lib/btce/index.ts");

assert.equal(fs.existsSync(adapterPath), true, "Missing BTCE registration adapter.");
assert.equal(fs.existsSync(indexPath), true, "Missing BTCE public index.");

const adapter = fs.readFileSync(adapterPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.match(adapter, /adaptRegistrationEvidence/);
assert.match(adapter, /registration\.legal/);
assert.match(adapter, /registration\.physical/);
assert.match(adapter, /registration\.identity\.live-selfie/);
assert.match(adapter, /registration\.capability\.declaration/);
assert.match(adapter, /A declaration is not treated as proof of capability/);
assert.match(adapter, /requiresHumanReview/);
assert.match(index, /adaptRegistrationEvidence/);

console.log(
  "BTCE registration adapter assertions passed (legal, physical, identity and declared capability evidence mapping)."
);
