import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read("app/api/v1/mobile/push-device/route.ts");
const device = read("apps/mobile/src/features/notifications/device.ts");
const card = read("apps/mobile/src/features/notifications/NotificationDeviceCard.tsx");
const sender = read("lib/mobile/sendMobilePush.ts");

assert.match(route, /authenticateMobileRequest/);
assert.match(route, /private, no-store/);
assert.match(route, /export async function (GET|PUT|DELETE)/);
assert.doesNotMatch(route, /body\.(userId|role)|service_role/);
assert.match(device, /requestPermissionsAsync/);
assert.match(device, /getExpoPushTokenAsync/);
assert.match(card, /Turn off on this device/);
assert.match(sender, /exp\.host\/--\/api\/v2\/push\/send/);
assert.doesNotMatch(device + card, /SUPABASE_SERVICE_ROLE_KEY|fcm_token/);

console.log("MOB-07 native push-device lifecycle assertions passed.");
