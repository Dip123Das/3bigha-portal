import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const entry = fs.readFileSync(
  path.join(
    root,
    "app/auth/register-role/RegisterRolePageClient.tsx"
  ),
  "utf8"
);

const customer = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/customer/CustomerOnboardingClient.tsx"
  ),
  "utf8"
);

const professional = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalOnboardingClient.tsx"
  ),
  "utf8"
);

const business = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/business/BusinessOnboardingPageClient.tsx"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const marker of [
  "Customer / Buyer",
  "Business / Organisation",
  "Individual Skilled Professional",
  "/onboarding/customer",
  "/onboarding/business?registration=1",
  "/onboarding/individual-professional",
  "Mason (Rajmistri)",
  "Electrician",
  "Welder / Fabricator",
  "Surveyor (Amin)",
  "Business / Organisation",
  "Lifetime Free",
]) {
  check(
    entry.includes(marker),
    `Registration entry marker missing: ${marker}`
  );
}

for (const forbidden of [
  "How do you operate?",
  "What kind of work do you do?",
  "Multi-Service Professional",
  "Multi-Business Organisation",
  "Technician",
]) {
  check(
    !entry.includes(forbidden),
    `Duplicate or excluded registration marker remains: ${forbidden}`
  );
}

check(
  !entry
    .split("Individual Skilled Professional")[1]
    ?.includes("Architect"),
  "Architect must not be presented as an Individual Skilled Professional."
);

for (const marker of [
  "Quick customer setup",
  "Customers do not need business proof",
  "primary_human_identity: \"customer\"",
  "p_primary_identity_key:",
  "\"customer\"",
  "sync_member_module_grants",
]) {
  check(
    customer.includes(marker),
    `Customer onboarding marker missing: ${marker}`
  );
}

for (const marker of [
  "Legal Constitution",
  "Business Sectors",
  "Business Name",
]) {
  check(
    business.includes(marker),
    `Canonical business registration marker missing: ${marker}`
  );
}

for (const marker of [
  "isFreshIndividualRegistration",
  "INDIVIDUAL_SKILL_OPTIONS",
  "Choose your primary skill",
  "declare_operating_profile",
  "primary_human_identity:",
  "sync_member_module_grants",
]) {
  check(
    professional.includes(marker),
    `Professional entry marker missing: ${marker}`
  );
}

for (const forbidden of [
  "Technician",
  "Surveyor (Amin)",
  "Architect",
  "Civil Engineer",
  "Valuer",
]) {
  check(
    !professional.includes(forbidden),
    `Excluded professional appears in lifetime-free pathway: ${forbidden}`
  );
}

console.log(
  "CRS-1 constitutional registration assertions passed."
);
