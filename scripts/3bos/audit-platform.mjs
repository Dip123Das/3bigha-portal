import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "reports", "3bos");

const SCAN_ROOTS = [
  "app",
  "components",
  "lib",
  "hooks",
  "contexts",
  "middleware.ts",
  "scripts",
];

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".sql",
  ".css",
  ".md",
]);

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".turbo",
  "reports",
]);

const EXCLUDED_FILES = new Set([
  "scripts/3bos/audit-platform.mjs",
]);

const CATEGORIES = {
  identity: {
    label: "Human Identity",
    keywords: [
      "role",
      "roles",
      "profile.role",
      "master_admin",
      "admin",
      "vendor",
      "buyer",
      "seller",
      "provider",
      "author",
      "professional",
      "contractor",
      "builder",
      "supplier",
      "business_profile",
      "business_profiles",
    ],
    replacement:
      "Resolve Human Identity through the 3BOS identity registry while retaining existing role and profile fields as compatibility inputs.",
  },

  workspace: {
    label: "Workspace",
    keywords: [
      "workspace",
      "dashboard",
      "/dashboard",
      "vendor dashboard",
      "buyer dashboard",
      "admin dashboard",
      "writer dashboard",
      "sidebar",
      "navigation",
      "nav item",
    ],
    replacement:
      "Derive workspaces from resolved Human Identity and expose human-readable work destinations without changing existing routes.",
  },

  capability: {
    label: "Capability and Permission",
    keywords: [
      "permission",
      "permissions",
      "capability",
      "capabilities",
      "cancreate",
      "canedit",
      "candelete",
      "canpublish",
      "isadmin",
      "isvendor",
      "isbuyer",
      "authorized",
      "unauthorized",
      "forbidden",
      "access denied",
      "entitlement",
    ],
    replacement:
      "Resolve available actions through the 3BOS capability engine while preserving legacy authorization checks as fallbacks.",
  },

  growthPlan: {
    label: "Business Growth Plan",
    keywords: [
      "subscription",
      "subscriptions",
      "plan",
      "plans",
      "pricing",
      "upgrade",
      "premium",
      "free plan",
      "paid plan",
      "quota",
      "limit",
      "feature limit",
      "entitlement",
      "gold_vendor",
      "platinum_vendor",
    ],
    replacement:
      "Present Business Growth Plans through the growth-plan adapter while retaining legacy plan keys, tables and APIs.",
  },

  onboarding: {
    label: "Onboarding",
    keywords: [
      "onboarding",
      "registration",
      "register",
      "business profile",
      "profile completion",
      "completion_score",
      "is_complete",
      "missing_fields",
      "wizard",
      "save and continue",
    ],
    replacement:
      "Derive onboarding steps from identity, workspace and capability requirements while preserving current forms and database fields.",
  },

  moduleLanguage: {
    label: "Module-Oriented Architecture",
    keywords: [
      "module",
      "modules",
      "property module",
      "materials module",
      "services module",
      "rentals module",
      "blog module",
    ],
    replacement:
      "Treat existing modules as internal capability providers and present them to users as their work and available actions.",
  },

  aiLanguage: {
    label: "Visible AI Terminology",
    keywords: [
      "ai assistant",
      "ai-powered",
      "ai powered",
      "artificial intelligence",
      "ai tool",
      "ai tools",
      "ai score",
      "ai ranking",
      "ai boost",
      "ai verified",
    ],
    replacement:
      "Keep intelligence internal and present only the prepared business assistance, explanation and user-controlled action.",
  },
};

function normalizePath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function shouldIgnoreDirectory(name) {
  return EXCLUDED_DIRECTORIES.has(name);
}

function collectFiles(targetPath, result = []) {
  if (!fs.existsSync(targetPath)) return result;

  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    const relativeFile = normalizePath(targetPath);

    if (EXCLUDED_FILES.has(relativeFile)) {
      return result;
    }

    const extension = path.extname(targetPath).toLowerCase();

    if (
      ALLOWED_EXTENSIONS.has(extension) ||
      path.basename(targetPath) === "middleware.ts"
    ) {
      result.push(targetPath);
    }

    return result;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.isDirectory() && shouldIgnoreDirectory(entry.name)) {
      continue;
    }

    collectFiles(path.join(targetPath, entry.name), result);
  }

  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordRegex(keyword) {
  const escaped = escapeRegExp(keyword);

  if (/^[a-z0-9_]+$/i.test(keyword)) {
    return new RegExp(`\\b${escaped}\\b`, "i");
  }

  return new RegExp(escaped, "i");
}

