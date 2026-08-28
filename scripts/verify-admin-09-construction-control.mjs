import fs from "node:fs";

const page = fs.readFileSync("app/admin/construction-control/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-09 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const authority of [
  "CONSTRUCTION_GRADES",
  "REGIONAL_COST_MULTIPLIERS",
  "FLOOR_COST_MULTIPLIERS",
  "GRADE_MULTIPLIERS",
  "EXACT_PWD_ITEMS",
  "PWD_CORE_SOR_ITEMS",
  "PWD_DISTRICT_CHARGES",
  "construction_projects",
  "construction_project_milestones",
  "construction_project_snapshots",
  "material_price_updates",
]) assert(page.includes(authority), `${authority} is composed`);
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "control center remains read-only");
assert(page.includes("Versioned approval and rollback are not yet available"), "configuration governance gap is explicit");
assert(page.includes("Indicative entries must not be represented"), "indicative PWD coverage is honest");
assert(page.includes("static adjustment logic"), "Price Today adjustment limitation is disclosed");
for (const route of ["/admin/dashboard/price-updates", "/construction-cost", "/dashboard/construction-projects"]) assert(page.includes(route), `${route} canonical workflow is preserved`);
assert(page.includes("repeat(auto-fit,minmax("), "responsive layout is required");
assert(commandCenter.includes("/admin/construction-control"), "command center navigation is integrated");

console.log("ADMIN-09 Construction OS control architecture assertions passed.");
