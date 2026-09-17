import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
const mobilePackage = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
const workflow = readFileSync(".github/workflows/mobile-foundation.yml", "utf8");
const closure = readFileSync("docs/mobile/MOB-24-mobile-foundation-closure.md", "utf8");
const runner = readFileSync("scripts/verify-mobile-foundation.mjs", "utf8");

const finalMilestoneMatch = runner.match(/const expectedFinalMilestone = (\d+);/);

assert.equal(config.expo.extra.mobSprint, "MOB-24");
assert.equal(mobilePackage.scripts["verify:foundation"], "node ../../scripts/verify-mobile-foundation.mjs");
assert.match(workflow, /npm run config:check/);
assert.match(workflow, /npm run verify:foundation/);
assert.ok(finalMilestoneMatch);
assert.ok(Number(finalMilestoneMatch[1]) >= 24);
assert.match(closure, /Source-complete/);
assert.match(closure, /Physical-device and release-environment gates/);
assert.match(closure, /App-store gates/);
assert.match(closure, /was closed at MOB-24/);
assert.match(closure, /subsequently reopened/);

console.log("MOB-24 Mobile Foundation closure assertions passed.");
