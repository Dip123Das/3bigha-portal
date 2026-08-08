import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const business = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/business/BusinessOnboardingPageClient.tsx"
  ),
  "utf8"
);

const individual = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalOnboardingClient.tsx"
  ),
  "utf8"
);

const loader = fs.readFileSync(
  path.join(
    root,
    "lib/registration/useRegistrationMasterData.ts"
  ),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "registration_legal_constitutions",
  "registration_business_sectors",
  "registration_identity_sector_map",
  "registration_redirect_rules",
  "registration_scopes",
  "individualSkills",
  "businessPersonalRoles",
  "businessIdentitiesForSector",
  "natureForBusinessIdentities",
]) {
  check(
    loader.includes(marker),
    `Registration master loader marker missing: ${marker}`
  );
}

for (const forbidden of [
  "LEGAL_CONSTITUTION_OPTIONS",
  "BUSINESS_IDENTITY_GROUPS",
  "BUSINESS_SECTOR_CARDS",
  "BUSINESS_GROUP_BY_SECTOR",
  "INDIVIDUAL_IDENTITY_OPTIONS",
]) {
  check(
    !business.includes(forbidden),
    `Business Registration still hard-codes ${forbidden}`
  );
}

for (const marker of [
  "legalConstitutions",
  "businessSectors",
  "businessPersonalRoles",
  "businessIdentitiesForSector",
  "natureForBusinessIdentities",
  "preselectedBusinessIdentityKey",
  "businessIdentity",
  "redirectTrigger",
]) {
  check(
    business.includes(marker),
    `Business Registration master marker missing: ${marker}`
  );
}

for (const forbidden of [
  "INDIVIDUAL_SKILL_OPTIONS",
  "takesCompleteContracts",
  "suppliesWorkerTeams",
  "operatesFirmOrAgency",
  "primarilySupervises",
  "contractorIndicatorDetected",
  "Continue with Business Registration",
]) {
  check(
    !individual.includes(forbidden),
    `Individual Registration still hard-codes ${forbidden}`
  );
}

for (const marker of [
  "individualSkills",
  "redirectRules.map",
  "selectRedirectRule",
  "registration_redirect_trigger",
  "pending_business_identity",
  "target_business_identity_key",
  "window.location.href",
]) {
  check(
    individual.includes(marker),
    `Automatic redirect marker missing: ${marker}`
  );
}

for (const forbidden of [
  "Technician",
  "Surveyor (Amin)",
  "Architect",
  "Civil Engineer",
  "Structural Engineer",
]) {
  check(
    !individual.includes(forbidden),
    `Business-only professional leaked into Individual Skilled Registration: ${forbidden}`
  );
}

console.log(
  "CRS-4C/D master-driven registration assertions passed."
);
