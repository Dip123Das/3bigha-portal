import fs from "node:fs";

const path =
  "app/onboarding/business/BusinessOnboardingPageClient.tsx";

const source = fs.readFileSync(path, "utf8");

function readinessUsesPureBlogOnly(name) {
  const pattern = new RegExp(
    `const\\s+${name}\\s*=\\s*isPureBlogOnly\\s*\\|\\|`
  );

  return pattern.test(source);
}

function readinessUsesBroadBlogBypass(name) {
  const pattern = new RegExp(
    `const\\s+${name}\\s*=\\s*hasBlog\\s*\\|\\|`
  );

  return pattern.test(source);
}

const readinessNames = [
  "legalProofReady",
  "practicalProofReady",
  "liveSelfieReady",
  "documentVerificationReady",
];

const checks = [
  [
    source.includes(
      "const isPureBlogOnly ="
    ),
    "pure blog-only identity is explicitly calculated",
  ],
  [
    source.includes(
      "const hasNonBlogBusiness ="
    ),
    "mixed business profiles are distinguished from pure bloggers",
  ],
  [
    readinessUsesPureBlogOnly(
      "legalProofReady"
    ),
    "legal proof exemption applies only to pure bloggers",
  ],
  [
    readinessUsesPureBlogOnly(
      "practicalProofReady"
    ),
    "physical proof exemption applies only to pure bloggers",
  ],
  [
    readinessUsesPureBlogOnly(
      "liveSelfieReady"
    ),
    "live selfie exemption applies only to pure bloggers",
  ],
  [
    readinessUsesPureBlogOnly(
      "documentVerificationReady"
    ),
    "document verification exemption applies only to pure bloggers",
  ],
  [
    readinessNames.every(
      (name) =>
        !readinessUsesBroadBlogBypass(name)
    ),
    "mixed blog profiles cannot bypass any proof requirement",
  ],
];

let failed = false;

for (const [passed, label] of checks) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nBlog-only verification exemption verified."
);
