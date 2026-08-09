import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const provider = read("apps/mobile/src/features/notifications/NotificationResponseProvider.tsx");
const dashboard = read("apps/mobile/src/features/dashboard/DashboardGateway.tsx");
const layout = read("apps/mobile/app/_layout.tsx");

assert.match(provider, /addNotificationResponseReceivedListener/);
assert.match(provider, /getLastNotificationResponseAsync/);
assert.match(provider, /clearLastNotificationResponseAsync/);
assert.match(provider, /previousUserId/);
assert.match(provider, /safeNotificationWebPath/);
assert.match(provider, /path\.startsWith\("\/\/"\)/);
assert.match(provider, /data\.category === "silent_sync"/);
assert.doesNotMatch(provider, /conversationId.*webPath|rfqId.*webPath|service_role|SUPABASE_SERVICE_ROLE_KEY/);
assert.match(layout, /NotificationResponseProvider/);
assert.match(dashboard, /if \(notification\.action\) void refresh\(\)/);
assert.match(dashboard, /This alert has no safe action link/);
assert.doesNotMatch(provider, /grant|approve|declare.*identity/i);

console.log("MOB-09 native notification response routing assertions passed.");
