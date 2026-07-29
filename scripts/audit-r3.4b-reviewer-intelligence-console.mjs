import fs from "node:fs";
import { execFileSync } from "node:child_process";

const output =
  "r3.4b-reviewer-intelligence-console-audit.txt";

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

function add(value = "") {
  sections.push(String(value));

  if (!String(value).endsWith("\n")) {
    sections.push("\n");
  }
}

function run(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    return [
      `COMMAND FAILED: ${command} ${args.join(" ")}`,
      error.stdout || "",
      error.stderr || "",
    ].join("\n");
  }
}

function read(path, start = 1, end = 500) {
  if (!fs.existsSync(path)) {
    return `FILE NOT FOUND: ${path}\n`;
  }

  const lines = fs
    .readFileSync(path, "utf8")
    .split(/\r?\n/);

  return lines
    .slice(start - 1, end)
    .map(
      (line, index) =>
        `${String(start + index).padStart(5, " ")} | ${line}`
    )
    .join("\n");
}

heading("R3.4B REVIEWER INTELLIGENCE CONSOLE AUDIT");

add(
  [
    "Purpose:",
    "- inspect the existing administrator approval system",
    "- identify the canonical verification-case source",
    "- preserve existing identity, payment and registration authority",
    "- design a reviewer console without creating a competing status system",
    "",
    "No implementation is performed by this audit.",
  ].join("\n")
);

heading("1. GIT STATE");
add(run("git", ["log", "-8", "--oneline"]));
add(run("git", ["status", "--short"]));

heading("2. CURRENT MEMBER ADMINISTRATION PAGE");
add(read("app/admin/users/page.tsx", 1, 260));

heading("3. CURRENT IDENTITY APPROVAL API");
add(read("app/api/admin/approve-user/route.ts", 1, 260));

heading("4. CURRENT IDENTITY REJECTION API");
add(read("app/api/admin/reject-user/route.ts", 1, 260));

heading("5. MASTER ADMIN AUTHORITY");
add(read("lib/admin/requireMasterAdmin.ts", 1, 300));

heading("6. VERIFICATION CASE TABLE");
add(
  read(
    "supabase/migrations/20260723000700_sbi_payment_readiness.sql",
    1,
    150
  )
);

heading("7. GOVERNMENT DOCUMENT VERIFICATION API");
add(
  read(
    "app/api/ai/vendor-document-verify/route.ts",
    1,
    1150
  )
);

heading("8. GOVERNMENT DOCUMENT INTELLIGENCE ENGINE");
add(
  read(
    "lib/registration/governmentDocumentIntelligence.ts",
    1,
    400
  )
);

heading("9. BUSINESS PROFILE DOCUMENT STORAGE");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "vendor_document_verification_json",
      "legal_proof",
      "legalProof",
      "registration_document",
      "mediaAssets",
      "business_verification",
    ].join("|"),
    "--",
    "app",
    "components",
    "lib",
    "supabase",
  ])
);

heading("10. VERIFICATION CASE READERS AND WRITERS");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "registration_verification_cases",
    "--",
    "app",
    "components",
    "lib",
    "scripts",
    "supabase",
  ])
);

heading("11. ADMIN REVIEW AND DECISION REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "reviewer",
      "reviewed_by",
      "reviewed_at",
      "manual_review",
      "needs_clarification",
      "clarification",
      "approve-user",
      "reject-user",
      "approval_status",
    ].join("|"),
    "--",
    "app/admin",
    "app/api/admin",
    "components",
    "lib",
    "supabase",
  ])
);

heading("12. DOCUMENT VIEW AND SIGNED URL INFRASTRUCTURE");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "createSignedUrl",
      "signedUrl",
      "signed_url",
      "download",
      "storage.from",
      "media_assets",
      "document_url",
      "file_url",
    ].join("|"),
    "--",
    "app",
    "components",
    "lib",
  ])
);

