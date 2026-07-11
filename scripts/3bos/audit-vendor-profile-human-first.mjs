import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PAGE_PATH = path.join(
  ROOT,
  "app/vendor/[slug]/page.tsx"
);

const REPORT_PATH = path.join(
  ROOT,
  "reports/3bos/vendor-profile-human-first-audit.md"
);

if (!fs.existsSync(PAGE_PATH)) {
  console.error(
    "❌ Missing app/vendor/[slug]/page.tsx"
  );
  process.exit(1);
}

const source = fs.readFileSync(
  PAGE_PATH,
  "utf8"
);

const visibleTerms = [
  {
    current: "Explore AI Recommended Vendors",
    replacement: "Find Similar Businesses Nearby",
    category: "Visible AI terminology",
  },
  {
    current: "Vendor Authority Score",
    replacement: "Business Reputation",
    category: "Technical score terminology",
  },
  {
    current: "AI Vendor Trust",
    replacement: "Customer Trust",
    category: "Visible AI terminology",
  },
  {
    current: "AI Recommendation Intelligence",
    replacement: "Marketplace Visibility",
    category: "Visible AI terminology",
  },
  {
    current: "Recommendation Score",
    replacement: "How Easily Customers Can Find This Business",
    category: "Technical score terminology",
  },
  {
    current: "AI Marketplace Rank",
    replacement: "Business Reach",
    category: "Visible AI terminology",
  },
  {
    current: "Leaderboard Score",
    replacement: "Marketplace Presence",
    category: "Technical score terminology",
  },
  {
    current: "Reputation Intelligence",
    replacement: "Business Activity",
    category: "Visible technical terminology",
  },
  {
    current: "AI Reputation Score",
    replacement: "Business Reputation",
    category: "Visible AI terminology",
  },
  {
    current: "Trust Intelligence",
    replacement: "Why Customers Can Trust This Business",
    category: "Visible technical terminology",
  },
  {
    current: "Marketplace Trust Score",
    replacement: "Customer Trust",
    category: "Technical score terminology",
  },
  {
    current: "authority points",
    replacement: "trust contribution",
    category: "Technical score terminology",
  },
  {
    current: "Recommended Vendor Clusters",
    replacement: "Similar Businesses Nearby",
    category: "Technical grouping terminology",
  },
  {
    current: "AI-generated supplier clusters",
    replacement: "Related businesses based on location and work",
    category: "Visible AI terminology",
  },
  {
    current: "Related Marketplace Intelligence",
    replacement: "Nearby Products and Services",
    category: "Visible technical terminology",
  },
  {
    current: "Related Vendor Intelligence",
    replacement: "Other Businesses You May Need",
    category: "Visible technical terminology",
  },
];

const preservedEngines = [
  "buildVendorTrustSignals",
  "buildRelatedVendorEntities",
  "getVendorAuthorityDataBySlug",
  "getVendorReputationData",
  "calculateVendorLeaderboardScore",
  "calculateVendorRecommendationScore",
  "buildVendorRecommendationClusters",
  "getVendorRecommendationCandidates",
  "buildVendorInternalLinks",
  "buildVendorAuthorityGraph",
  "getVendorAuthoritySummary",
  "buildVendorAuthorityJsonLd",
  "buildVendorTrustReputation",
];

const findings = visibleTerms.map((item) => ({
  ...item,
  present: source.includes(item.current),
}));

const missingEngines = preservedEngines.filter(
  (engine) => !source.includes(engine)
);

const report = `# PROJECT NEEV — Phase 5.5A

## Human-First Vendor Profile Audit

Generated: ${new Date().toISOString()}

Source:

\`app/vendor/[slug]/page.tsx\`

## Audit result

- Visible presentation terms reviewed: ${findings.length}
- Present in current page: ${
  findings.filter((item) => item.present).length
}
- Existing intelligence engines detected: ${
  preservedEngines.length - missingEngines.length
}/${preservedEngines.length}
- Database mutation introduced: No
- Route changed: No
- URL changed: No
- Query changed: No
- Metadata changed: No
- JSON-LD changed: No

## Presentation migration map

| Status | Current visible term | Human-first replacement | Category |
|---|---|---|---|
${findings
  .map(
    (item) =>
      `| ${item.present ? "Found" : "Not found"} | ${item.current} | ${item.replacement} | ${item.category} |`
  )
  .join("\n")}

## Intelligence that must remain underneath

${preservedEngines
  .map(
    (engine) =>
      `- ${engine}${
        source.includes(engine)
          ? " — present"
          : " — not detected"
      }`
  )
  .join("\n")}

## Human-first presentation order

1. Business name and plain-language summary
2. What this business provides
3. Areas served
4. Why customers can trust this business
5. Business reputation
6. Marketplace visibility
7. Nearby products and services
8. Similar businesses nearby
9. Detailed business insights in a collapsed section

## Non-negotiable compatibility rules

- Keep \`/vendor/[slug]\`
- Keep metadata generation
- Keep JSON-LD
- Keep all scoring engines
- Keep all internal links
- Keep recommendation clusters
- Keep all existing data sources
- Change presentation only
`;

fs.mkdirSync(
  path.dirname(REPORT_PATH),
  { recursive: true }
);

fs.writeFileSync(
  REPORT_PATH,
  report,
  "utf8"
);

console.log(
  "✅ Human-first vendor profile audit completed."
);
console.log(
  `✅ Visible terms found: ${
    findings.filter((item) => item.present).length
  }/${findings.length}`
);
console.log(
  `✅ Intelligence engines preserved: ${
    preservedEngines.length - missingEngines.length
  }/${preservedEngines.length}`
);
console.log(
  "✅ No source file, route, query or runtime behavior changed."
);
console.log(
  "Report: reports/3bos/vendor-profile-human-first-audit.md"
);

if (missingEngines.length > 0) {
  console.log(
    "⚠ Engines not detected:",
    missingEngines.join(", ")
  );
}
