import fs from "node:fs";

const hookPath =
  "lib/3bos/ai-context/useThreeBOSAiContext.ts";

const indexPath =
  "lib/3bos/ai-context/index.ts";

const hook = fs.readFileSync(hookPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

const assertions = [
  [
    hook.includes('"use client"'),
    "hook must be a client module",
  ],
  [
    hook.includes("use3BOSRuntime"),
    "hook must consume the 3BOS runtime",
  ],
  [
    hook.includes("projectThreeBOSAiContext"),
    "hook must use the AI projection engine",
  ],
  [
    hook.includes("primaryWorkspaceActions"),
    "hook must project primary workspace actions",
  ],
  [
    hook.includes("crossWorkspaceActions"),
    "hook must project cross-workspace actions",
  ],
  [
    hook.includes("journeyContext"),
    "hook must include selected journey context",
  ],
  [
    index.includes(
      'export * from "./useThreeBOSAiContext";'
    ),
    "hook must be publicly exported",
  ],
];

const failures = assertions
  .filter(([passed]) => !passed)
  .map(([, message]) => message);

if (failures.length) {
  console.error(
    "3BOS AI context runtime hook verification failed:"
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "3BOS AI context runtime hook verification passed."
);
