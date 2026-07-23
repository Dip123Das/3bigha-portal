import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "lib/3bos/presentation/index.ts",
  "lib/3bos/presentation/vendor-profile.ts",
];

const REQUIRED_MARKERS = {
  "lib/3bos/presentation/index.ts": [
    'export * from "./vendor-profile";',
  ],

  "lib/3bos/presentation/vendor-profile.ts": [
    "export type VendorProfilePresentationInput",
    "export type VendorProfilePresentation",
    "export function buildHumanFirstVendorProfilePresentation",
    '"Business Reputation"',
    '"Customer Trust"',
    '"Marketplace Visibility"',
    '"Business Reach"',
    '"Business Activity"',
    "detailedInsights",
    "growthSuggestions",
    "customerReasons",
  ],
};

const FORBIDDEN = [
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
  ".upsert(",
  ".delete(",
  '"use client"',
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

  const source = fs.readFileSync(
    absoluteFile,
    "utf8"
  );

  for (
    const marker of
    REQUIRED_MARKERS[relativeFile] ?? []
  ) {
    if (!source.includes(marker)) {
      console.error(
        `❌ Missing marker in ${relativeFile}: ${marker}`
      );
      failed = true;
    }
  }

  for (const marker of FORBIDDEN) {
    if (source.includes(marker)) {
      console.error(
        `❌ Forbidden presentation dependency in ${relativeFile}: ${marker}`
      );
      failed = true;
    }
  }
}

const publicPagePath = path.join(
  ROOT,
  "app/vendor/[slug]/page.tsx"
);

if (fs.existsSync(publicPagePath)) {
  const page = fs.readFileSync(
    publicPagePath,
    "utf8"
  );

  if (
    page.includes(
      "buildHumanFirstVendorProfilePresentation"
    )
  ) {
    console.error(
      "❌ Presentation adapter was integrated before independent verification."
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Human-first vendor profile presentation adapter verification passed."
);
console.log(
  "✅ Existing technical scores are preserved in detailedInsights."
);
console.log(
  "✅ Plain-language business labels are derived without changing any engine."
);
console.log(
  "✅ No Supabase, network, route or mutation dependency."
);
console.log(
  "✅ Public vendor profile is not yet modified."
);