function classifyLine(line) {
  const findings = [];

  for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
    const matchedKeywords = category.keywords.filter((keyword) =>
      keywordRegex(keyword).test(line)
    );

    if (matchedKeywords.length > 0) {
      findings.push({
        categoryKey,
        categoryLabel: category.label,
        matchedKeywords,
        replacement: category.replacement,
      });
    }
  }

  return findings;
}

function determineArea(file) {
  if (file === "middleware.ts") return "Middleware";
  if (file.startsWith("app/api/")) return "API";
  if (file.startsWith("app/admin/")) return "Administration";
  if (file.startsWith("app/dashboard/")) return "Dashboard";
  if (file.startsWith("app/onboarding/")) return "Onboarding";
  if (file.startsWith("app/")) return "Application Route";
  if (file.startsWith("components/")) return "Shared UI";
  if (file.startsWith("lib/3bos/")) return "3BOS Foundation";
  if (file.startsWith("lib/")) return "Business Logic";
  if (file.startsWith("hooks/")) return "Client Logic";
  if (file.startsWith("contexts/")) return "Application Context";
  if (file.startsWith("scripts/")) return "Operational Script";
  return "Other";
}

function determineRisk(file, line) {
  const lowerLine = line.toLowerCase();

  if (
    file === "middleware.ts" ||
    file.startsWith("app/api/") ||
    lowerLine.includes("service_role") ||
    lowerLine.includes("delete(") ||
    lowerLine.includes("update(") ||
    lowerLine.includes("insert(") ||
    lowerLine.includes("upsert(")
  ) {
    return "HIGH";
  }

  if (
    file.startsWith("app/admin/") ||
    file.startsWith("app/dashboard/") ||
    lowerLine.includes("redirect(") ||
    lowerLine.includes("router.push") ||
    lowerLine.includes("router.replace") ||
    lowerLine.includes("permission") ||
    lowerLine.includes("role")
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function determineStrategy(categoryKey, file) {
  const strategies = {
    identity:
      "Wrap the current role/profile source with the Human Identity resolver. Keep legacy values unchanged.",
    workspace:
      "Map the current route or dashboard to a registered workspace. Preserve the URL and page component.",
    capability:
      "Add capability resolution before gradually replacing duplicated checks. Keep the existing check as fallback.",
    growthPlan:
      "Use the Growth Plan presentation/runtime adapter. Preserve legacy plan keys and persistence.",
    onboarding:
      "Add derived onboarding requirements around the current workflow. Do not replace existing profile completion logic.",
    moduleLanguage:
      "Retain internal module structure but change visible navigation and labels only after runtime integration.",
    aiLanguage:
      "Replace visible AI terminology with the human outcome while keeping internal intelligence unchanged.",
  };

  if (file.startsWith("lib/3bos/")) {
    return "Review as an existing 3BOS foundation. Extend only where the runtime contract requires it.";
  }

  return strategies[categoryKey] || "Wrap, adapt and migrate gradually.";
}

function truncateLine(line, maxLength = 240) {
  const compact = line.trim().replace(/\s+/g, " ");

  if (compact.length <= maxLength) return compact;

  return `${compact.slice(0, maxLength - 1)}…`;
}

fs.mkdirSync(REPORT_DIR, { recursive: true });

const files = [];

for (const scanRoot of SCAN_ROOTS) {
  collectFiles(path.join(ROOT, scanRoot), files);
}

const uniqueFiles = [...new Set(files)].sort();

const findings = [];
const unreadableFiles = [];

for (const absoluteFile of uniqueFiles) {
  const file = normalizePath(absoluteFile);

  let content;

  try {
    content = fs.readFileSync(absoluteFile, "utf8");
  } catch (error) {
    unreadableFiles.push({
      file,
      error: error instanceof Error ? error.message : String(error),
    });
    continue;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const classifications = classifyLine(line);

    for (const classification of classifications) {
      findings.push({
        id: `${file}:${index + 1}:${classification.categoryKey}`,
        file,
        line: index + 1,
        area: determineArea(file),
        category: classification.categoryKey,
        categoryLabel: classification.categoryLabel,
        matchedKeywords: classification.matchedKeywords,
        currentSystem: truncateLine(line),
        threeBosReplacement: classification.replacement,
        backwardCompatibility:
          "Keep the existing field, route, API and permission behavior operational during migration.",
        migrationStrategy: determineStrategy(
          classification.categoryKey,
          file
        ),
        risk: determineRisk(file, line),
        status: file.startsWith("lib/3bos/")
          ? "EXISTING_3BOS_FOUNDATION"
          : "LEGACY_OR_MIXED",
      });
    }
  });
}

const categoryCounts = {};
const areaCounts = {};
const riskCounts = {};
const fileCounts = {};

for (const finding of findings) {
  categoryCounts[finding.categoryLabel] =
    (categoryCounts[finding.categoryLabel] || 0) + 1;

  areaCounts[finding.area] = (areaCounts[finding.area] || 0) + 1;

  riskCounts[finding.risk] = (riskCounts[finding.risk] || 0) + 1;

  fileCounts[finding.file] = (fileCounts[finding.file] || 0) + 1;
}

const topFiles = Object.entries(fileCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([file, count]) => ({ file, count }));

const priorityOrder = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const foundationFindings = findings.filter(
  (finding) => finding.status === "EXISTING_3BOS_FOUNDATION"
);

const migrationFindings = findings.filter(
  (finding) => finding.status !== "EXISTING_3BOS_FOUNDATION"
);

const migrationMap = [...migrationFindings].sort((a, b) => {
  const riskDifference =
    priorityOrder[a.risk] - priorityOrder[b.risk];

  if (riskDifference !== 0) return riskDifference;

  const fileDifference = a.file.localeCompare(b.file);

  if (fileDifference !== 0) return fileDifference;

  return a.line - b.line;
});

const generatedAt = new Date().toISOString();

const report = {
  audit: {
    name: "PROJECT NEEV — Phase 5 — 3BOS Platform Integration Audit",
    mode: "READ_ONLY_SOURCE_AUDIT",
    generatedAt,
    repositoryRoot: ROOT,
    scannedRoots: SCAN_ROOTS,
    productionMutation: false,
    databaseConnection: false,
    runtimeImport: false,
  },
  summary: {
    filesScanned: uniqueFiles.length,
    totalReferences: findings.length,
    migrationFindings: migrationFindings.length,
    existing3BOSFoundationReferences: foundationFindings.length,
    unreadableFiles: unreadableFiles.length,
    categoryCounts,
    areaCounts,
    riskCounts,
    topFiles,
  },
  migrationPrinciples: [
    "Never remove existing APIs.",
    "Never remove existing database fields.",
    "Never rename production routes.",
    "Never change established URLs.",
    "Never weaken existing permissions.",
    "Wrap existing behavior.",
    "Adapt through compatibility resolvers.",
    "Extend registries and runtime contracts.",
    "Migrate page by page.",
    "Keep legacy behavior as fallback until verified.",
  ],
  findings: migrationMap,
  unreadableFiles,
};

const jsonPath = path.join(REPORT_DIR, "platform-audit.json");

fs.writeFileSync(
  jsonPath,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

const markdown = [];

markdown.push("# PROJECT NEEV — Phase 5");
markdown.push("");
markdown.push("## 3BOS Platform Integration Audit");
markdown.push("");
markdown.push(`Generated: ${generatedAt}`);
markdown.push("");
markdown.push("**Audit mode:** Read-only source inspection");
markdown.push("");
markdown.push("- Database connection: No");
markdown.push("- Production mutation: No");
markdown.push("- Runtime application change: No");
markdown.push("- Route change: No");
markdown.push("- API change: No");
markdown.push("");
markdown.push("## Executive Summary");
markdown.push("");
markdown.push(`- Files scanned: **${uniqueFiles.length}**`);
markdown.push(`- Total references detected: **${findings.length}**`);
markdown.push(`- Legacy or mixed migration findings: **${migrationFindings.length}**`);
markdown.push(`- Existing 3BOS foundation references: **${foundationFindings.length}**`);
markdown.push(`- Unreadable files: **${unreadableFiles.length}**`);
markdown.push("");

markdown.push("## Findings by 3BOS Area");
markdown.push("");
markdown.push("| Area | Findings |");
markdown.push("|---|---:|");

for (const [category, count] of Object.entries(categoryCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  markdown.push(`| ${category} | ${count} |`);
}

markdown.push("");
markdown.push("## Findings by Application Area");
markdown.push("");
markdown.push("| Application Area | Findings |");
markdown.push("|---|---:|");

for (const [area, count] of Object.entries(areaCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  markdown.push(`| ${area} | ${count} |`);
}

markdown.push("");
markdown.push("## Risk Distribution");
markdown.push("");
markdown.push("| Risk | Findings |");
markdown.push("|---|---:|");

for (const risk of ["HIGH", "MEDIUM", "LOW"]) {
  markdown.push(`| ${risk} | ${riskCounts[risk] || 0} |`);
}

markdown.push("");
markdown.push("## Highest-Concentration Files");
markdown.push("");
markdown.push("| File | Findings |");
markdown.push("|---|---:|");

for (const item of topFiles) {
  markdown.push(`| \`${item.file}\` | ${item.count} |`);
}

markdown.push("");
markdown.push("## Production-Safe Migration Model");
markdown.push("");
markdown.push(
  "Human Identity → Workspace → Capabilities → Business Growth Plan → Available Actions → Human-First UI"
);
markdown.push("");
markdown.push("Existing production behavior remains below this model as a compatibility layer.");
markdown.push("");

markdown.push("## Migration Map");
markdown.push("");

for (const finding of migrationMap) {
  markdown.push(
    `### ${finding.risk} — ${finding.file}:${finding.line}`
  );
  markdown.push("");
  markdown.push(`**Area:** ${finding.area}`);
  markdown.push("");
  markdown.push(`**Category:** ${finding.categoryLabel}`);
  markdown.push("");
  markdown.push(
    `**Matched:** ${finding.matchedKeywords
      .map((keyword) => `\`${keyword}\``)
      .join(", ")}`
  );
  markdown.push("");
  markdown.push("**Current system**");
  markdown.push("");
  markdown.push("```text");
  markdown.push(finding.currentSystem.replace(/```/g, ""));
  markdown.push("```");
  markdown.push("");
  markdown.push("**3BOS replacement**");
  markdown.push("");
  markdown.push(finding.threeBosReplacement);
  markdown.push("");
  markdown.push("**Backward compatibility**");
  markdown.push("");
  markdown.push(finding.backwardCompatibility);
  markdown.push("");
  markdown.push("**Migration strategy**");
  markdown.push("");
  markdown.push(finding.migrationStrategy);
  markdown.push("");
}

const markdownPath = path.join(
  REPORT_DIR,
  "platform-migration-map.md"
);

fs.writeFileSync(
  markdownPath,
  `${markdown.join("\n")}\n`,
  "utf8"
);

const summaryLines = [
  "PROJECT NEEV — PHASE 5 — 3BOS PLATFORM AUDIT",
  "================================================",
  `Generated: ${generatedAt}`,
  `Files scanned: ${uniqueFiles.length}`,
  `Total references: ${findings.length}`,
  `Migration findings: ${migrationFindings.length}`,
  `Existing 3BOS foundation references: ${foundationFindings.length}`,
  `High risk references: ${riskCounts.HIGH || 0}`,
  `Medium risk: ${riskCounts.MEDIUM || 0}`,
  `Low risk: ${riskCounts.LOW || 0}`,
  "",
  "CATEGORY COUNTS",
  "---------------",
  ...Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `${category}: ${count}`),
  "",
  "TOP FILES",
  "---------",
  ...topFiles
    .slice(0, 25)
    .map((item) => `${String(item.count).padStart(5)}  ${item.file}`),
  "",
  "No database connection was made.",
  "No source file was modified by the audit.",
  "No runtime behavior was changed.",
];

const summaryPath = path.join(
  REPORT_DIR,
  "platform-audit-summary.txt"
);

fs.writeFileSync(
  summaryPath,
  `${summaryLines.join("\n")}\n`,
  "utf8"
);

console.log("");
console.log("✅ 3BOS read-only platform audit completed.");
console.log("");
console.log(`Files scanned : ${uniqueFiles.length}`);
console.log(`Total refs    : ${findings.length}`);
console.log(`Migration     : ${migrationFindings.length}`);
console.log(`3BOS existing : ${foundationFindings.length}`);
console.log(`High risk refs: ${riskCounts.HIGH || 0}`);
console.log(`Medium risk   : ${riskCounts.MEDIUM || 0}`);
console.log(`Low risk      : ${riskCounts.LOW || 0}`);
console.log("");
console.log("Reports:");
console.log(`- ${normalizePath(summaryPath)}`);
console.log(`- ${normalizePath(markdownPath)}`);
console.log(`- ${normalizePath(jsonPath)}`);
console.log("");
