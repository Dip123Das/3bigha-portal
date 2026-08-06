import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260806152000_individual_professional_profiles.sql"
);

if (!fs.existsSync(migrationPath)) {
  throw new Error(
    "Individual professional migration is missing."
  );
}

const sql = fs.readFileSync(migrationPath, "utf8");

const requiredMarkers = [
  "create table if not exists public.individual_professional_profiles",
  "primary_skill_key text not null",
  "economic_mode text not null",
  "self_working_individual",
  "worker_declaration_accepted boolean not null",
  "contractor_risk_status text not null",
  "verification_status text not null",
  "lifetime_free_eligible boolean not null",
  "individual_professional_lifetime_free_guard",
  "enable row level security",
  "Individuals can read own professional profile",
  "Individuals can create own professional profile",
  "Individuals can update own incomplete professional profile",
];

for (const marker of requiredMarkers) {
  if (!sql.includes(marker)) {
    throw new Error(
      `Individual professional schema marker missing: ${marker}`
    );
  }
}

if (
  sql.includes("grant delete") ||
  sql.includes("for delete")
) {
  throw new Error(
    "End users must not receive direct delete access."
  );
}

console.log(
  "BI-4 individual professional schema assertions passed."
);
