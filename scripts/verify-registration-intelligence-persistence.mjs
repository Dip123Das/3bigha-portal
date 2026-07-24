import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20260724090000_registration_intelligence_snapshots.sql"
);
const persistencePath = path.resolve(
  "lib/registration/intelligence/persist-registration-intelligence.ts"
);
const indexPath = path.resolve(
  "lib/registration/intelligence/index.ts"
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "Missing registration intelligence snapshot migration."
);
assert.equal(
  fs.existsSync(persistencePath),
  true,
  "Missing registration intelligence persistence service."
);

const migration = fs.readFileSync(migrationPath, "utf8");
const persistence = fs.readFileSync(persistencePath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

assert.match(
  migration,
  /create table if not exists public\.registration_intelligence_snapshots/
);
assert.match(migration, /snapshot jsonb not null/);
assert.match(migration, /force row level security/);
assert.match(migration, /auth\.uid\(\) = user_id/);
assert.match(migration, /auth\.uid\(\) = business_id/);
assert.match(
  migration,
  /grant select, insert[\s\S]*to authenticated/
);
assert.doesNotMatch(
  migration,
  /grant[\s\S]*update|grant[\s\S]*delete/
);

assert.match(
  persistence,
  /persistRegistrationIntelligenceSnapshot/
);
assert.match(
  persistence,
  /Authenticated registration owner must match/
);
assert.match(
  persistence,
  /trust_score: input\.snapshot\.trust\.score/
);
assert.match(
  persistence,
  /snapshot: input\.snapshot/
);
assert.match(
  index,
  /persistRegistrationIntelligenceSnapshot/
);

console.log(
  "Registration intelligence persistence assertions passed (immutable snapshots, authenticated ownership, RLS and explainable result storage)."
);
