import fs from "node:fs";

const path =
  "lib/registration/resolveRegistrationCompatibilityProjection.ts";

const source = fs.existsSync(path)
  ? fs.readFileSync(path, "utf8")
  : "";

const checks = [
  ["resolver exists", fs.existsSync(path)],
  [
    "resolver exported",
    source.includes(
      "export function resolveRegistrationCompatibilityProjection"
    ),
  ],
  [
    "permitted member roles are explicit",
    source.includes('"buyer"') &&
      source.includes('"vendor"') &&
      source.includes('"builder"') &&
      source.includes('"hub_vendor"') &&
      source.includes('"blogger"') &&
      source.includes('"investor"'),
  ],
  [
    "unknown role is rejected",
    source.includes(
      "requires an existing permitted member role"
    ),
  ],
  [
    "resolver does not accept requested role",
    !source.includes("requestedRole"),
  ],
  [
    "resolver does not mutate approval",
    !source.includes("approval_status"),
  ],
  [
    "resolver does not mutate verification state",
    !source.includes("registration_verification_status"),
  ],
  [
    "onboarding version compatibility preserved",
    source.includes("onboarding_version: 2"),
  ],
  [
    "onboarding completion compatibility preserved",
    source.includes("onboarding_completed: true"),
  ],
  [
    "portal use reason preserved",
    source.includes("portal_use_reason"),
  ],
  [
    "role display label preserved",
    source.includes("role_display_label"),
  ],
  [
    "Vendor Hub receives unified grants",
    source.includes('"property_builder"') &&
      source.includes('"blog_author"') &&
      source.includes('"investor"'),
  ],
  [
    "Builder receives builder grant",
    source.includes('return ["property_builder"]'),
  ],
  [
    "Blogger receives author grant",
    source.includes('return ["blog_author"]'),
  ],
  [
    "Investor receives investor grant",
    source.includes('return ["investor"]'),
  ],
  [
    "Buyer receives no vendor module grants",
    source.includes('if (role === "buyer")') &&
      source.includes("return [];"),
  ],
  [
    "vendor grants derive from business nature",
    source.includes('item === "materials"') &&
      source.includes('item === "services"') &&
      source.includes('item === "rentals"') &&
      source.includes('item === "property"'),
  ],
  [
    "compatibility-only contract documented",
    source.includes(
      "never selects, elevates or changes a member role"
    ),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-E2B registration compatibility projection: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
