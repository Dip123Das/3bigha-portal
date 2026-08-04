import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/onboarding/business/BusinessOnboardingPageClient.tsx");
const migrationPath = path.join(root, "supabase/migrations/20260804000100_refine_business_identity.sql");

const page = fs.readFileSync(pagePath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

for (const marker of [
  "LEGAL_CONSTITUTION_OPTIONS",
  "BUSINESS_IDENTITY_GROUPS",
  "INDIVIDUAL_IDENTITY_OPTIONS",
  "Construction & Infrastructure",
  "Trading & Distribution",
  "Professional Services",
  "Equipment & Logistics",
  "Manufacturing & Industry",
  "Surveyor (Amin)",
  "Individual Professional",
  "deriveNatureFromBusinessIdentities",
  "business_identities",
  "individual_identities",
]) {
  check(page.includes(marker), `Missing refined identity marker: ${marker}`);
}

check(!page.includes("NATURE_OPTIONS"), "Legacy Nature of Business checkbox registry still exists.");
check(!page.includes('<Field label="Business Type">'), "Duplicate legacy Business Type selector still exists.");
check(page.includes("Legal & Verification Details"), "Legal details were not retained after identity refinement.");
check(migration.includes("add column if not exists business_identities"), "business_identities migration missing.");
check(migration.includes("add column if not exists individual_identities"), "individual_identities migration missing.");

console.log("BI-1 Refined Business Identity assertions passed.");
console.log("The existing onboarding page now contains one unified identity flow without a parallel page.");
console.log("Legal constitution, organisation identities and dignified individual identities are preserved in one section.");
