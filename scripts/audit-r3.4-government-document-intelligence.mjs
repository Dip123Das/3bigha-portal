import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outputPath =
  "r3.4-government-document-intelligence-audit.txt";

const sections = [];

function heading(title) {
  sections.push(
    "\n" +
      "=".repeat(100) +
      `\n${title}\n` +
      "=".repeat(100) +
      "\n"
  );
}

function add(text = "") {
  sections.push(String(text));
  if (!String(text).endsWith("\n")) {
    sections.push("\n");
  }
}

function readFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return `[MISSING] ${relativePath}\n`;
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function run(command, args = []) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return [
      `[COMMAND FAILED] ${command} ${args.join(" ")}`,
      error?.stdout || "",
      error?.stderr || "",
    ].join("\n");
  }
}

function grep(pattern, targets) {
  return run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    pattern,
    "--",
    ...targets,
  ]);
}

heading("R3.4 GOVERNMENT DOCUMENT INTELLIGENCE AUDIT");

add(`Generated: ${new Date().toISOString()}`);
add(`Repository: ${root}`);

heading("1. GIT BASELINE");
add(run("git", ["log", "-8", "--oneline"]));
add(run("git", ["status", "--short"]));

heading("2. CURRENT DOCUMENT VERIFICATION API");
add(
  readFile(
    "app/api/ai/vendor-document-verify/route.ts"
  )
);

heading("3. CANONICAL LEGAL-PROOF VALIDITY ENGINE");
add(
  readFile(
    "lib/registration/legalProofValidity.ts"
  )
);

heading("4. ONBOARDING VERIFICATION REQUEST AND STATUS LOGIC");
add(
  readFile(
    "app/onboarding/business/BusinessOnboardingPageClient.tsx"
  )
);

heading("5. BUSINESS VERIFICATION PANEL");
add(
  readFile(
    "components/onboarding/BusinessVerificationPanel.tsx"
  )
);

heading("6. REGISTRATION READINESS ENGINE");
add(
  readFile(
    "lib/registration/resolveRegistrationReadiness.ts"
  )
);

heading("7. VERIFICATION CASE TABLE USAGE");
add(
  grep(
    [
      "registration_verification_cases",
      "verification_case",
      "verification_cases",
      "document_verification",
    ].join("|"),
    [
      "app",
      "components",
      "lib",
      "scripts",
      "supabase",
    ]
  )
);

heading("8. ADMIN BUSINESS AND USER REVIEW ROUTES");
add(
  grep(
    [
      "approve-user",
      "reject-user",
      "banker-verification",
      "vendor-control",
      "awaiting-approval",
      "manual_review",
      "needs_manual_review",
    ].join("|"),
    [
      "app/admin",
      "app/api/admin",
      "components",
      "lib",
    ]
  )
);

heading("9. DATABASE MIGRATIONS RELATED TO REGISTRATION");
add(
  grep(
    [
      "registration_verification_cases",
      "business_profiles",
      "registration_status",
      "approval_status",
      "verification_status",
      "document_verification",
    ].join("|"),
    [
      "supabase/migrations",
      "supabase/sql",
    ]
  )
);

heading("10. DOCUMENT STATUS VOCABULARY");
add(
  grep(
    [
      "verified_by_ai",
      "needs_manual_review",
      "document_mismatch",
      "format_invalid",
      "needs_document",
      "needs_correction",
      "documentExpired",
    ].join("|"),
    [
      "app",
      "components",
      "lib",
      "scripts",
    ]
  )
);

heading("11. GOVERNMENT DOCUMENT TYPES");
add(
  grep(
    [
      "trade_license",
      "trade-license",
      "gst",
      "udyam",
      "fssai",
      "shop_establishment",
      "professional_registration",
      "pan",
    ].join("|"),
    [
      "app/api/ai/vendor-document-verify",
      "components/onboarding",
      "app/onboarding/business",
      "lib/registration",
    ]
  )
);

heading("12. ADMIN AUTHORIZATION AND ROLE GUARDS");
add(
  grep(
    [
      "isAdmin",
      "admin",
      "service_role",
      "getUser",
      "getSession",
      "resolveAccess",
      "require.*admin",
    ].join("|"),
    [
      "app/api/admin",
      "app/admin",
      "lib/access",
      "lib",
    ]
  )
);

heading("13. VERIFICATION AUDIT SCRIPTS");
add(
  run("bash", [
    "-lc",
    "ls -1 scripts/*verification* scripts/*registration* scripts/*r3* 2>/dev/null || true",
  ])
);

heading("14. RELEVANT SCHEMA FILES");
add(
  run("bash", [
    "-lc",
    [
      "find supabase/migrations supabase/sql",
      "-maxdepth 2 -type f",
      "\\(",
      "-iname '*registration*'",
      "-o -iname '*verification*'",
      "-o -iname '*approval*'",
      "\\)",
      "-print 2>/dev/null",
      "| sort",
    ].join(" "),
  ])
);

heading("15. R3.4 ARCHITECTURAL QUESTIONS");

add(`
A. Is registration_verification_cases the canonical source of review history?

B. Does every successful AI verification create one immutable case row?

C. Can one user have multiple verification attempts, and how is the latest attempt selected?

D. Are extracted fields stored in structured columns or only inside JSON?

E. Is there an existing admin reviewer page that can safely be extended?

F. Which admin roles may approve or reject business proof?

G. Does approval update business_profiles, registration intelligence, auth metadata,
   or another canonical status table?

H. Can manual review be approved without changing the uploaded evidence?

I. Is document_mismatch currently treated as a hard mismatch even when only
   authority/date OCR confidence is low?

J. Are government-document types classified before extraction or merely supplied
   by the selected upload card?

K. Can the current audit table support:
   - reviewer identity
   - reviewer decision
   - decision reason
   - reviewed timestamp
   - extracted fields
   - field-level confidence
   - immutable AI result
   - superseded attempts

L. What is the exact distinction among:
   - evidence uploaded
   - AI verified
   - manual review pending
   - manually verified
   - needs correction
   - rejected
`);

fs.writeFileSync(
  outputPath,
  sections.join(""),
  "utf8"
);

console.log(`Created ${outputPath}`);
