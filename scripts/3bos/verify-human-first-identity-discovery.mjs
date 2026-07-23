import fs from "node:fs";

const pagePath = "app/auth/register-role/RegisterRolePageClient.tsx";
const page = fs.readFileSync(pagePath, "utf8");

const checks = [
  [
    "main identity catalogue is initially limited",
    page.includes(".filter((item) => item.is_featured)") &&
      page.includes(".slice(0, 9)"),
  ],
  [
    "search keeps the complete managed catalogue available",
    page.includes("family || query || showAllIdentities") &&
      page.includes("? managedIdentities"),
  ],
  [
    "complete identity catalogue remains user disclosed",
    page.includes("Show all work types") &&
      page.includes("Show main choices"),
  ],
  [
    "identity family navigation remains available",
    page.includes("DECLARABLE_IDENTITY_FAMILIES.map"),
  ],
  [
    "human-first work question is visible",
    page.includes("What kind of work do you do?"),
  ],
  [
    "primary workspace explanation remains visible",
    page.includes("Your first choice becomes your main work area"),
  ],
  [
    "protected professional verification remains preserved",
    page.includes("requiresProfessionalVerification") &&
      page.includes("Professional verification required for protected access"),
  ],
  [
    "operating profile entitlement limits remain preserved",
    page.includes("operatingDefinition.limit") &&
      page.includes("changeOperatingProfile"),
  ],
  [
    "LGD geography remains preserved",
    page.includes("<GeoSelector") &&
      page.includes("includeSubdivision") &&
      page.includes("includeBlock") &&
      page.includes("includePlace"),
  ],
  [
    "current-location assistance remains preserved",
    page.includes("useCurrentLocation") &&
      page.includes("/api/onboarding/verify-location"),
  ],
  [
    "business evidence rules remain preserved",
    page.includes("requiresBusinessEvidence") &&
      page.includes("Supporting registration document"),
  ],
  [
    "identity declaration persistence remains preserved",
    page.includes('supabase.rpc("declare_operating_profile"'),
  ],
  [
    "module grant synchronization remains preserved",
    page.includes('supabase.rpc("sync_member_module_grants"'),
  ],
  [
    "approval routing remains preserved",
    page.includes('router.replace("/auth/awaiting-approval")'),
  ],
];

let failures = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}

console.log(
  `\nP04-D1 human-first identity discovery: ${
    checks.length - failures
  }/${checks.length} checks passed.`
);

if (failures) process.exit(1);
