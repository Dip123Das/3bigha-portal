import fs from "node:fs";

const page = fs.readFileSync("app/auth/register-role/RegisterRolePageClient.tsx", "utf8");
const declaration = fs.readFileSync("lib/3bos/identity/declaration.ts", "utf8");
const registry = fs.readFileSync("lib/3bos/identity/registry.ts", "utf8");
const postLogin = fs.readFileSync("app/auth/post-login/PostLoginPageClient.tsx", "utf8");
const businessOnboarding = fs.readFileSync("app/onboarding/business/BusinessOnboardingPageClient.tsx", "utf8");

const checks = [
  ["neutral first-login identity", page.includes("Welcome, 3Bigha Member")],
  ["non-presumptive identity prompt", page.includes("How would you like to use 3Bigha?")],
  ["primary identity persisted", page.includes("primary_human_identity: identityKey")],
  ["additional identity foundation persisted", page.includes("human_identities: [identityKey]")],
  ["legacy access bridge retained", page.includes("getIdentityDeclarationBridge(identityKey)")],
  ["Banking Professional keeps banker role", declaration.includes('role: "banker"')],
  ["Investor keeps primary investor role", declaration.includes('role: "investor"')],
  ["Multi-Business Operator keeps hub compatibility", declaration.includes('identityKey === "multi_business_operator"') && declaration.includes('role: "hub_vendor"')],
  ["developer is not contractor", registry.includes('label: "Real Estate Project Developer (Promoter)"') && registry.includes('label: "Building Contractor"')],
  ["approved surveyor label", registry.includes('label: "Land Surveyor (Amin)"')],
  ["approved skilled-work labels", registry.includes('label: "Masonry Professional (Rajmistri)"') && registry.includes('label: "Carpentry Professional (Chhutor Mistri)"') && registry.includes('label: "Electrical Technician"')],
  ["property and regulated identities are explicit", registry.includes('label: "Property Seeker"') && registry.includes('label: "Registered Valuer"')],
  ["regulated access is explicit", page.includes("Professional verification required for protected access")],
  ["identity declaration does not mutate protected approval status", !page.includes('approval_status: "active"')],
  ["post-login does not mutate protected approval status", !postLogin.includes('approval_status: "active"') && !postLogin.includes("patch.approval_status")],
  ["business onboarding does not mutate protected approval status", !businessOnboarding.includes('approval_status: "active"')],
  ["newer onboarding versions remain login-compatible", postLogin.includes("Number(profile.onboarding_version || 0) >= 2")],
  ["legacy role picker removed", !page.includes("Who are you? *") && !page.includes("Multi-Business Vendor")],
  ["undignified service wording removed", !page.toLowerCase().includes("labour") && !page.includes("Service Vendor")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("Human Identity Declaration audit passed.");
