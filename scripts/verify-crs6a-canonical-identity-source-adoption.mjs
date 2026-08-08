import fs from "node:fs";

const source = fs.readFileSync(
  "lib/identity/loadMemberCanonicalIdentityKeys.ts",
  "utf8"
);

const canonical = fs.readFileSync(
  "lib/identity/resolveCanonicalIdentity.ts",
  "utf8"
);

const access = fs.readFileSync(
  "lib/access/resolveAccess.ts",
  "utf8"
);

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) {
    throw new Error(
      `${label} marker missing: ${marker}`
    );
  }
}

for (const marker of [
  'from("business_profiles")',
  '"business_identities,individual_identities"',
  'from("individual_professional_profiles")',
  '"primary_skill_key"',
  "allIdentityKeys",
  "businessIdentityKeys",
  "businessPersonalRoleKeys",
  "individualProfessionalIdentityKeys",
]) {
  requireMarker(
    source,
    marker,
    "Member identity source"
  );
}

for (const marker of [
  "loadMemberCanonicalIdentityKeys",
  "memberIdentitySources.allIdentityKeys",
  "loadIdentityProjectionSet",
]) {
  requireMarker(
    canonical,
    marker,
    "Canonical Identity"
  );

  requireMarker(
    access,
    marker,
    "Runtime Access"
  );
}

if (
  source.includes("nature_of_business")
) {
  throw new Error(
    "Legacy module data must not be interpreted as canonical identity."
  );
}

if (
  source.includes(".upsert(") ||
  source.includes(".insert(") ||
  source.includes(".update(")
) {
  throw new Error(
    "Canonical identity source adapter must remain read-only."
  );
}

console.log(
  "CRS-6A canonical identity source adoption assertions passed."
);
