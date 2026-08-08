import fs from "node:fs";

const authButtons = fs.readFileSync(
  "app/_components/AuthButtons.tsx",
  "utf8"
);

const businessRegistration = fs.readFileSync(
  "app/onboarding/business/BusinessOnboardingPageClient.tsx",
  "utf8"
);

const topHeader = fs.readFileSync(
  "components/layout/TopHeaderClient.tsx",
  "utf8"
);

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) {
    throw new Error(
      `${label} marker missing: ${marker}`
    );
  }
}

for (const marker of [
  "resolveCanonicalIdentity",
  "canonicalIdentity.workspaceProjection.defaultPath",
  "AUTH_BUTTONS_CANONICAL_IDENTITY_FALLBACK",
]) {
  requireMarker(
    authButtons,
    marker,
    "AuthButtons"
  );
}

for (const forbidden of [
  "function dashboardHrefFor(",
  "isMasterAdminEmail(",
  'return "/dashboard/vendor"',
  'return "/dashboard/buyer"',
  'return "/dashboard/banker"',
  'return "/dashboard/investor"',
]) {
  if (authButtons.includes(forbidden)) {
    throw new Error(
      `AuthButtons parallel route authority remains: ${forbidden}`
    );
  }
}

requireMarker(
  businessRegistration,
  'sp.get("returnTo") || "/dashboard/workspace"',
  "Business Registration"
);

if (
  businessRegistration.includes(
    'sp.get("returnTo") || "/dashboard/vendor"'
  )
) {
  throw new Error(
    "Business Registration still defaults to vendor dashboard."
  );
}

if (
  businessRegistration.includes(
    'rawReturnTo === "/dashboard" ? "/dashboard/vendor"'
  )
) {
  throw new Error(
    "Business Registration still rewrites dashboard to vendor dashboard."
  );
}

for (const marker of [
  "resolveCanonicalIdentity",
  "identity.workspaceProjection.defaultPath",
]) {
  requireMarker(
    topHeader,
    marker,
    "TopHeader"
  );
}

console.log(
  "CRS-6B2 entry/navigation authority assertions passed."
);
