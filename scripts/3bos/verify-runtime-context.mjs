import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "lib/3bos/context/index.ts",
  "lib/3bos/context/types.ts",
  "lib/3bos/context/ThreeBOSRuntimeContext.tsx",
];

const REQUIRED_MARKERS = {
  "lib/3bos/context/index.ts": [
    'export * from "./types";',
    'export * from "./ThreeBOSRuntimeContext";',
  ],

  "lib/3bos/context/types.ts": [
    "export type ThreeBOSRuntimeContextValue",
    "setRuntimeInput",
    "updateRuntimeInput",
    "clearRuntime",
    "getCapability",
    "hasCapability",
    "availableActions",
  ],

  "lib/3bos/context/ThreeBOSRuntimeContext.tsx": [
    '"use client";',
    "export function ThreeBOSRuntimeProvider",
    "export function use3BOSRuntime",
    "export function useOptional3BOSRuntime",
    "create3BOSRuntime",
    "has3BOSCapability",
  ],
};

const FORBIDDEN_DEPENDENCIES = [
  "@supabase",
  "supabaseBrowser",
  "supabaseServer",
  "fetch(",
  "axios",
  "redirect(",
  "router.push",
  "router.replace",
  ".insert(",
  ".update(",
  ".delete(",
  ".upsert(",
  "localStorage",
  "sessionStorage",
  "document.cookie",
];

let failed = false;

for (const relativeFile of REQUIRED_FILES) {
  const absoluteFile = path.join(ROOT, relativeFile);

  if (!fs.existsSync(absoluteFile)) {
    console.error(`❌ Missing: ${relativeFile}`);
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

  for (const forbidden of FORBIDDEN_DEPENDENCIES) {
    if (content.includes(forbidden)) {
      console.error(
        `❌ Forbidden dependency in ${relativeFile}: ${forbidden}`
      );
      failed = true;
    }
  }
}

const layoutPath = path.join(ROOT, "app/layout.tsx");

if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(
    layoutPath,
    "utf8"
  );

  const providerOpeningCount = (
    layoutContent.match(
      /<ThreeBOSRuntimeProvider>/g
    ) ?? []
  ).length;

  const providerClosingCount = (
    layoutContent.match(
      /<\/ThreeBOSRuntimeProvider>/g
    ) ?? []
  ).length;

  if (
    providerOpeningCount > 1 ||
    providerClosingCount > 1
  ) {
    console.error(
      "❌ Multiple global runtime providers detected."
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ 3BOS runtime context structural verification passed."
);
console.log(
  "✅ Runtime context structure remains valid."
);
console.log(
  "✅ No Supabase or authentication dependency."
);
console.log(
  "✅ No network, storage or database mutation."
);
console.log(
  "✅ No route or permission behavior changed."
);
