import fs from "node:fs";

const page = fs.readFileSync("app/admin/platform-governance/page.tsx", "utf8");
const command = fs.readFileSync("lib/admin/command-center.ts", "utf8");
const required = (text, value, label) => { if (!text.includes(value)) throw new Error(`Missing ${label}: ${value}`); };

required(page, "requireMasterAdmin", "master-admin boundary");
required(page, 'dynamic = "force-dynamic"', "dynamic private route");
for (const authority of ["identity_master", "bos_operating_capabilities", "registration_redirect_rules", "measurement_units", "geo_states", "geo_districts"]) required(page, authority, "canonical authority");
for (const registry of ["THREE_BOS_AI_AGENTS", "CAPABILITY_REGISTRY", "HUMAN_IDENTITY_REGISTRY", "WORKSPACE_REGISTRY", "BTCE_DEFAULT_DOMAIN_WEIGHTS", "MEDIA_BUCKET_BY_MODULE"]) required(page, registry, "registry projection");
for (const gap of ["feature flags", "versioned platform settings", "approval workflow", "rollback", "environment drift reporting", "API and webhook registry", "unified configuration audit"]) required(page, gap, "honest coverage gap");
required(page, "Secret values are never displayed", "secret disclosure boundary");
required(page, "Boolean(process.env", "presence-only integration check");
if (/value:\s*process\.env|JSON\.stringify\(process\.env/.test(page)) throw new Error("Environment values must not be rendered");
if (/\.\s*(insert|update|delete|upsert|rpc)\s*\(/.test(page)) throw new Error("ADMIN-13 must remain read-only");
required(page, 'gridTemplateColumns: "repeat(auto-fit,minmax(', "responsive layout");
required(command, 'href: "/admin/platform-governance"', "command-center navigation");

console.log("ADMIN-13 platform governance assertions passed");
