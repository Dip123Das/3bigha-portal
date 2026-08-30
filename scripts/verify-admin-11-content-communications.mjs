import fs from "node:fs";

const page = fs.readFileSync("app/admin/content-communications/page.tsx", "utf8");
const commandCenter = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN-11 verification failed: ${message}`);
};

assert(page.includes("requireMasterAdmin"), "canonical admin authority is required");
for (const authority of ["blog_posts", "notifications", "vendor_notifications", "registration_operations_notifications", "user_push_tokens", "vendor_whatsapp_preferences"]) assert(page.includes(authority), `${authority} is composed`);
for (const route of ["/admin/blog", "/admin/dashboard/seo", "/admin/verification-notifications"]) assert(page.includes(route), `${route} workflow is preserved`);
assert(!/\.(insert|update|delete|upsert|rpc)\(/.test(page), "command center remains read-only");
assert(page.includes("No message will be sent from this center"), "outbound communication is forbidden");
assert(page.includes("browser localStorage") && page.includes("not a durable central audit authority"), "workspace notification limitation is explicit");
assert(page.includes("WhatsApp Cloud API") && page.includes("Gupshup") && page.includes("separate operational send paths"), "fragmented WhatsApp coverage is disclosed");
for (const gap of ["advertising inventory", "audience segments", "content calendar", "email delivery", "SMS delivery", "consent registry", "delivery audit", "rollback"]) assert(page.includes(gap), `${gap} gap is disclosed`);
assert(page.includes("repeat(auto-fit,minmax("), "responsive layout is required");
assert(commandCenter.includes("/admin/content-communications"), "command center navigation is integrated");

console.log("ADMIN-11 content and communication architecture assertions passed.");
