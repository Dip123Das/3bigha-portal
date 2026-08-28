import fs from "node:fs";

const page = fs.readFileSync("app/admin/support-operations/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-12 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const authority of ["support_tickets", "support_ticket_messages", "admin_account_action_audit", "listing_moderation_events", "subscription_payment_requests"]) assert(page.includes(authority), `${authority} is composed`);
assert(page.includes("sla_deadline") && page.includes("escalation_level") && page.includes("assigned_to"), "SLA, escalation and ownership are visible");
assert(page.includes("AI advisory signal") && page.includes("Human administrators retain final"), "human authority over AI is explicit");
assert(page.includes("No reply or ticket mutation is available"), "outbound and mutation controls are absent");
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "support center remains read-only");
for (const gap of ["consented chat review", "assignment audit", "status-transition audit", "reopening history", "appeal deadlines", "dual approval", "outcome notifications audit"]) assert(page.includes(gap), `${gap} gap is disclosed`);
for (const lifecycle of ["moderation appeal", "suspension appeal", "payment dispute", "refund case", "abuse-report lifecycle"]) assert(page.includes(lifecycle), `${lifecycle} gap is disclosed`);
for (const route of ["/admin/dashboard/support", "/admin/users", "/admin/moderation", "/admin/revenue-control"]) assert(page.includes(route), `${route} canonical workflow is preserved`);
assert(page.includes("repeat(auto-fit,minmax("), "responsive layout is required");
assert(commandCenter.includes("/admin/support-operations"), "command center navigation is integrated");

console.log("ADMIN-12 support, complaints and appeals architecture assertions passed.");
