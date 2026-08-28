import fs from "node:fs";

const page = fs.readFileSync("app/admin/reliability/page.tsx", "utf8");
const command = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`ADMIN-14 verification failed: ${message}`); };

assert(page.includes("requireMasterAdmin"), "master-admin boundary missing");
assert(page.includes('dynamic = "force-dynamic"'), "dynamic private route missing");
for (const source of ["operational_events", "registration_operations_notifications", "user_security_events", "vendor_conversion_events", "geo_lgd_import_runs"]) assert(page.includes(source), `missing evidence source ${source}`);
for (const route of ["/api/cron/boost-expiry", "/api/cron/procurement-execution", "/api/system/marketplace-intelligence-refresh", "/api/system/vendor-intelligence-refresh"]) assert(page.includes(route), `missing job inventory ${route}`);
for (const gap of ["No canonical SLO registry", "distributed traces", "correlation IDs", "cursor queues", "incident timeline", "restore-test date", "recovery point objective", "canonical run ledger"]) assert(page.includes(gap), `missing honest coverage gap ${gap}`);
assert(page.includes("does not execute jobs") && page.includes("No recovery action"), "non-operating boundary missing");
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "reliability center must remain read-only");
assert(page.includes('gridTemplateColumns: "repeat(auto-fit,minmax('), "responsive layout missing");
assert(command.includes('href: "/admin/reliability"') && command.includes('capability: "admin:operations"'), "command-center policy integration missing");

console.log("ADMIN-14 observability, scale and reliability assertions passed.");
