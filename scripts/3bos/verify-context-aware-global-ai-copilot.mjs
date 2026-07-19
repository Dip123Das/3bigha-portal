import fs from "node:fs";

const file =
  "app/_components/GlobalAiCopilot.tsx";

const source = fs.readFileSync(file, "utf8");

const assertions = [
  [
    source.includes("useThreeBOSAiContext"),
    "Copilot must consume the 3BOS AI context hook",
  ],
  [
    source.includes("aiContext.actions"),
    "Copilot must project context actions",
  ],
  [
    source.includes("Recommended for You"),
    "Copilot must expose a recommended section",
  ],
  [
    source.includes("visibleTools"),
    "Copilot must preserve a combined tool collection",
  ],
  [
    source.includes("...tools"),
    "Copilot must retain existing static tools as fallback",
  ],
  [
    source.includes("aiContext.page"),
    "Copilot must display current page context",
  ],
  [
    source.includes("aiContext.workspace"),
    "Copilot must display current workspace context",
  ],
];

const failures = assertions
  .filter(([passed]) => !passed)
  .map(([, message]) => message);

if (failures.length) {
  console.error(
    "Context-aware Global AI Copilot verification failed:"
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "Context-aware Global AI Copilot verification passed."
);
