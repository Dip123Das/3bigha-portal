import fs from "node:fs";

const page = fs.readFileSync("app/admin/inventory-operations/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-08 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const source of [
  "bos_material_inventory_intelligence",
  "bos_inventory_stock_counts",
  "bos_inventory_transactions",
  "bos_material_inventory_reservations",
  "inventory_bills",
  "inventory_dispatches",
  "vendor_vehicles",
]) assert(page.includes(source), `${source} authority is composed`);
for (const workflow of [
  "/dashboard/vendor/inventory-intelligence",
  "/dashboard/vendor/inventory",
  "/dashboard/vendor/billing",
  "/dashboard/vendor/dispatch",
  "/dashboard/vendor/fleet",
]) assert(page.includes(workflow), `${workflow} workflow is preserved`);
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "command center remains read-only");
assert(page.includes("not centrally persisted") && page.includes("does not estimate"), "coverage gaps are explicit");
assert(page.includes('repeat(auto-fit,minmax('), "responsive layout is required");
assert(commandCenter.includes('/admin/inventory-operations'), "command center navigation is integrated");

console.log("ADMIN-08 inventory and vendor operations architecture assertions passed.");
