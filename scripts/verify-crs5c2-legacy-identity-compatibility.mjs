import fs from "node:fs";

const canonical = fs.readFileSync(
  "lib/identity/resolveCanonicalIdentity.ts",
  "utf8"
);

const postLogin = fs.readFileSync(
  "app/auth/post-login/PostLoginPageClient.tsx",
  "utf8"
);

const dashboard = fs.readFileSync(
  "app/dashboard/page.tsx",
  "utf8"
);

for (const marker of [
  "CRS-5C2 LEGACY COMPATIBILITY BRIDGE",
  "hasCanonicalIdentity",
  "compatibilityDefaultPath",
  "getDefaultPostLoginPath(access)",
  "projectedNavigationModules",
  "access.vendorCapabilities",
]) {
  if (!canonical.includes(marker)) {
    throw new Error(
      `CRS-5C2 compatibility marker missing: ${marker}`
    );
  }
}

if (
  postLogin.includes("getDefaultPostLoginPath(") ||
  dashboard.includes("getDefaultPostLoginPath(")
) {
  throw new Error(
    "Compatibility routing leaked back into post-login or dashboard."
  );
}

if (
  postLogin.includes("dashboardDestinationForRole") ||
  dashboard.includes("dashboardDestinationForRole")
) {
  throw new Error(
    "Role dashboard decision engine was reintroduced."
  );
}

console.log(
  "CRS-5C2 legacy identity compatibility assertions passed."
);
