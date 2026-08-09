import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const gateway = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");
const api = read("apps/mobile/src/features/dashboard/api.ts");
const auth = read("apps/mobile/src/features/auth/AuthGatewayScreen.tsx");

for (const key of ["admin_home", "blog_admin_home", "banker_home", "investor_home", "vendor_home", "publisher_home", "buyer_home"]) assert.match(gateway, new RegExp(key));
assert.match(gateway, /registration\.requiredAction !== "none"/);
assert.match(gateway, /data\.capabilities\.groups/);
assert.match(gateway, /data\.navigation\.unifiedWorkspacePath/);
assert.match(gateway, /Only capabilities returned by the canonical server are shown/);
assert.doesNotMatch(gateway, /(?:role|approvalStatus|grant|entitlement)\s*:/i);
assert.doesNotMatch(api, /method:\s*["']POST["']/i, "MOB-05 dashboard contract must remain read-only");
assert.match(api, /\/api\/v1\/mobile\/bootstrap/);
assert.match(api, /Authorization: `Bearer \$\{session\.access_token\}`/);
assert.match(auth, /DashboardGateway/);

console.log("MOB-05 native role dashboard assertions passed.");
