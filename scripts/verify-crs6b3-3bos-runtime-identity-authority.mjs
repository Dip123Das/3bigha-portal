import fs from "node:fs";

const bootstrap = fs.readFileSync(
  "app/_components/ThreeBOSAuthenticatedBootstrap.tsx",
  "utf8"
);

function requireMarker(marker) {
  if (!bootstrap.includes(marker)) {
    throw new Error(
      `CRS-6B3 marker missing: ${marker}`
    );
  }
}

for (const marker of [
  "loadMemberCanonicalIdentityKeys",
  "canonicalIdentityKeys",
  "hasCanonicalIdentityAuthority",
  "authorisedActiveIdentityKey",
  "authorisedEntitlementIdentityKey",
  "canonicalFallbackIdentityKey",
  "THREE_BOS_CANONICAL_IDENTITY_BOOTSTRAP_FAILED",
]) {
  requireMarker(marker);
}

if (
  bootstrap.includes(
    "activeWorkContext?.identityKey ?? canonicalPrimaryIdentityKey"
  )
) {
  throw new Error(
    "3BOS still allows unvalidated Active Work Context to override canonical authority."
  );
}

if (
  !bootstrap.includes(
    "canonicalIdentityKeys.includes("
  )
) {
  throw new Error(
    "3BOS does not validate runtime identity against canonical identities."
  );
}

/*
 * Legacy module grants and subscription observations are
 * intentionally retained for compatibility/commercial runtime.
 */
requireMarker('from("vendor_module_grants")');
requireMarker("create3BOSRuntimeInputFromLegacy");

console.log(
  "CRS-6B3 Unified 3BOS runtime identity authority assertions passed."
);
