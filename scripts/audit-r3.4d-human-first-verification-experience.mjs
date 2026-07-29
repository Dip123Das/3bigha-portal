import fs from "node:fs";
import { execFileSync } from "node:child_process";

const output =
  "r3.4d-human-first-verification-experience-audit.txt";

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
      maxBuffer: 30 * 1024 * 1024,
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

heading("R3.4D HUMAN-FIRST BUSINESS VERIFICATION EXPERIENCE");

add(
  [
    "Visual evidence observed:",
    "- desktop content is too narrow",
    "- excessive vertical scrolling",
    "- registration and verification status are separated",
    "- mobile continuation interrupts the proof journey",
    "- uploaded PDF has no useful visual preview",
    "- multiple competing action buttons exist",
    "- the user is not clearly told what happens next",
    "- verified, pending and incomplete states are presented in different places",
    "",
    "Required constitutional result:",
    "- Human First",
    "- AI Second",
    "- one clear status",
    "- one clear next action",
    "- full-width desktop use",
    "- mobile-first responsiveness",
    "- no backend authority changes",
  ].join("\n")
);

heading("1. GIT STATE");
add(run("git", ["log", "-8", "--oneline"]));
add(run("git", ["status", "--short"]));

heading("2. ONBOARDING PAGE STRUCTURE");
add(
  read(
    "app/onboarding/business/BusinessOnboardingPageClient.tsx",
    1,
    2400
  )
);

heading("3. BUSINESS VERIFICATION PANEL");
add(
  read(
    "components/onboarding/BusinessVerificationPanel.tsx",
    1,
    1800
  )
);

heading("4. BUSINESS IDENTITY JOURNEY");
add(
  read(
    "components/onboarding/BusinessIdentityJourney.tsx",
    1,
    1000
  )
);

heading("5. UNIVERSAL MEDIA UPLOADER");
add(
  read(
    "app/components/media/UniversalMediaUploader.tsx",
    1,
    1600
  )
);

heading("6. MEDIA CONFIGURATION");
add(
  read(
    "lib/media/media-config.ts",
    1,
    800
  )
);

heading("7. ONBOARDING PAGE SHELL");
add(
  read(
    "app/onboarding/business/page.tsx",
    1,
    500
  )
);

heading("8. LAYOUT WIDTH REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "max-w-",
      "maxWidth",
      "width:",
      "layout-container",
      "OperationalPageShell",
      "Container",
      "margin: \"0 auto\"",
      "mx-auto",
    ].join("|"),
    "--",
    "app/onboarding",
    "components/onboarding",
    "app/components/media",
    "app/globals.css",
    "components/layout",
    "components/operational",
  ])
);

heading("9. ACTION BUTTON REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "Save & Continue",
      "Save & Go to Review",
      "Activate My Dashboard",
      "Recheck after changing",
      "Send link to mobile",
      "Copy continuation link",
      ">Save<",
      ">Back<",
    ].join("|"),
    "--",
    "app/onboarding",
    "components/onboarding",
  ])
);

heading("10. STATUS MESSAGE REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "Registration:",
      "Not Complete",
      "verification is in progress",
      "needs manual review",
      "Verified by AI",
      "Legal-document checks completed",
      "Evidence collection",
      "Profile readiness",
      "Go to Next Pending Step",
      "Complete these steps",
    ].join("|"),
    "--",
    "app/onboarding",
    "components/onboarding",
    "lib/registration",
  ])
);

heading("11. MOBILE CONTINUATION REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "complete the photo steps from your mobile",
      "Send link to mobile",
      "Copy continuation link",
      "continuation",
      "mobile phone",
    ].join("|"),
    "--",
    "app/onboarding",
    "components/onboarding",
  ])
);

heading("12. DOCUMENT PREVIEW REFERENCES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "PDF",
      "thumbnail",
      "preview",
      "object",
      "iframe",
      "file_url",
      "publicUrl",
      "signedUrl",
      "mime",
      "contentType",
    ].join("|"),
    "--",
    "app/components/media",
    "components/onboarding",
    "app/onboarding",
    "lib/media",
  ])
);

heading("13. CANONICAL READINESS AUTHORITY");
add(
  read(
    "lib/registration/resolveRegistrationReadiness.ts",
    1,
    700
  )
);

heading("14. LEGAL PROOF VALIDITY AUTHORITY");
add(
  read(
    "lib/registration/legalProofValidity.ts",
    1,
    500
  )
);

heading("15. CURRENT VERIFICATION TYPES");
add(
  run("git", [
    "grep",
    "-n",
    "-I",
    "-E",
    [
      "VendorDocumentVerification",
      "BusinessProofStatus",
      "documentVerificationStatus",
      "registrationReady",
      "activationAllowed",
      "nextRequiredStep",
      "pendingSteps",
    ].join("|"),
    "--",
    "app/onboarding/business/BusinessOnboardingPageClient.tsx",
    "components/onboarding/BusinessVerificationPanel.tsx",
    "lib/registration",
  ])
);

heading("16. REQUIRED R3.4D DESIGN CONTRACT");
add(
  [
    "A. Desktop layout",
    "   - full-width responsive shell",
    "   - two-column desktop composition",
    "   - primary workspace left",
    "   - sticky status/help rail right",
    "   - single-column mobile fallback",
    "",
    "B. Unified status",
    "   - one Business Registration Status card",
    "   - evidence collection status",
    "   - verification decision",
    "   - current journey step",
    "   - next required action",
    "",
    "C. Reduced scrolling",
    "   - active proof section expanded",
    "   - completed supporting sections collapsible",
    "   - mobile continuation moved to side rail or help section",
    "",
    "D. One action hierarchy",
    "   - one primary action",
    "   - Save becomes secondary",
    "   - Back becomes tertiary",
    "   - recheck appears only when relevant",
    "",
    "E. Document presentation",
    "   - useful filename and size",
    "   - clear upload state",
    "   - image preview where possible",
    "   - PDF open/preview affordance",
    "   - do not invent a public URL",
    "",
    "F. Human explanation",
    "   - explain whether user action is required",
    "   - explain whether re-upload is needed",
    "   - explain human review separately from AI result",
    "",
    "G. Preservation requirements",
    "   - preserve all APIs",
    "   - preserve immutable verification history",
    "   - preserve canonical readiness resolver",
    "   - preserve financial-period validity",
    "   - preserve mobile continuation",
    "   - preserve responsive behavior",
    "   - preserve reviewer console",
  ].join("\n")
);

heading("17. IMPLEMENTATION BOUNDARY");
add(
  [
    "The implementation may change presentation and component composition.",
    "It must not:",
    "- change registration authority",
    "- treat AI verification as human approval",
    "- activate subscriptions",
    "- remove evidence requirements",
    "- remove mobile continuation",
    "- expose private storage objects publicly",
    "- duplicate registration readiness logic",
  ].join("\n")
);

fs.writeFileSync(
  output,
  sections.join(""),
  "utf8"
);

console.log(`Created ${output}`);
