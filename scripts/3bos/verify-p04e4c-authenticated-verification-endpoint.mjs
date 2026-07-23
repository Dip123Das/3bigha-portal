import fs from "node:fs";

const endpointPath =
  "app/api/onboarding/evaluate-registration/route.ts";

const source = fs.existsSync(endpointPath)
  ? fs.readFileSync(endpointPath, "utf8")
  : "";

const checks = [
  [
    "endpoint exists",
    fs.existsSync(endpointPath),
  ],
  [
    "POST endpoint exists",
    source.includes(
      "export async function POST()"
    ),
  ],
  [
    "node runtime is explicit",
    source.includes(
      'export const runtime = "nodejs"'
    ),
  ],
  [
    "endpoint is uncached",
    source.includes(
      'export const dynamic = "force-dynamic"'
    ),
  ],
  [
    "canonical server helper is used",
    source.includes(
      "getSupabaseServerClient"
    ),
  ],
  [
    "authenticated user is resolved",
    source.includes(
      "supabase.auth.getUser()"
    ),
  ],
  [
    "unauthenticated request is rejected",
    source.includes(
      "AUTHENTICATION_REQUIRED"
    ) &&
      source.includes("401"),
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
    !source.includes(".json()") &&
      !source.includes("request.json") &&
      !source.includes("req.json"),
  ],
  [
    "canonical verification RPC is called",
    source.includes(
      '"evaluate_automated_registration_verification"'
    ),
  ],
  [
    "verification RPC receives no arguments",
    source.includes(
      'supabase.rpc(\n      "evaluate_automated_registration_verification"\n    )'
    ),
  ],
  [
    "no service-role client is used",
    !source.includes("service_role") &&
      !source.includes(
        "SUPABASE_SERVICE_ROLE"
      ),
  ],
  [
    "client role is not accepted",
    !source.includes("requestedRole") &&
      !source.includes("requested_role"),
  ],
  [
    "client score is not accepted",
    !source.includes("requestedScore") &&
      !source.includes("verificationScoreInput"),
  ],
  [
    "client verification status is not accepted",
    !source.includes(
      "requestedVerificationStatus"
    ),
  ],
  [
    "client approval is not accepted",
    !source.includes(
      "requestedApproval"
    ),
  ],
  [
    "client dashboard activation is not accepted",
    !source.includes(
      "requestedDashboardActivation"
    ),
  ],
  [
    "automatic success is represented",
    source.includes(
      "REGISTRATION_AUTO_VERIFIED"
    ),
  ],
  [
    "evidence incomplete is represented",
    source.includes(
      "REGISTRATION_EVIDENCE_INCOMPLETE"
    ),
  ],
  [
    "correction required is represented",
    source.includes(
      "REGISTRATION_CORRECTION_REQUIRED"
    ),
  ],
  [
    "admin review is represented",
    source.includes(
      "REGISTRATION_ADMIN_REVIEW_REQUIRED"
    ),
  ],
  [
    "restriction is represented",
    source.includes(
      "REGISTRATION_RESTRICTED"
    ),
  ],
  [
    "restriction returns forbidden",
    source.includes(
      'case "restricted":'
    ) &&
      source.includes("return 403"),
  ],
  [
    "non-passing verification is not reported as success",
    source.includes(
      'ok: decision === "auto_verified"'
    ),
  ],
  [
    "verification status is returned",
    source.includes(
      "verificationStatus: decision"
    ),
  ],
  [
    "verification score is returned",
    source.includes(
      "verificationScore:"
    ),
  ],
  [
    "verification reasons are returned",
    source.includes(
      "verificationReasons:"
    ),
  ],
  [
    "dashboard readiness is returned",
    source.includes(
      "dashboardStatus:"
    ) &&
      source.includes(
        "canActivateDashboard:"
      ),
  ],
  [
    "dashboard activation remains false unless RPC says otherwise",
    source.includes(
      "dashboardActivated:"
    ) &&
      source.includes(
        "result.dashboard_activated === true"
      ),
  ],
  [
    "approval compatibility separation is exposed",
    source.includes(
      "approvalStatusChanged:"
    ),
  ],
  [
    "subscription separation is exposed",
    source.includes(
      "subscriptionChanged:"
    ),
  ],
  [
    "decision source is returned",
    source.includes(
      "decisionSource:"
    ),
  ],
  [
    "invalid RPC result is rejected",
    source.includes(
      "INVALID_VERIFICATION_RESULT"
    ),
  ],
  [
    "RPC failure is handled",
    source.includes(
      "AUTOMATED_VERIFICATION_FAILED"
    ),
  ],
  [
    "unexpected errors are handled",
    source.includes(
      "UNEXPECTED_ERROR"
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
  `\nP04-E4C authenticated verification endpoint: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) {
  process.exit(1);
}
