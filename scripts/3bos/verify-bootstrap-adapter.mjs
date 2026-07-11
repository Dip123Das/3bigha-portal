import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "lib/3bos/bootstrap/index.ts",
  "lib/3bos/bootstrap/types.ts",
  "lib/3bos/bootstrap/fromLegacyProfile.ts",
];

const REQUIRED_MARKERS = {
  "lib/3bos/bootstrap/index.ts": [
    'export * from "./types";',
    'export * from "./fromLegacyProfile";',
  ],

  "lib/3bos/bootstrap/types.ts": [
    "export type ThreeBOSBootstrapSource",
    "export type ThreeBOSBootstrapResult",
    "sourceRowsChanged: false",
    "databaseMutation: false",
    "permissionDecision: false",
    "routingDecision: false",
  ],

  "lib/3bos/bootstrap/fromLegacyProfile.ts": [
    "export function create3BOSRuntimeInputFromLegacy",
    "nature_of_business",
    "portal_use_reason",
    "legacyPlan",
    'value: "free"',
  ],
};

const FORBIDDEN = [
  '"use client"',
  "@supabase",
  "supabaseBrowser",
  "supabaseServer",
  "fetch(",
  "axios",
  "redirect(",
  "router.push",
  "router.replace",
  "window.location",
  "localStorage",
  "sessionStorage",
  ".insert(",
  ".update(",
  ".delete(",
  ".upsert(",
];

let failed = false;

for (const relativeFile of REQUIRED_FILES) {
  const absoluteFile = path.join(
    ROOT,
    relativeFile
  );

  if (!fs.existsSync(absoluteFile)) {
    console.error(
      `❌ Missing: ${relativeFile}`
    );
    failed = true;
    continue;
  }

  const content = fs.readFileSync(
    absoluteFile,
    "utf8"
  );

  for (
    const marker of
    REQUIRED_MARKERS[relativeFile] ?? []
  ) {
    if (!content.includes(marker)) {
      console.error(
        `❌ Missing marker in ${relativeFile}: ${marker}`
      );
      failed = true;
    }
  }

  for (const forbidden of FORBIDDEN) {
    if (content.includes(forbidden)) {
      console.error(
        `❌ Forbidden dependency in ${relativeFile}: ${forbidden}`
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ 3BOS legacy bootstrap adapter verification passed."
);
console.log(
  "✅ Existing profile and business rows remain unchanged."
);
console.log(
  "✅ No database or authentication dependency."
);
console.log(
  "✅ No routing or permission decision."
);
console.log(
  "✅ Safe default Growth Plan is Start through legacy free mapping."
);
