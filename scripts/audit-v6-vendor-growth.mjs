import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  page: path.join(root, "app/dashboard/vendor/page.tsx"),
  projection: path.join(
    root,
    "lib/3bos/vendor/resolve-vendor-workspace-projection.ts"
  ),
};

for (const [key, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`V-6 audit missing ${key}: ${filePath}`);
  }
}

const page = fs.readFileSync(files.page, "utf8");
const projection = fs.readFileSync(files.projection, "utf8");

const findings = [
  {
    area: "Canonical growth projection",
    present:
      projection.includes("growth:") &&
      projection.includes("plan: string") &&
      projection.includes("status: string") &&
      projection.includes("guidance: string"),
    decision: "KEEP",
    reason:
      "The projection already carries the truthful plan, status and human-first growth guidance.",
  },
  {
    area: "Extra Suggestions",
    present: page.includes("Extra Suggestions"),
    decision: "MERGE_AND_REMOVE",
    reason:
      "This is a second growth presentation and should be replaced by the canonical V-6 centre.",
  },
  {
    area: "Direct aiRecommendations rendering",
    present: page.includes("aiRecommendations.slice(0, 4)"),
    decision: "REMOVE_FROM_VISIBLE_DASHBOARD",
    reason:
      "Raw AI recommendations should not bypass the canonical projection-driven presentation.",
  },
  {
    area: "Growth plan navigation",
    present:
      projection.includes('href: "/dashboard/subscription"') ||
      page.includes('href="/dashboard/subscription"'),
    decision: "KEEP_AS_SUPPORTING_ACTION",
    reason:
      "Plan review remains available, but must not dominate the human-first growth centre.",
  },
  {
    area: "Marketplace opportunities",
    present:
      projection.includes('href: "/vendor-opportunities"') ||
      page.includes('href="/vendor-opportunities"'),
    decision: "KEEP_AS_SUPPORTING_ACTION",
    reason:
      "Marketplace demand is a genuine growth route already represented in canonical navigation.",
  },
];

console.log("\nV-6 Vendor Growth Audit\n");

for (const finding of findings) {
  console.log(
    `${finding.present ? "FOUND" : "NOT_FOUND"} | ` +
      `${finding.decision.padEnd(25)} | ${finding.area}`
  );
  console.log(`  ${finding.reason}`);
}

const required = findings.slice(0, 3);

if (required.some((finding) => !finding.present)) {
  throw new Error(
    "V-6 audit did not find the expected canonical or legacy growth structures."
  );
}

console.log("\nV-6 audit completed.");
console.log(
  "Decision: create one projection-driven Growth Centre and remove Extra Suggestions."
);
