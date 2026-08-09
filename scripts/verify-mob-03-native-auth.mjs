import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const appConfig = read("apps/mobile/app.json");
const packageFile = read("apps/mobile/package.json");
const authClient = read("apps/mobile/src/lib/auth/supabase.ts");
const provider = read("apps/mobile/src/features/auth/AuthProvider.tsx");
const screen = read("apps/mobile/src/features/auth/AuthGatewayScreen.tsx");
const authenticatedApi = read("apps/mobile/src/features/onboarding/api.ts");
const requestBoundary = read("apps/mobile/src/lib/api/request.ts");

assert.match(appConfig, /"scheme": "threebigha"/);
assert.match(appConfig, /expo-secure-store/);
assert.match(packageFile, /"@supabase\/supabase-js"/);
assert.match(packageFile, /"expo-secure-store"/);
assert.match(packageFile, /"expo-web-browser"/);

assert.match(authClient, /SecureStore\.setItemAsync/);
assert.match(authClient, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
assert.match(authClient, /persistSession: true/);
assert.match(authClient, /flowType: "pkce"/);
assert.match(authClient, /detectSessionInUrl: false/);
assert.doesNotMatch(authClient, /SERVICE_ROLE/i);

assert.match(provider, /exchangeCodeForSession/);
assert.match(provider, /startAutoRefresh/);
assert.match(provider, /stopAutoRefresh/);
assert.match(provider, /AppState/);

assert.match(screen, /signInWithOtp/);
assert.match(screen, /verifyOtp/);
assert.match(screen, /signInWithOAuth/);
assert.match(screen, /provider: "google"/);
assert.match(authenticatedApi, /mobileApiRequest/);
assert.match(requestBoundary, /headers\.set\("Authorization", `Bearer \$\{session\.access_token\}`\)/);
assert.match(read("apps/mobile/src/features/onboarding/OnboardingScreen.tsx"), /signOut\(\{ scope: "local" \}\)/);
assert.doesNotMatch(screen, /console\.(log|debug|info).*token/i);

for (const source of [authClient, provider, screen]) {
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /(primaryRole|identityRole|userRole)\s*[:=]/i);
}

console.log("MOB-03 native authentication and session security assertions passed.");
