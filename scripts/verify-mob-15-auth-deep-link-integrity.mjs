import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = JSON.parse(read("apps/mobile/app.json")).expo;
const callback = read("apps/mobile/src/lib/auth/callback.ts");
const provider = read("apps/mobile/src/features/auth/AuthProvider.tsx");
const gateway = read("apps/mobile/src/features/auth/AuthGatewayScreen.tsx");
const assert = (condition, message) => { if (!condition) throw new Error(`MOB-15 assertion failed: ${message}`); };

assert(/^MOB-(?:1[5-9]|[2-9][0-9])$/.test(app.extra?.mobSprint || ""), "resolved milestone marker predates MOB-15");
assert(callback.includes('Linking.createURL("auth/callback")'), "canonical installed-app callback URL is absent");
assert(callback.includes("candidate.protocol !== expected.protocol") && callback.includes("candidate.host !== expected.host") && callback.includes("candidate.pathname !== expected.pathname"), "scheme, host and route are not validated exactly");
assert(callback.includes("candidate.username") && callback.includes("candidate.password") && callback.includes("candidate.hash"), "credential or fragment injection is not rejected");
assert(callback.includes("keys.length !== 1") && callback.includes('keys[0] !== "code"') && callback.includes("MAX_AUTHORIZATION_CODE_LENGTH"), "callback parameter shape is not bounded");
assert(callback.includes("callbackConsumed = true") && callback.includes("resetNativeAuthCallbackGate"), "one-time consumption and deliberate reset are incomplete");
assert(provider.includes("consumeNativeAuthCallback(url)") && gateway.includes("consumeNativeAuthCallback(result.url)"), "cold, live and browser callbacks do not share the trust boundary");
assert(gateway.includes("nativeAuthCallbackUrl()") && (gateway.match(/resetNativeAuthCallbackGate\(\)/g) || []).length >= 2, "sign-in initiators do not share and reset the canonical callback gate");
for (const source of [callback, provider, gateway]) {
  assert(!source.includes("console.") && !source.includes("AsyncStorage"), "callback material may be logged or persisted");
}

console.log("MOB-15 native authentication deep-link integrity assertions passed.");
