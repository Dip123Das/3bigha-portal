import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "app/api/onboarding/complete-registration/route.ts";

const source = fs.readFileSync(path, "utf8");

const completionRpc =
  '"complete_self_registration_compatibility"';

const verificationRpc =
  '"evaluate_automated_registration_verification"';

const completionIndex =
  source.indexOf(completionRpc);

const completionSuccessIndex =
  source.indexOf(
    "if (result.ok !== true)"
  );

const verificationIndex =
  source.indexOf(verificationRpc);

const responseIndex =
  source.indexOf(
    '"REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED"'
  );

assert.ok(
  completionIndex >= 0,
  "Completion RPC must exist."
);

assert.ok(
  verificationIndex > completionIndex,
  "Verification must execute after completion."
);

assert.ok(
  verificationIndex > completionSuccessIndex,
  "Verification must execute only after completion success validation."
);

assert.equal(
  source.split(verificationRpc).length - 1,
  1,
  "Verification RPC must execute exactly once."
);

assert.doesNotMatch(
  source,
  /request\.json\(\)|req\.json\(\)/
);

assert.match(
  source,
  /verificationResult\.status/
);

assert.match(
  source,
  /verificationResult\.dashboard_status/
);

assert.match(
  source,
  /verificationResult\.can_activate_dashboard/
);

assert.match(
  source,
  /verificationResult\.decision_source/
);

assert.ok(
  responseIndex > verificationIndex,
  "Combined response must be returned after verification."
);

assert.doesNotMatch(
  source,
  /requestedVerificationStatus|requestedVerificationScore|requestedApproval|requestedDashboardActivation/
);

assert.doesNotMatch(
  source,
  /dashboard_activation_status:\s*"active"|dashboardActivation:\s*"active"|dashboard_activated_at/
);

assert.doesNotMatch(
  source,
  /\.update\(\{\s*approval_status|\.update\(\{\s*subscription_status|\.update\(\{\s*role:/
);

console.log(
  "P04-E4D orchestration contract: 13/13 scenarios passed."
);
