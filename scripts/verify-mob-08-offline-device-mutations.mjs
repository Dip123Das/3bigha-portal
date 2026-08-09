import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const queue = read("apps/mobile/src/features/notifications/offlineQueue.ts");
const card = read("apps/mobile/src/features/notifications/NotificationDeviceCard.tsx");
const api = read("apps/mobile/src/features/notifications/api.ts");

assert.match(queue, /expo-secure-store/);
assert.match(queue, /const LIMIT = 8/);
assert.match(queue, /session\.user\.id/);
assert.match(queue, /queueDeviceEnable/);
assert.match(queue, /queueDeviceDisable/);
assert.match(queue, /flushDeviceQueue/);
assert.doesNotMatch(queue, /access_token|refresh_token|service_role|SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(queue + card, /onboarding|declare_identity|save_business|upload_evidence|approve|billing|inventory|rfq/i);
assert.match(card, /NetInfo\.addEventListener/);
assert.match(card, /Waiting for internet/);
assert.match(api, /response\.status >= 500 \|\| response\.status === 429/);

console.log("MOB-08 offline-safe device mutation assertions passed.");
