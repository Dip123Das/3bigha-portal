import fs from "node:fs";

const canonical = fs.readFileSync(
  "lib/identity/resolveCanonicalIdentity.ts",
  "utf8"
);

const loader = fs.readFileSync(
  "lib/identity/loadIdentityProjections.ts",
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

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) {
    throw new Error(`${label} marker missing: ${marker}`);
  }
}

for (const marker of [
  "dashboardPaths",
  "unifiedWorkspacePaths",
]) {
  requireMarker(loader, marker, "Projection loader");
}

for (const marker of [
  "loadIdentityProjectionSet",
  "canonicalDefaultPath",
  "canonicalUnifiedPath",
  "identityProjection.navigationModules",
  "buildProjectedNavigation",
]) {
  requireMarker(canonical, marker, "Canonical Identity");
}

for (const forbidden of [
  "function resolveDefaultWorkspacePath(",
  "function buildNavigation(",
]) {
  if (canonical.includes(forbidden)) {
    throw new Error(
      `Old Canonical Identity route/navigation engine remains: ${forbidden}`
    );
  }
}

for (const marker of [
  "resolveCanonicalIdentity",
  "canonicalIdentity.workspaceProjection.defaultPath",
]) {
  requireMarker(postLogin, marker, "Post-login");
  requireMarker(dashboard, marker, "Dashboard");
}

for (const forbidden of [
  "getDefaultPostLoginPath(",
  "dashboardDestinationForRole(",
]) {
  if (
    postLogin.includes(forbidden) ||
    dashboard.includes(forbidden)
  ) {
    throw new Error(
      `Hard-coded dashboard resolver remains: ${forbidden}`
    );
  }
}

if (postLogin.includes('next || "/dashboard/vendor"')) {
  throw new Error(
    "Legacy vendor dashboard return path remains in post-login."
  );
}

console.log(
  "CRS-5C master-driven dashboard/navigation projection assertions passed."
);
