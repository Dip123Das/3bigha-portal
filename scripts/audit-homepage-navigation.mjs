import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const homepageFiles = [
  "app/page.tsx",
  "components/home/ConstitutionalHero.tsx",
  "components/home/SahajJourney.tsx",
  "components/home/FeaturedListings.tsx",
];

const errors = [];
const warnings = [];
const discovered = new Map();

function addDestination(destination, source, kind) {
  if (!destination) return;

  const clean = destination
    .replace(/\$\{[^}]+\}/g, "__dynamic__")
    .replace(/[?#].*$/, "");

  if (
    !clean.startsWith("/") ||
    clean.startsWith("//") ||
    clean.includes("__dynamic__")
  ) {
    return;
  }

  if (!discovered.has(clean)) {
    discovered.set(clean, []);
  }

  discovered.get(clean).push({ source, kind, original: destination });
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing homepage source file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function routeExists(route) {
  if (route === "/") {
    return fs.existsSync(path.join(root, "app/page.tsx"));
  }

  const segments = route.split("/").filter(Boolean);
  let current = path.join(root, "app");

  for (const segment of segments) {
    const exact = path.join(current, segment);

    if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) {
      current = exact;
      continue;
    }

    if (!fs.existsSync(current)) return false;

    const dynamicDirectory = fs
      .readdirSync(current, { withFileTypes: true })
      .find(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith("[") &&
          entry.name.endsWith("]"),
      );

    if (!dynamicDirectory) return false;

    current = path.join(current, dynamicDirectory.name);
  }

  return [
    "page.tsx",
    "page.ts",
    "page.jsx",
    "page.js",
    "route.ts",
    "route.js",
  ].some((file) => fs.existsSync(path.join(current, file)));
}

for (const relativePath of homepageFiles) {
  const content = read(relativePath);

  for (const match of content.matchAll(/\bhref\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    addDestination(match[1], relativePath, "object href");
  }

  for (const match of content.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)) {
    addDestination(match[1], relativePath, "element href");
  }

  for (const match of content.matchAll(
    /router\.(?:push|replace)\(\s*["'`]([^"'`]+)["'`]/g,
  )) {
    addDestination(match[1], relativePath, "router navigation");
  }
}

const requiredDestinations = [
  "/dashboard",
  "/property",
  "/materials",
  "/services",
  "/rentals",
  "/vendor-opportunities",
  "/rfq",
  "/search",
  "/construction-cost",
  "/price-today",
  "/emi-calculator",
  "/blog",
  "/investment/opportunities",
  "/login",
];

for (const destination of requiredDestinations) {
  if (!routeExists(destination)) {
    errors.push(`Required homepage destination is missing: ${destination}`);
  }
}

for (const [destination, sources] of discovered.entries()) {
  if (!routeExists(destination)) {
    warnings.push(
      `Destination not resolved as a static route: ${destination}\n` +
        sources
          .map(
            ({ source, kind, original }) =>
              `  - ${source} (${kind}): ${original}`,
          )
          .join("\n"),
    );
  }
}

const pageSource = read("app/page.tsx");
const heroSource = read("components/home/ConstitutionalHero.tsx");

const requiredBehaviourChecks = [
  {
    name: "Hero search handler",
    ok:
      heroSource.includes("onClick={onRunSearch}") &&
      pageSource.includes("onRunSearch"),
  },
  {
    name: "Hero requirement handler",
    ok:
      heroSource.includes("onClick={onSubmitRequirement}") &&
      pageSource.includes("onSubmitRequirement"),
  },
  {
    name: "Search tab handler",
    ok: heroSource.includes('onActiveTabChange("search")'),
  },
  {
    name: "Post requirement tab handler",
    ok: heroSource.includes('onActiveTabChange("post")'),
  },
  {
    name: "Marketplace scope handler",
    ok: heroSource.includes("onScopeChange(key)"),
  },
  {
    name: "Manage My Business route",
    ok: heroSource.includes('href="/dashboard"'),
  },
];

for (const check of requiredBehaviourChecks) {
  if (!check.ok) {
    errors.push(`Missing or disconnected behaviour: ${check.name}`);
  }
}

console.log("====================================================");
console.log("3Bigha Homepage Navigation Integrity Audit");
console.log("====================================================");
console.log(`Homepage destinations inspected: ${discovered.size}`);
console.log(`Required destinations inspected: ${requiredDestinations.length}`);
console.log("");

for (const [destination, sources] of [...discovered.entries()].sort()) {
  console.log(`✓ ${destination}`);
  for (const { source, kind } of sources) {
    console.log(`    ${source} — ${kind}`);
  }
}

if (warnings.length) {
  console.log("\nWARNINGS");
  for (const warning of warnings) {
    console.log(`⚠ ${warning}`);
  }
}

if (errors.length) {
  console.error("\nFAILURES");
  for (const error of errors) {
    console.error(`✗ ${error}`);
  }

  process.exit(1);
}

console.log("\nHomepage navigation integrity audit passed.");
