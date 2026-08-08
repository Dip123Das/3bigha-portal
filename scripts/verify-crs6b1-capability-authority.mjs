import fs from "node:fs";

const canonical = fs.readFileSync(
  "lib/identity/resolveCanonicalIdentity.ts",
  "utf8"
);

const vendor = fs.readFileSync(
  "app/dashboard/vendor/page.tsx",
  "utf8"
);

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) {
    throw new Error(
      `${label} marker missing: ${marker}`
    );
  }
}

requireMarker(
  canonical,
  "nature_of_business contains legacy module/capability keys",
  "Canonical Identity"
);

requireMarker(
  canonical,
  "loadMemberCanonicalIdentityKeys",
  "Canonical Identity"
);

if (
  canonical.includes(
    "business.business_identities || business.nature_of_business"
  )
) {
  throw new Error(
    "Canonical Identity still interprets nature_of_business as identity data."
  );
}

requireMarker(
  vendor,
  "Runtime capability authority belongs to resolveAccessForUser()",
  "Vendor Dashboard"
);

requireMarker(
  vendor,
  "resolvedCapabilities",
  "Vendor Dashboard"
);

for (const forbidden of [
  "profileCapabilities",
  "mergedCapabilities",
  'item === "property"',
  'item === "materials"',
  'item === "services"',
  'item === "rentals"',
  'item === "blog"',
]) {
  if (vendor.includes(forbidden)) {
    throw new Error(
      `Vendor Dashboard legacy capability reconstruction remains: ${forbidden}`
    );
  }
}

console.log(
  "CRS-6B1 canonical capability authority assertions passed."
);
