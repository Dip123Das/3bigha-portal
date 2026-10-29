import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const read = (path) => fs.readFileSync(path, "utf8");
const resolverSource = read("lib/registration/resolveRegistrationState.ts");
const bootstrapSource = read("lib/mobile/server/bootstrap.ts");

assert.match(resolverSource, /dashboardAlreadyActive\?: boolean/);
assert.match(
  bootstrapSource,
  /dashboardAlreadyActive:\s*String\(profile\.dashboard_activation_status\s*\|\|\s*""\)\.toLowerCase\(\)\s*===\s*"active"/,
);
assert.ok(
  resolverSource.indexOf("if (BLOCKED_ACCOUNT_STATES.has(accountStatus))") <
    resolverSource.indexOf("input.dashboardAlreadyActive === true"),
  "A blocked account must remain blocked even if it has an old active-dashboard marker.",
);

const require = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const ts = require("typescript");
const compiled = ts.transpile(resolverSource, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const moduleRecord = { exports: {} };
new Function("exports", "module", compiled)(moduleRecord.exports, moduleRecord);
const { resolveRegistrationState } = moduleRecord.exports;

const completeVendor = {
  role: "hub_vendor",
  accountStatus: "active",
  basicComplete: true,
  onboardingReady: true,
  isBusinessRole: true,
  hasVendorCapabilities: true,
  businessProfileComplete: true,
  registrationComplete: true,
  locationVerified: true,
  eligibleFree: false,
};

assert.equal(
  resolveRegistrationState({
    ...completeVendor,
    dashboardAlreadyActive: true,
  }).state,
  "ESSENTIAL_ACTIVE",
  "A registered, active vendor must not be sent back to registration or plan review.",
);
assert.equal(
  resolveRegistrationState({
    ...completeVendor,
    dashboardAlreadyActive: false,
  }).state,
  "GROWTH_PLAN_REQUIRED",
  "A vendor without an active dashboard retains the existing plan gate.",
);
assert.equal(
  resolveRegistrationState({
    ...completeVendor,
    accountStatus: "re_registration_required",
    dashboardAlreadyActive: true,
  }).state,
  "ACCOUNT_BLOCKED",
  "The active-dashboard shortcut must not bypass an account restriction.",
);

console.log("MOBILE_ACTIVE_DASHBOARD_REGISTRATION_GATE=PASS");
