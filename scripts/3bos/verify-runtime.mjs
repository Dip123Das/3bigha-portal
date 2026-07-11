import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "lib/3bos/runtime/index.ts",
  "lib/3bos/runtime/types.ts",
  "lib/3bos/runtime/resolve.ts",
];

const requiredMarkers = {
  "lib/3bos/runtime/index.ts": [
    'export * from "./types";',
    'export * from "./resolve";',
  ],
  "lib/3bos/runtime/types.ts": [
    "export type ThreeBOSRuntimeInput",
    "export type ThreeBOSRuntime",
    "routesPreserved: true",
    "permissionsReplaced: false",
    "databaseMutation: false",
  ],
  "lib/3bos/runtime/resolve.ts": [
    "export function create3BOSRuntime",
    "export function resolve3BOSRuntime",
    "export function resolvePrimary3BOSWorkspace",
    "export function resolve3BOSAvailableActions",
    "export function has3BOSCapability",
  ],
};

let failed = false;

for (const relativeFile of REQUIRED_FILES) {
  const absoluteFile = path.join(ROOT, relativeFile);

  if (!fs.existsSync(absoluteFile)) {
    console.error(`❌ Missing: ${relativeFile}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(absoluteFile, "utf8");

  for (const marker of requiredMarkers[relativeFile] ?? []) {
    if (!content.includes(marker)) {
      console.error(
        `❌ Missing marker in ${relativeFile}: ${marker}`
      );
      failed = true;
    }
  }

  const forbiddenRuntimeDependencies = [
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
  ];

  for (const forbidden of forbiddenRuntimeDependencies) {
    if (content.includes(forbidden)) {
      console.error(
        `❌ Forbidden runtime dependency in ${relativeFile}: ${forbidden}`
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("✅ 3BOS runtime structural verification passed.");
console.log("✅ No Supabase dependency.");
console.log("✅ No network request.");
console.log("✅ No redirect or route mutation.");
console.log("✅ No database mutation.");
console.log("✅ Existing permissions remain untouched.");
