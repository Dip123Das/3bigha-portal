import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("lib/mobile/contracts/v1.ts");
const server = read("lib/mobile/server/onboarding.ts");
const route = read("app/api/v1/mobile/onboarding/route.ts");
const client = read("apps/mobile/src/features/onboarding/api.ts");
const screen = read("apps/mobile/src/features/onboarding/OnboardingScreen.tsx");

for (const value of [
  "MobileRegistrationLegalConstitution",
  "MobileRegistrationBusinessSector",
  "MobileRegistrationSectorMapping",
  "MobileRegistrationCatalogue",
]) {
  assert.match(contract, new RegExp(value));
}

for (const source of [contract, client]) {
  assert.match(source, /legalConstitutions/);
  assert.match(source, /businessSectors/);
  assert.match(source, /sectorMappings/);
  assert.match(source, /businessIdentities/);
  assert.match(source, /individualIdentities/);
  assert.match(source, /registrationScopes/);
}

assert.match(server, /registration_legal_constitutions/);
assert.match(server, /registration_business_sectors/);
assert.match(server, /registration_identity_sector_map/);
assert.match(server, /\.eq\("is_active", true\)/);
assert.match(server, /registration_scopes/);
assert.match(server, /lifetime_free_candidate/);
assert.match(server, /redirect_to_business/);
assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE/i);
assert.match(server, /CONSTITUTION_REQUIRED/);
assert.match(server, /INVALID_CONSTITUTION/);
assert.match(server, /BUSINESS_IDENTITY_REQUIRED/);
assert.match(server, /INVALID_BUSINESS_IDENTITY/);
assert.match(server, /INVALID_INDIVIDUAL_IDENTITY/);
assert.match(server, /BUSINESS_SECTOR_MAPPING_REQUIRED/);
assert.match(server, /NATURE_MAPPING_REQUIRED/);
assert.match(server, /registrationScopes\.includes\("business_identity"\)/);
assert.match(server, /registrationScopes\.includes\("business_personal_role"\)/);
assert.match(server, /nature_of_business: natureOfBusiness/);
assert.doesNotMatch(server, /input\.natureOfBusiness/);

assert.match(screen, /Legal Constitution/);
assert.match(screen, /Business Sectors/);
assert.match(screen, /What does your organisation do\?/);
assert.match(screen, /Your Individual Identity/);
assert.match(screen, /Derived workspaces/);
assert.match(screen, /accessibilityRole="checkbox"/);
assert.match(screen, /businessIdentities, individualIdentities/);
assert.match(screen, /chooseIdentity\(first\.key, nextPath\)/);
assert.match(screen, /function toggleBusinessIdentity/);
assert.match(screen, /primary operating identity before removing/);
assert.match(screen, /onPress=\{\(\) => toggleBusinessIdentity\(item\.key\)\}/);
assert.doesNotMatch(screen, /Nature \(comma separated\)/);
assert.doesNotMatch(screen, /businessType: "vendor"/);
console.log("MOB-26 canonical native registration read-contract assertions passed.");
