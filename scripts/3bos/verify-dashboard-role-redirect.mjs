import fs from "node:fs";

const access = fs.readFileSync("lib/access/resolveAccess.ts", "utf8");
const identity = fs.readFileSync("lib/identity/resolveCanonicalIdentity.ts", "utf8");
const authButtons = fs.readFileSync("app/_components/AuthButtons.tsx", "utf8");
const dashboard = fs.readFileSync("app/dashboard/page.tsx", "utf8");

const checks = [
  ["vendor dashboard primary", access.includes('return "/dashboard/vendor";')],
  ["buyer dashboard primary", access.includes('return "/dashboard/buyer";')],
  ["banker dashboard primary", access.includes('return "/dashboard/banker";')],
  ["investor dashboard primary", access.includes('return "/dashboard/investor";')],
  ["workspace remains separately projected", identity.includes("unifiedPath: canonicalUnifiedPath")],
  ["canonical default delegates to role resolver", identity.includes("defaultPath: compatibilityDefaultPath")],
  ["header uses canonical default path", authButtons.includes("canonicalIdentity.workspaceProjection.defaultPath")],
  ["dashboard resolver uses canonical default path", dashboard.includes("canonicalIdentity.workspaceProjection.defaultPath")],
];

let failed = false;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error("FAIL:", label);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("PASS: primary role dashboard routing restored; Unified Workspace remains secondary.");
