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
  "registration_redirect_rules",
  "trigger_key text not null unique",
  "display_text text not null",
  "target_registration_path text not null",
  "redirect_after_selection boolean",
  "business_reason text",
  "target_business_identity_key text",
  "registration_redirect_rules_active_sort_idx",
  "Authenticated members read active redirect rules",
  "Master admin manages redirect rules",
  "'takes_complete_contracts'",
  "'supplies_workers'",
  "'labour_contractor'",
  "'team_manager'",
  "'construction_company'",
  "'service_company'",

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
