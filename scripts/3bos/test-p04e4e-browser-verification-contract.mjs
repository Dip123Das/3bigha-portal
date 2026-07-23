import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const source = fs.readFileSync(path, "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCaseBlock(status) {
  const escapedStatus = escapeRegExp(status);

  const match = source.match(
    new RegExp(
      `case "${escapedStatus}": \\{([\\s\\S]*?)\\r?\\n        \\}`,
      "m"
    )
  );

  assert.ok(
    match,
    `${status} branch must exist.`
  );

  return match[1];
}

assert.match(
  source,
  /REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED/
);

assert.match(
  source,
  /payload\?\.verification\?\.status/
);

for (const status of [
  "auto_verified",
  "evidence_incomplete",
  "correction_required",
  "admin_review_required",
  "restricted",
]) {
  assert.match(
    source,
    new RegExp(`case "${status}"`)
  );
}

assert.doesNotMatch(
  source,
  /\/api\/onboarding\/evaluate-registration/
);

assert.doesNotMatch(
  source,
  /requestedVerificationStatus|requestedVerificationScore|requestedApproval|requestedDashboardActivation/
);

assert.doesNotMatch(
  source,
  /if\s*\(\s*payload(?:\?\.)?\.verification(?:\?\.)?\.score\s*[><=]/
);

assert.doesNotMatch(
  source,
  /if\s*\(\s*payload(?:\?\.)?\.verification(?:\?\.)?\.canActivateDashboard/
);

assert.doesNotMatch(
  source,
  /dashboard_activation_status|dashboard_activated_at/
);

const autoVerifiedBlock =
  getCaseBlock("auto_verified");

assert.match(
  autoVerifiedBlock,
  /router\.replace\(returnTo\)/
);

assert.match(
  autoVerifiedBlock,
  /return;/
);

for (const status of [
  "evidence_incomplete",
  "correction_required",
  "admin_review_required",
  "restricted",
]) {
  const block = getCaseBlock(status);

  assert.match(
    block,
    /setMsg\(/
  );

  assert.match(
    block,
    /scrollToId\("sec-review"\)/
  );

  assert.match(
    block,
    /return;/
  );

  assert.doesNotMatch(
    block,
    /router\.replace\(returnTo\)/
  );
}

console.log(
  "P04-E4E browser verification contract: 14/14 scenarios passed."
);
