import fs from "node:fs";

const endpointPath =
  "app/api/onboarding/complete-registration/route.ts";

const source = fs.existsSync(endpointPath)
  ? fs.readFileSync(endpointPath, "utf8")
  : "";

const completionRpc =
  '"complete_self_registration_compatibility"';

const verificationRpc =
  '"evaluate_automated_registration_verification"';

const completionIndex =
  source.indexOf(completionRpc);

const verificationIndex =
  source.indexOf(verificationRpc);

const responseIndex =
  source.indexOf(
    '"REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED"'
  );

const verificationRpcOccurrences =
  source.split(verificationRpc).length - 1;

const checks = [
  [
    "completion endpoint exists",
    fs.existsSync(endpointPath),
  ],
  [
    "POST endpoint exists",
    source.includes(
      "export async function POST()"
    ),
  ],
  [
    "endpoint accepts no request object",
    source.includes(
      "export async function POST()"
    ) &&
      !source.includes(
        "export async function POST(request"
      ) &&
      !source.includes(
        "export async function POST(req"
      ),
  ],
  [
    "request body is never read",
    !source.includes("request.json") &&
      !source.includes("req.json") &&
      !source.includes(".json()"),
  ],
  [
    "authenticated session is used",
    source.includes(
      "supabase.auth.getUser()"
    ),
  ],
  [
    "canonical server client is used",
    source.includes(
      "getSupabaseServerClient"
    ),
  ],
  [
    "compatibility completion RPC is called",
    completionIndex >= 0,
  ],
  [
    "automated verification RPC is called",
    verificationIndex >= 0,
  ],
  [
    "completion precedes verification",
    completionIndex >= 0 &&
      verificationIndex > completionIndex,
  ],
  [
    "verification executes exactly once",
    verificationRpcOccurrences === 1,
  ],
  [
    "verification executes after completion success check",
    source.indexOf(
      "if (result.ok !== true)"
    ) > completionIndex &&
      verificationIndex >
        source.indexOf(
          "if (result.ok !== true)"
        ),
  ],
  [
    "verification RPC accepts no parameters",
    /supabase\.rpc\(\s*"evaluate_automated_registration_verification"\s*\)/s.test(
      source
    ),
  ],
  [
    "client cannot submit role",
    !source.includes("requestedRole") &&
      !source.includes("requested_role"),
  ],
  [
    "client cannot submit verification status",
    !source.includes(
      "requestedVerificationStatus"
    ),
  ],
  [
    "client cannot submit verification score",
    !source.includes(
      "requestedVerificationScore"
    ),
  ],
  [
    "client cannot submit approval decision",
    !source.includes(
      "requestedApproval"
    ),
  ],
  [
    "client cannot submit dashboard activation",
    !source.includes(
      "requestedDashboardActivation"
    ),
  ],
  [
    "verification RPC errors are handled",
    source.includes(
      "AUTOMATED_VERIFICATION_FAILED"
    ),
  ],
  [
    "invalid verification result is rejected",
    source.includes(
      "INVALID_VERIFICATION_RESULT"
    ),
  ],
  [
    "combined response code exists",
    responseIndex >= 0,
  ],
  [
    "response follows verification",
    responseIndex > verificationIndex,
  ],
  [
    "completion result is returned",
    source.includes(
      "completion:"
    ) &&
      source.includes(
        "registrationComplete: true"
      ) &&
      source.includes(
        "onboardingCompleted: true"
      ),
  ],
  [
    "verification status comes from RPC result",
    source.includes(
      "verificationResult.status"
    ),
  ],
  [
    "verification score comes from RPC result",
    source.includes(
      "verificationResult.score"
    ),
  ],
  [
    "verification reasons come from RPC result",
    source.includes(
      "verificationResult.reasons"
    ),
  ],
  [
    "dashboard readiness comes from RPC result",
    source.includes(
      "verificationResult.dashboard_status"
    ) &&
      source.includes(
        "verificationResult.can_activate_dashboard"
      ),
  ],
  [
    "dashboard activation result is relayed",
    source.includes(
      "verificationResult.dashboard_activated"
    ),
  ],
  [
    "decision source comes from RPC result",
    source.includes(
      "verificationResult.decision_source"
    ),
  ],
  [
    "dashboard is not activated by route",
    !source.includes(
      'dashboard_activation_status: "active"'
    ) &&
      !source.includes(
        'dashboardActivation: "active"'
      ) &&
      !source.includes(
        "dashboard_activated_at"
      ),
  ],
  [
    "approval is not mutated by route",
    !source.includes(
      ".update({ approval_status"
    ) &&
      !source.includes(
        "approval_status:"
      ),
  ],
  [
    "subscription is not mutated by route",
    !source.includes(
      ".update({ subscription_status"
    ) &&
      !source.includes(
        "subscription_status:"
      ),
  ],
  [
    "role is not assigned by route",
    !source.includes(
      ".update({ role:"
    ) &&
      !source.includes(
        "role: requested"
      ),
  ],
  [
    "no service-role authority is used",
    !source.includes(
      "SUPABASE_SERVICE_ROLE"
    ) &&
      !source.includes(
        "service_role"
      ),
  ],
  [
    "dashboard activation remains explicitly unchanged",
    source.includes(
      'dashboardActivation: "not_changed"'
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
  `\nP04-E4D completion-verification orchestration: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) {
  process.exit(1);
}
