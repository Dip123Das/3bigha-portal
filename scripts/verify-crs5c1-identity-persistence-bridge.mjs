import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260807224500_crs5_identity_persistence_bridge.sql",
  "utf8"
);

for (const marker of [
  "alter table public.business_profiles",
  "business_identities text[]",
  "individual_identities text[]",
  "business_profiles_business_identities_idx",
  "business_profiles_individual_identities_idx",
  "Deliberately no backfill from nature_of_business",
]) {
  if (!migration.includes(marker)) {
    throw new Error(
      `CRS-5C1 persistence marker missing: ${marker}`
    );
  }
}

if (
  /update\s+public\.business_profiles[\s\S]*nature_of_business/i.test(
    migration
  )
) {
  throw new Error(
    "CRS-5C1 must not reinterpret nature_of_business as canonical identity data."
  );
}

console.log(
  "CRS-5C1 canonical identity persistence bridge assertions passed."
);
