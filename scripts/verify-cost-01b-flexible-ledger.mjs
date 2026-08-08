import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const migrationPath = path.join(
  root,
  "supabase/migrations/20260808153000_flexible_cost_ledger_custom_fields.sql"
);
const customFieldPath = path.join(
  root,
  "lib/cost-execution/custom-fields.ts"
);
const foundationMigrationPath = path.join(
  root,
  "supabase/migrations/20260808143000_universal_cost_execution_foundation.sql"
);

function read(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} missing: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(migrationPath, "COST-01B migration");
const customFields = read(customFieldPath, "COST-01B custom field library");
const foundation = read(
  foundationMigrationPath,
  "COST-01A production/project foundation"
);

for (const marker of [
  "bos_cost_custom_fields",
  "bos_cost_entry_custom_values",
  "custom_data jsonb",
  "refresh_bos_cost_plan_actual_total",
]) {
  check(
    migration.includes(marker),
    `Flexible-ledger marker missing: ${marker}`
  );
}

for (const fieldType of [
  "text",
  "number",
  "currency",
  "date",
  "boolean",
  "select",
]) {
  check(
    migration.includes(`'${fieldType}'`),
    `Custom field type missing: ${fieldType}`
  );
}

check(
  migration.includes("sum(amount)"),
  "Actual plan total must be derived from ledger entries."
);

check(
  migration.includes("security invoker"),
  "Actual-total refresh must not bypass caller RLS."
);

check(
  customFields.includes("PROTECTED_COST_LEDGER_COLUMNS"),
  "Protected accounting columns must remain stable."
);

check(
  customFields.includes("makeCostCustomFieldKey"),
  "User-defined ledger column key helper missing."
);

check(
  customFields.includes("Jungle clearing labour") &&
    customFields.includes("Vehicle fare"),
  "Human examples from the production ledger requirement are missing."
);

check(
  foundation.includes("bos_cost_entries") &&
    foundation.includes("'wage'") &&
    foundation.includes("'transport'"),
  "COST-01A must retain wage and transport expenditure support."
);

console.log(
  "COST-01B flexible production/project ledger assertions passed."
);