heading("13. REGISTRATION AUTHORITY AND ACTIVATION");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "activationAllowed",
      "registrationReady",
      "verified_by_ai",
      "document_verification_status",
      "complete-registration",
      "evaluate-registration",
      "strict_registration_authority",
    ].join("|"),
    "--",
    "app",
    "components",
    "lib",
    "supabase",
  ])
);

heading("14. EXISTING ADMIN PAGE PATTERNS");
add(
  run("find", [
    "app/admin",
    "-maxdepth",
    "5",
    "-type",
    "f",
    "-name",
    "page.tsx",
  ])
);

heading("15. EXISTING ADMIN API PATTERNS");
add(
  run("find", [
    "app/api/admin",
    "-maxdepth",
    "5",
    "-type",
    "f",
    "-name",
    "route.ts",
  ])
);

heading("16. DATABASE REVIEW-CAPABILITY SEARCH");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "review_decision",
      "review_status",
      "review_reason",
      "reviewed_by",
      "reviewed_at",
      "clarification",
      "verification_event",
      "verification_history",
    ].join("|"),
    "--",
    "supabase/migrations",
    "supabase/sql",
  ])
);

heading("17. REQUIRED ARCHITECTURAL QUESTIONS");
add(
  [
    "A. What exactly is being reviewed?",
    "   1. the latest AI verification case;",
    "   2. a specific immutable verification case;",
    "   3. the user's current business proof snapshot;",
    "   4. or all three with an explicit relationship?",
    "",
    "B. Can registration_verification_cases remain append-only?",
    "   Reviewer decisions should normally create a new event rather than overwrite AI evidence.",
    "",
    "C. Does the existing status constraint support reviewer decisions?",
    "   Current values must be inspected before introducing approved, rejected or clarification states.",
    "",
    "D. Must manual approval activate registration?",
    "   The console must not bypass canonical registration readiness, SBI payment authority or activation RPCs.",
    "",
    "E. Where are certificate URLs stored?",
    "   The reviewer must receive a secure, time-limited document URL rather than a public storage assumption.",
    "",
    "F. Should identity approval remain separate?",
    "   Requested-role approval and legal-document verification are different constitutional decisions.",
    "",
    "G. What does 'Needs clarification' mean?",
    "   It should preserve uploaded evidence and request a specific correction without labelling the person fraudulent.",
    "",
    "H. What should be immutable?",
    "   AI result, reviewer identity, reviewer decision, reason, timestamp and source verification case.",
  ].join("\n")
);

heading("18. PROVISIONAL R3.4B BOUNDARY");
add(
  [
    "The implementation should provisionally contain:",
    "",
    "1. A dedicated master-admin verification-review page.",
    "2. A queue based on immutable registration verification cases.",
    "3. Latest-case and historical-attempt visibility.",
    "4. User-entered versus AI-extracted field comparison.",
    "5. Field confidence and review-state presentation.",
    "6. Secure certificate viewing through existing storage infrastructure.",
    "7. Approve, needs-clarification and reject decisions.",
    "8. Reviewer identity, timestamp and reason.",
    "9. No direct subscription activation.",
    "10. No replacement of the canonical registration readiness resolver.",
    "11. No mutation of the original AI verification result.",
    "12. Separate document review from requested-role approval.",
  ].join("\n")
);

heading("19. AUDIT COMPLETION CHECKLIST");
add(
  [
    "[ ] Canonical source verification case identified",
    "[ ] Existing proof snapshot location identified",
    "[ ] Existing secure document-view mechanism identified",
    "[ ] Existing admin authorization confirmed",
    "[ ] Existing activation authority confirmed",
    "[ ] Existing review schema found or absence confirmed",
    "[ ] Status-vocabulary collision risk documented",
    "[ ] Identity approval kept separate",
    "[ ] Payment activation kept separate",
    "[ ] Migration need determined",
    "[ ] Reviewer page route determined",
    "[ ] Reviewer API route determined",
  ].join("\n")
);

fs.writeFileSync(
  output,
  sections.join(""),
  "utf8"
);

console.log(`Created ${output}`);
