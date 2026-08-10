import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const config = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
const mobilePackage = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
const workflow = readFileSync(".github/workflows/mobile-foundation.yml", "utf8");
const closure = readFileSync("docs/mobile/MOB-24-mobile-foundation-closure.md", "utf8");
const runner = readFileSync("scripts/verify-mobile-foundation.mjs", "utf8");

assert.equal(config.expo.extra.mobSprint, "MOB-24");
assert.equal(mobilePackage.scripts["verify:foundation"], "node ../../scripts/verify-mobile-foundation.mjs");
assert.match(workflow, /npm run config:check/);
assert.match(workflow, /npm run verify:foundation/);
assert.match(runner, /expectedFinalMilestone = 24/);
assert.match(closure, /Source-complete/);
assert.match(closure, /Physical-device and release-environment gates/);
assert.match(closure, /App-store gates/);
assert.match(closure, /MOB-25 must not be created/);

const mob25Artifacts = [
  ...readdirSync("scripts").filter((name) => /^verify-mob-25-/.test(name)),
  ...readdirSync("docs/mobile").filter((name) => /^MOB-25-/.test(name)),
];
assert.deepEqual(mob25Artifacts, []);

console.log("MOB-24 Mobile Foundation closure assertions passed.");
