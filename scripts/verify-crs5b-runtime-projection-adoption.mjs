import fs from "node:fs";

const loader = fs.readFileSync(
  "lib/identity/loadIdentityProjections.ts",
  "utf8"
);

const compatibility = fs.readFileSync(
  "lib/registration/resolveRegistrationCompatibilityProjection.ts",
  "utf8"
);

const access = fs.readFileSync(
  "lib/access/resolveAccess.ts",
  "utf8"
);

const completion = fs.readFileSync(
  "app/api/onboarding/complete-registration/route.ts",
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
  "loadIdentityProjectionSet",
  'from("identity_master")',
  "resolveIdentityProjection",
  "compatibilityModules",
  "navigationModules",
  "marketplaceModules",
  "rfqModules",
]) {
  requireMarker(loader, marker, "Projection loader");
}

for (const marker of [
  "projectedModules",
  "projectedModuleGrants",
]) {
  requireMarker(
    compatibility,
    marker,
    "Registration compatibility"
  );
}

for (const forbidden of [
  'portalUseReason === "operate_multiple_businesses"',
  'portalUseReason === "manage_builder_projects"',
  'portalUseReason === "sell_materials"',
  'portalUseReason === "offer_services"',
  'portalUseReason === "provide_rentals"',
  'portalUseReason === "list_property_for_sale"',
  'portalUseReason === "invest_in_opportunities"',
]) {
  if (access.includes(forbidden)) {
    throw new Error(
      `Hard-coded runtime grant rule remains: ${forbidden}`
    );
  }
}

for (const marker of [
  "loadIdentityProjectionSet",
  "business_identities",
  "individual_identities",
  "identityProjection.compatibilityModules",
]) {
  requireMarker(access, marker, "Runtime access");
  requireMarker(completion, marker, "Registration completion");
}

console.log(
  "CRS-5B runtime identity projection adoption assertions passed."
);
