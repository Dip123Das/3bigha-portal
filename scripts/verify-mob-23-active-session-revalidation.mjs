import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync("apps/mobile/src/features/auth/AuthProvider.tsx", "utf8");
const config = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
const workflow = readFileSync(".github/workflows/mobile-foundation.yml", "utf8");

assert.equal(config.expo.extra.mobSprint, "MOB-23");
assert.match(auth, /ACTIVE_SESSION_REVALIDATION_INTERVAL_MS = 5 \* 60_000/);
assert.match(auth, /if \(!supabase \|\| !session\) return/);
assert.match(auth, /AppState\.currentState !== "active"/);
assert.match(auth, /validateForegroundSession\(\)\.finally/);
assert.match(auth, /foregroundValidation\.current/);
assert.match(auth, /if \(state === "active"\) armTimer\(\)/);
assert.match(auth, /else clearTimer\(\)/);
assert.match(workflow, /verify-mob-23-active-session-revalidation\.mjs/g);

console.log("MOB-23 active-session revalidation assertions passed.");
