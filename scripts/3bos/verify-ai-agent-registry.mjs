import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "lib/3bos/ai-agents/types.ts",
  "lib/3bos/ai-agents/registry.ts",
  "lib/3bos/ai-agents/index.ts",
];

const expectedAgents = [
  {
    id: "procurement-assistant",
    endpoint: "/api/ai/procurement-assistant",
  },
  {
    id: "procurement-copilot",
    endpoint: "/api/ai/procurement-copilot",
  },
  {
    id: "procurement-command",
    endpoint: "/api/ai/procurement-copilot-command",
  },
  {
    id: "marketplace-discovery",
    endpoint: "/api/ai/marketplace-discovery",
  },
  {
    id: "marketplace-orchestrator",
    endpoint: "/api/ai/marketplace-orchestrator",
  },
  {
    id: "rfq-generator",
    endpoint: "/api/ai/rfq-generator",
  },
  {
    id: "quote-risk-analysis",
    endpoint: "/api/ai/quote-risk-analysis",
  },
  {
    id: "unified-cognition",
    endpoint: "/api/ai/procurement-unified-cognition",
  },
];

const failures = [];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
  }
}

const registryPath = path.join(
  root,
  "lib/3bos/ai-agents/registry.ts"
);

if (fs.existsSync(registryPath)) {
  const registrySource = fs.readFileSync(registryPath, "utf8");

  for (const agent of expectedAgents) {
    if (!registrySource.includes(`"${agent.id}"`)) {
      failures.push(`Missing agent id: ${agent.id}`);
    }

    if (!registrySource.includes(`"${agent.endpoint}"`)) {
      failures.push(`Missing endpoint: ${agent.endpoint}`);
    }
  }

  const requiredHelpers = [
    "getThreeBOSAiAgent",
    "hasThreeBOSAiAgent",
    "listThreeBOSAiAgents",
    "getDefaultThreeBOSAiAgent",
  ];

  for (const helper of requiredHelpers) {
    if (!registrySource.includes(`function ${helper}`)) {
      failures.push(`Missing registry helper: ${helper}`);
    }
  }

  if (!registrySource.includes('availability: "default"')) {
    failures.push("No default AI agent is registered.");
  }
}

if (failures.length > 0) {
  console.error("3BOS AI Agent Registry verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("3BOS AI Agent Registry verification passed.");
console.log(`Registered agents checked: ${expectedAgents.length}`);
