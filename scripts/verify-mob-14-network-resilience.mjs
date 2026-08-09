import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const request = read("apps/mobile/src/lib/api/request.ts");
const dashboard = read("apps/mobile/src/features/dashboard/api.ts");
const onboarding = read("apps/mobile/src/features/onboarding/api.ts");
const notifications = read("apps/mobile/src/features/notifications/api.ts");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-14 assertion failed: ${message}`); };

assert(/^MOB-(?:1[4-9]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-14");
assert(request.includes("AbortController") && request.includes("REQUEST_TIMEOUT_MS") && request.includes("clearTimeout(timeout)"), "requests are not bounded with cleanup");
assert(request.includes('cache: "no-store"') && request.includes('headers.set("Cache-Control", "no-store")'), "personal API responses may be cached");
assert(request.includes('headers.set("Authorization", `Bearer ${session.access_token}`)') && request.includes('headers.set("Accept", "application/json")'), "authenticated JSON request contract is incomplete");
assert(request.includes('"offline"') && request.includes('"timeout"') && request.includes('"service"') && request.includes('"response"'), "privacy-safe failure categories are incomplete");
assert(request.includes('if (!("data" in body))'), "canonical response envelope is not validated");
assert(!request.includes("console.") && !request.includes("SecureStore") && !request.includes("AsyncStorage"), "request diagnostics may expose or persist private data");
assert(!request.includes("while (") && !request.includes("for (") && !request.includes("retry("), "mutations may be replayed automatically");
for (const [name, source] of [["dashboard", dashboard], ["onboarding", onboarding], ["notifications", notifications]]) {
  assert(source.includes("mobileApiRequest"), `${name} bypasses the shared request boundary`);
  assert(!source.includes("fetch("), `${name} still performs an unbounded fetch`);
}

console.log("MOB-14 native network resilience assertions passed.");
