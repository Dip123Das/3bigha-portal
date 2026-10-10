import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const server = read("lib/mobile/server/onboarding.ts");
const route = read("app/api/v1/mobile/onboarding/route.ts");
const screen = read("apps/mobile/src/features/onboarding/OnboardingScreen.tsx");
const bootstrap = read("lib/mobile/server/bootstrap.ts");
const config = read("apps/mobile/app.json");

assert.match(server, /from\("identity_master"\)/, "identity catalogue must remain canonical");
assert.match(server, /declare_operating_profile/);
assert.match(server, /sync_member_module_grants/);
assert.match(server, /evaluate_automated_registration_verification/);
assert.match(server, /resolveLocation/);
assert.match(server, /PROTECTED_KEYS/);
assert.match(server, /LIVE_CAMERA_REQUIRED/);
assert.match(route, /authenticateMobileRequest/);
assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE/i, "mobile adapter must not use service-role authority");
assert.match(screen, /CameraView/);
assert.match(screen, /expo-location/);
assert.match(screen, /expo-document-picker/);
assert.doesNotMatch(screen, /approvalStatus\s*:|verificationStatus\s*:|role\s*:/, "native client must not submit protected decisions");
assert.match(bootstrap, /Number\(profile\.onboarding_version \|\| 0\) >= 2/);
assert.match(config, /live selfie and work or workplace evidence/);
assert.match(config, /live operating location/);

{
  const responsiveOnboardingSource = read("apps/mobile/src/features/onboarding/OnboardingScreen.tsx");

  assert.ok(
    !responsiveOnboardingSource.includes("maxHeight: 220"),
    "Native onboarding option groups must expand naturally without a fixed maximum height.",
  );
  assert.ok(
    responsiveOnboardingSource.includes('alignItems: "flex-start"') &&
      responsiveOnboardingSource.includes('maxWidth: "100%"') &&
      responsiveOnboardingSource.includes("flexShrink: 1"),
    "Native onboarding choices must wrap within the available device width.",
  );
}


assert.match(
  server,
  /from\("profiles"\)\.select\("[^"]*approval_status[^"]*"\)/,
  "Mobile onboarding approval must come from the canonical profiles record.",
);
assert.doesNotMatch(
  server,
  /from\("business_profiles"\)\.select\("[^"]*approval_status[^"]*"\)/,
  "Mobile onboarding must not query nonexistent business_profiles.approval_status.",
);
assert.match(
  server,
  /approvalStatus:\s*clean\(\(profile as any\)\?\.approval_status \|\| "pending"\)/,
  "Mobile onboarding must project approval from the canonical profile.",
);
console.log("MOB-04 native identity and onboarding assertions passed.");
