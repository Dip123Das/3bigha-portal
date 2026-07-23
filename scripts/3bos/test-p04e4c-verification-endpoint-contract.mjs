import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "app/api/onboarding/evaluate-registration/route.ts";

const source = fs.readFileSync(path, "utf8");

assert.match(
  source,
  /export async function POST\(\)/
);

assert.doesNotMatch(
  source,
  /request\.json\(\)|req\.json\(\)/
);

assert.match(
  source,
  /evaluate_automated_registration_verification/
);

assert.doesNotMatch(
  source,
  /requestedRole|requestedVerificationStatus|requestedApproval|requestedDashboardActivation/
);

assert.match(
  source,
  /ok:\s*decision === "auto_verified"/
);

assert.match(
  source,
  /verificationStatus:\s*decision/
);

assert.match(
  source,
  /canActivateDashboard:/
);

assert.match(
  source,
  /dashboardActivated:/
);

console.log(
  "P04-E4C verification endpoint contract: 8/8 scenarios passed."
);
