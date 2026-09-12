import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const roots = ["app", "components", "lib"];
const relevantTables = [
  "builder_projects",
  "builder_inventory_units",
  "builder_inventory_pricing",
  "builder_project_catalogs",
  "builder_inventory_unit_media",
  "builder_inventory_unit_amenities",
  "property_listing_sources",
];
const browserClientPattern = /getSupabaseBrowser|supabaseBrowser/;
const serverClientPattern = /getSupabaseServerClient|getSupabaseAdmin|supabaseAdmin/;

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [absolute] : [];
  });
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function classify(relative, source) {
  if (relative.startsWith("app/api/")) return "server-route";
  if (browserClientPattern.test(source)) return "browser-client";
  if (serverClientPattern.test(source)) return "server-module";
  return "unclassified";
}

const findings = [];

for (const sourceRoot of roots) {
  for (const absolute of walk(path.join(root, sourceRoot))) {
    const source = fs.readFileSync(absolute, "utf8");
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    const authority = classify(relative, source);

    for (const table of relevantTables) {
      const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const directMutationPattern = new RegExp(
        `\\.from\\(["']${escapedTable}["']\\)(?:(?!\\.from\\()[\\s\\S]){0,500}?\\.(insert|update|upsert|delete)\\s*\\(`,
        "g",
      );

      for (const match of source.matchAll(directMutationPattern)) {
        findings.push({
          file: relative,
          line: lineNumber(source, match.index ?? 0),
          table,
          operation: match[1],
          authority,
        });
      }
    }

    const fallbackInsertPattern =
      /insertWithFallback\(["'](builder_inventory_units|builder_inventory_pricing|builder_project_catalogs)["']/g;
    for (const match of source.matchAll(fallbackInsertPattern)) {
      findings.push({
        file: relative,
        line: lineNumber(source, match.index ?? 0),
        table: match[1],
        operation: "insert-with-schema-fallback",
        authority,
      });
    }
  }
}

findings.sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.table.localeCompare(b.table),
);

const summary = findings.reduce(
  (result, item) => {
    result.total += 1;
    result[item.authority] = (result[item.authority] ?? 0) + 1;
    return result;
  },
  { total: 0 },
);

const result = {
  audit: "PBS_00A_PROPERTY_TRANSACTION_SOURCE_AUTHORITY_AUDIT",
  generatedAt: new Date().toISOString(),
  gitHead: process.env.GIT_HEAD || null,
  summary,
  findings,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
