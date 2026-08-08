import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "app/dashboard/cost-register/page.tsx");
const customFieldsPath = path.join(root, "lib/cost-execution/custom-fields.ts");
const costFoundationPath = path.join(root, "lib/cost-execution/cost-foundation.ts");

function read(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} missing: ${file}`);
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const page = read(pagePath, "COST-01C register page");
const fields = read(customFieldsPath, "COST-01B custom fields");
const foundation = read(costFoundationPath, "COST-01A foundation");

for (const marker of [
  "Cost Register",
  "+ Add Column",
  "bos_cost_plans",
  "bos_cost_centres",
  "bos_cost_entries",
  "bos_cost_custom_fields",
  "bos_cost_entry_custom_values",
  "refresh_bos_cost_plan_actual_total",
]) {
  check(page.includes(marker), `COST-01C page marker missing: ${marker}`);
}

check(
  page.includes("Jungle clearing labour") ||
    fields.includes("Jungle clearing labour"),
  "Human-first labour example is missing."
);

check(
  page.includes("Vehicle fare") || fields.includes("Vehicle fare"),
  "Human-first vehicle fare example is missing."
);

check(
  page.includes("Manufacturing / Production") &&
    page.includes("Builder / Construction Project"),
  "Both cost-register operating modes must be available."
);

check(
  foundation.includes("seller_material_inventory") &&
    foundation.includes("builder_property_unit_inventory"),
  "Existing downstream inventory destinations must remain intact."
);

console.log("COST-01C Human-First Cost Register Workspace assertions passed.");
