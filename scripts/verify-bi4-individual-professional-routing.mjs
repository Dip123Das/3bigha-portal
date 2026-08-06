import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const resolverPath = path.join(
  root,
  "lib/3bos/identity/individual-professional-eligibility.ts"
);

const registerPath = path.join(
  root,
  "app/auth/register-role/RegisterRolePageClient.tsx"
);

const onboardingPath = path.join(
  root,
  "app/onboarding/individual-professional/IndividualProfessionalOnboardingClient.tsx"
);

for (const file of [resolverPath, registerPath, onboardingPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`Required file missing: ${file}`);
  }
}

const resolver = fs.readFileSync(resolverPath, "utf8");
const register = fs.readFileSync(registerPath, "utf8");
const onboarding = fs.readFileSync(onboardingPath, "utf8");

for (const marker of [
  "resolveIndividualProfessionalEligibility",
  "self_working_individual",
  "contractor_or_business_identity",
  "minimumLiveWorkPhotos: 2",
  "contractorsEligible: false",
]) {
  if (!resolver.includes(marker)) {
    throw new Error(`Eligibility marker missing: ${marker}`);
  }
}

for (const marker of [
  "individualProfessionalEligibility",
  "/onboarding/individual-professional",
  "requiresBusinessOnboarding",
]) {
  if (!register.includes(marker)) {
    throw new Error(`Registration routing marker missing: ${marker}`);
  }
}

for (const marker of [
  "Lifetime-Free Individual Skilled Professional",
  "Use your original name",
  "Contractor eligibility check",
  "worker_declaration_accepted",
  "lifetime_free_eligible: false",
  "Continue with Business Registration",
]) {
  if (!onboarding.includes(marker)) {
    throw new Error(`Onboarding marker missing: ${marker}`);
  }
}

console.log(
  "BI-4 individual professional eligibility and routing assertions passed."
);
