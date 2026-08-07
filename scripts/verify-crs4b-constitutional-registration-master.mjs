import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const admin = fs.readFileSync(
  path.join(
    root,
    "app/admin/dashboard/master-data/identities/page.tsx"
  ),
  "utf8"
);

const sections = fs.readFileSync(
  path.join(
    root,
    "app/admin/dashboard/master-data/identities/RegistrationMasterSections.tsx"
  ),
  "utf8"
);

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} missing: ${marker}`);
  }
}

for (const marker of [
  "Constitutional Registration Master",
  "registration_scopes",
  "lifetime_free_candidate",
  "redirect_to_business",
  "RegistrationMasterSections",
]) {
  requireMarker(admin, marker, "Admin identity master marker");
}

for (const marker of [
  "registration_legal_constitutions",
  "registration_business_sectors",
  "registration_identity_sector_map",
  "registration_redirect_rules",
  "Business Identity ↔ Sector Mapping",
  "Business Redirect Rules",
  "Registration Preview & Usage",
  "target_business_identity_key",
  "redirect_after_selection",
]) {
  requireMarker(
    sections,
    marker,
    "Registration master section marker"
  );
}

if (
  sections.includes("/admin/dashboard/master-data/registration")
) {
  throw new Error(
    "Parallel registration-admin route detected."
  );
}

console.log(
  "CRS-4B Constitutional Registration Master assertions passed."
);
