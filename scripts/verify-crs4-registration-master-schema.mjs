import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "supabase/migrations/20260807114500_registration_master_control.sql"
);

if (!fs.existsSync(file)) {
  throw new Error(
    "CRS-4 registration master migration is missing."
  );
}

const sql = fs.readFileSync(file, "utf8");

const required = [
  "registration_scopes text[]",
  "lifetime_free_candidate boolean",
  "redirect_to_business boolean",

  "registration_legal_constitutions",
  "registration_business_sectors",
  "registration_identity_sector_map",

  "'mason'",
  "'carpenter'",
  "'painter'",
  "'electrician'",
  "'plumber'",
  "'welder'",
  "'tile_worker'",
  "'bar_bender'",
  "'shuttering_worker'",
  "'machine_operator'",
  "'equipment_operator'",
  "'driver'",

  "array['individual_skill']",
  "array['business_personal_role']",
  "array['business_identity']",

  "Master admin manages legal constitutions",
  "Master admin manages business sectors",
  "Master admin manages identity sector mappings",
];

for (const marker of required) {
  if (!sql.includes(marker)) {
    throw new Error(
      `CRS-4 registration-master marker missing: ${marker}`
    );
  }
}

for (const forbidden of [
  "'technician',\n    'individual_skill'",
  "'surveyor',\n    'individual_skill'",
  "'architect',\n    'individual_skill'",
  "'civil_engineer',\n    'individual_skill'",
  "'structural_engineer',\n    'individual_skill'",
]) {
  if (sql.includes(forbidden)) {
    throw new Error(
      `Forbidden individual-skilled classification found: ${forbidden}`
    );
  }
}

console.log(
  "CRS-4 registration master schema assertions passed."
);
