import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing: ${rel}`);
  }
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read(
  "supabase/migrations/20260808190000_cost_planning_consumption_control.sql"
);
const variance = read(
  "lib/cost-execution/planning-variance.ts"
);
const panel = read(
  "components/cost-execution/PlanningConsumptionControlPanel.tsx"
);
const register = read(
  "app/dashboard/cost-register/page.tsx"
);
const foundation = read(
  "supabase/migrations/20260808143000_universal_cost_execution_foundation.sql"
);
const measurement = read(
  "app/api/measurement/live/route.ts"
);

check(
  migration.includes("revised_quantity") &&
    migration.includes("bos_cost_entries_plan_line_idx"),
  "COST-02A schema extension is incomplete."
);

for (const marker of [
  "actualQuantityForPlanLine",
  "actualAmountForPlanLine",
  "calculatePlanLineVariance",
  "material_return",
]) {
  check(
    variance.includes(marker),
    `Variance engine marker missing: ${marker}`
  );
}

check(
  panel.includes('from("bos_cost_plan_lines")') &&
    panel.includes('plan_line_id: activeLine.id'),
  "Planning UI must use canonical plan lines and link actual entries through plan_line_id."
);

check(
  panel.includes('/api/measurement/live'),
  "COST-02A must reuse Measurement Master for unit suggestions."
);

check(
  panel.includes("Production Plan / BOM") &&
    panel.includes("Project Plan / BOQ"),
  "Manufacturer and builder terminology must remain human-specific."
);

check(
  panel.includes("Unexpected") &&
    panel.includes("flexible Cost Register"),
  "Flexible unplanned expense workflow must remain explicit."
);

check(
  register.includes("PlanningConsumptionControlPanel"),
  "Cost Register must mount COST-02A planning control."
);

check(
  foundation.includes("plan_line_id uuid references public.bos_cost_plan_lines"),
  "Existing canonical plan-line linkage must remain unchanged."
);

check(
  measurement.includes('from("measurement_units")'),
  "Measurement Master API is not backed by measurement_units."
);

console.log(
  "COST-02A planning & consumption control assertions passed."
);
