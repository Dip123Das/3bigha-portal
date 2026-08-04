import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resolverPath = path.join(
  root,
  "lib/identity/resolveCanonicalIdentity.ts"
);
const accessPath = path.join(root, "lib/access/resolveAccess.ts");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(
  fs.existsSync(resolverPath),
  "Canonical identity resolver is missing."
);
check(
  fs.existsSync(accessPath),
  "Existing access resolver is missing."
);

const resolver = fs.readFileSync(resolverPath, "utf8");

for (const marker of [
  "resolveCanonicalIdentity",
  "resolveAccessForUser",
  "verifiedHuman",
  "verifiedBusiness",
  "verifiedSelfie",
  "verifiedSelfieUrl",
  "businessConstitution",
  "businessIdentity",
  "individualIdentity",
  "verificationStatus",
  "approvalStatus",
  "completionStatus",
  "workspaceProjection",
  "marketplaceProjection",
  "navigationProjection",
  "permissionProjection",
]) {
  check(
    resolver.includes(marker),
    `Canonical identity marker missing: ${marker}`
  );
}

check(
  resolver.includes('path.includes("/live-selfie/")'),
  "Verified selfie must resolve only from live-selfie evidence."
);
check(
  !resolver.includes("gallery_upload"),
  "Canonical identity must never accept gallery profile photos."
);

console.log("BI-4 canonical identity foundation assertions passed.");
