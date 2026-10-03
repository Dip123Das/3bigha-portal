import fs from "node:fs";

const page = fs.readFileSync("app/admin/revenue-control/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-10 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const authority of ["COMMERCIAL_PRODUCTS", "razorpayReady", "commercial_orders", "commercial_entitlements", "subscription_payment_requests"]) assert(page.includes(authority), `${authority} is composed`);
assert(page.includes('o.gateway_mode === "live"') && page.includes("o.paid_at") && page.includes("o.gateway_payment_id"), "live captured receipts require provider evidence");
assert(/Pending requests and\s+complimentary grants are excluded/.test(page), "unpaid and complimentary rows are not receipts");
assert(page.includes("not confirmed bank settlements") && page.includes("tax-exclusive revenue"), "capture is not falsely reported as settlement or tax-exclusive revenue");
assert(page.includes("Refunds are initiated") && page.includes("AdminRazorpayReconcileForm"), "refund and reconciliation operations are visible");
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "revenue center itself remains read-only");
assert(commandCenter.includes("/admin/revenue-control"), "command center navigation is integrated");

console.log("ADMIN-10 billing, subscription and revenue architecture assertions passed.");
