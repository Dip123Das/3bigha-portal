import fs from "node:fs";

const clientPath =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const source = fs.existsSync(clientPath)
  ? fs.readFileSync(clientPath, "utf8")
  : "";

const completionCall =
  '"/api/onboarding/complete-registration"';

const standaloneVerificationCall =
  '"/api/onboarding/evaluate-registration"';

const checks = [
  [
    "business onboarding client exists",
    fs.existsSync(clientPath),
  ],
  [
    "completion handler exists",
    source.includes(
      "async function onFinishRegistration()"
    ),
  ],
  [
    "authenticated completion endpoint is called",
    source.includes(completionCall),
  ],
  [
    "standalone verification endpoint is not called",
    !source.includes(standaloneVerificationCall),
  ],
  [
    "combined server contract is required",
    source.includes(
      "REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED"
    ),
  ],
  [
    "canonical verification object is consumed",
    source.includes(
      "payload?.verification?.status"
    ),
  ],
  [
    "auto verified state is consumed",
    source.includes(
      'case "auto_verified"'
    ),
  ],
  [
    "evidence incomplete state is consumed",
    source.includes(
      'case "evidence_incomplete"'
    ),
  ],
  [
    "correction required state is consumed",
    source.includes(
      'case "correction_required"'
    ),
  ],
  [
    "admin review state is consumed",
    source.includes(
      'case "admin_review_required"'
    ),
  ],
  [
    "restricted state is consumed",
    source.includes(
      'case "restricted"'
    ),
  ],
  [
    "unknown verification status is rejected",
    source.includes(
      "invalid verification status"
    ),
  ],
  [
    "automatic verification continues canonically",
    source.includes(
      'case "auto_verified"'
    ) &&
      source.includes(
        "router.replace(returnTo)"
      ),
  ],
  [
    "evidence incomplete does not enter dashboard",
    /case "evidence_incomplete"[\s\S]*?return;/m.test(
      source
    ),
  ],
  [
    "correction required does not enter dashboard",
    /case "correction_required"[\s\S]*?return;/m.test(
      source
    ),
  ],
  [
    "admin review does not enter dashboard",
    /case "admin_review_required"[\s\S]*?return;/m.test(
      source
    ),
  ],
  [
    "restricted account does not enter dashboard",
    /case "restricted"[\s\S]*?return;/m.test(
      source
    ),
  ],
  [
    "browser does not read request decision input",
    !source.includes(
      "requestedVerificationStatus"
    ) &&
      !source.includes(
        "requestedVerificationScore"
      ) &&
      !source.includes(
        "requestedApproval"
      ) &&
      !source.includes(
        "requestedDashboardActivation"
      ),
  ],
  [
    "browser does not calculate verification score",
    !source.includes(
      "verificationScore ="
    ) &&
      !source.includes(
        "calculateVerification"
      ) &&
      !source.includes(
        "computeVerification"
      ),
  ],
  [
    "browser does not branch on verification score",
    !source.includes(
      "payload?.verification?.score >"
    ) &&
      !source.includes(
        "payload.verification.score >"
      ),
  ],
  [
    "browser does not activate from readiness flag",
    !source.includes(
      "if (payload?.verification?.canActivateDashboard"
    ) &&
      !source.includes(
        "if (payload.verification.canActivateDashboard"
      ),
  ],
  [
    "browser does not activate dashboard directly",
    !source.includes(
      "dashboard_activation_status"
    ) &&
      !source.includes(
        "dashboard_activated_at"
      ),
  ],
  [
    "browser does not mutate approval",
    !source.includes(
      "approval_status:"
    ),
  ],
  [
    "browser does not mutate subscription",
    !source.includes(
      "subscription_status:"
    ),
  ],
  [
    "browser does not assign registration role",
    !source.includes(
      "requested_role"
    ) &&
      !source.includes(
        "requestedRole"
      ),
  ],
  [
    "admin review message confirms no payment requirement",
    source.includes(
      "No payment or dashboard activation is required at this stage."
    ),
  ],
  [
    "restriction message confirms no activation",
    source.includes(
      "Dashboard access has not been activated."
    ),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"} ${label}`
  );

  if (!passed) {
    failures += 1;
  }
}

console.log(
  `\nP04-E4E browser verification consumption: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) {
  process.exit(1);
}
