import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const contract = read("lib/mobile/contracts/v1.ts");
const server = read("lib/mobile/server/onboarding.ts");
const route = read("app/api/v1/mobile/onboarding/route.ts");
const client = read("apps/mobile/src/features/onboarding/api.ts");

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
}

assert.match(server, /registration_legal_constitutions/);
assert.match(server, /registration_business_sectors/);
assert.match(server, /registration_identity_sector_map/);
assert.match(server, /\.eq\("is_active", true\)/);
assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE/i);

console.log("MOB-26 canonical native registration read-contract assertions passed.");
