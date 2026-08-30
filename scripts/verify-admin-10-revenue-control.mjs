import fs from "node:fs";

const page = fs.readFileSync("app/admin/revenue-control/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-10 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const authority of ["SUBSCRIPTION_PLANS", "SBI_INTEGRATION_READY", "subscription_payment_requests", "business_profiles", "admin_cash_subscription_audit"]) assert(page.includes(authority), `${authority} is composed`);
assert(page.includes('row.status === "paid" && row.gateway_transaction_id && row.paid_at'), "settled revenue requires paid status and gateway evidence");
assert(page.includes("Not counted as revenue") && page.includes("excluded from settled SBI revenue"), "pending and legacy rows are excluded from revenue");
assert(page.includes("complimentary access") && page.includes("not counted as settled revenue"), "complimentary entitlements remain separate");
for (const gap of ["GST tax invoices", "refund ledger", "coupon authority", "payment reconciliation workbench", "durable entitlement ledger", "paid boost settlement"]) assert(page.includes(gap), `${gap} gap is disclosed`);
assert(page.includes("Razorpay has no active canonical adapter"), "provider coverage is honest");
assert(page.includes("Vendor billing invoices") && page.includes("not platform subscription revenue"), "ERP billing is not conflated with platform revenue");
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "revenue center remains read-only");
assert(page.includes("repeat(auto-fit,minmax("), "responsive layout is required");
assert(commandCenter.includes("/admin/revenue-control"), "command center navigation is integrated");

console.log("ADMIN-10 billing, subscription and revenue architecture assertions passed.");
