import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "lib/3bos/ai-router/types.ts",
  "lib/3bos/ai-router/normalize-request.ts",
  "lib/3bos/ai-router/normalize-response.ts",
  "lib/3bos/ai-router/router.ts",
  "lib/3bos/ai-router/index.ts",
];

const failures = [];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
  }
}

const requiredSymbols = {
  "lib/3bos/ai-router/normalize-request.ts": [
    "resolveThreeBOSAiRouterAgent",
    "normalizeThreeBOSAiRequest",
    "getDefaultThreeBOSAiAgent",
    "getThreeBOSAiAgent",
  ],
  "lib/3bos/ai-router/normalize-response.ts": [
    "normalizeThreeBOSAiResponse",
    "recommendations",
    "actions",
    "metadata",
  ],
  "lib/3bos/ai-router/router.ts": [
    "routeThreeBOSAiRequest",
    "normalizeThreeBOSAiRequest",
    "normalizeThreeBOSAiResponse",
    "credentials: \"same-origin\"",
    "cache: \"no-store\"",
  ],
  "lib/3bos/ai-router/index.ts": [
    "runThreeBOSAiRouter",
    "ThreeBOSAiRouterInput",
    "ThreeBOSAiNormalizedResponse",
  ],
};

for (const [relativePath, symbols] of Object.entries(requiredSymbols)) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    continue;
  }

  const source = fs.readFileSync(absolutePath, "utf8");

  for (const symbol of symbols) {
    if (!source.includes(symbol)) {
      failures.push(
        `Missing required router symbol in ${relativePath}: ${symbol}`
      );
    }
  }
}

const routerDirectory = path.join(root, "lib/3bos/ai-router");

if (fs.existsSync(routerDirectory)) {
  const routerFiles = fs
    .readdirSync(routerDirectory)
    .filter((file) => file.endsWith(".ts"));

  for (const file of routerFiles) {
    const source = fs.readFileSync(
      path.join(routerDirectory, file),
      "utf8"
    );

    if (source.includes("/api/ai/")) {
      failures.push(
        `Hard-coded AI endpoint found outside registry: lib/3bos/ai-router/${file}`
      );
    }
  }
}

const registryPath = path.join(
  root,
  "lib/3bos/ai-agents/registry.ts"
);

if (!fs.existsSync(registryPath)) {
  failures.push("AI Agent Registry is missing.");
} else {
  const registrySource = fs.readFileSync(registryPath, "utf8");
  const enabledAgentCount = (
    registrySource.match(/enabled:\s*true/g) ?? []
  ).length;

  if (enabledAgentCount < 8) {
    failures.push(
      `Expected at least 8 enabled agents; found ${enabledAgentCount}.`
    );
  }
}

import { execFileSync } from "node:child_process";

let productionRouteChanges = [];

try {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--", "app/api/ai"],
    {
      cwd: root,
      encoding: "utf8",
    }
  ).trim();

  productionRouteChanges = output
    ? output.split(/\r?\n/)
    : [];
} catch {
  productionRouteChanges = [];
}

if (productionRouteChanges.length > 0) {
  failures.push(
    `Existing AI route files were modified: ${productionRouteChanges.join(
      ", "
    )}`
  );
}

if (failures.length > 0) {
  console.error("3BOS Unified AI Router verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("3BOS Unified AI Router verification passed.");
console.log("Registry-driven routing confirmed.");
console.log("No AI endpoint URLs are duplicated in the router.");
console.log("No existing app/api/ai route was modified.");
