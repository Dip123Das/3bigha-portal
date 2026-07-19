import assert from "node:assert/strict";
import fs from "node:fs";

const projectSource = fs.readFileSync(
  "lib/3bos/ai-context/project.ts",
  "utf8"
);

const typeSource = fs.readFileSync(
  "lib/3bos/ai-context/types.ts",
  "utf8"
);

const pageSource = fs.readFileSync(
  "lib/3bos/ai-context/page-context.ts",
  "utf8"
);

const indexSource = fs.readFileSync(
  "lib/3bos/ai-context/index.ts",
  "utf8"
);

assert.ok(
  projectSource.includes(
    "projectThreeBOSAiContext"
  ),
  "Context projection function missing."
);

assert.ok(
  projectSource.includes(
    "normalizeNotificationAttention"
  ),
  "Notification context integration missing."
);

assert.ok(
  projectSource.includes(
    "normalizeActions"
  ),
  "Runtime action integration missing."
);

assert.ok(
  projectSource.includes(
    "buildPromptContext"
  ),
  "AI prompt context projection missing."
);

assert.ok(
  typeSource.includes(
    "ThreeBOSAiContextProjection"
  ),
  "Projection type missing."
);

assert.ok(
  typeSource.includes(
    "ThreeBOSAiPageContext"
  ),
  "Page context type missing."
);

assert.ok(
  pageSource.includes(
    'area: "rfq"'
  ),
  "RFQ route projection missing."
);

assert.ok(
  pageSource.includes(
    'area: "vendor"'
  ),
  "Vendor route projection missing."
);

assert.ok(
  pageSource.includes(
    'area: "buyer"'
  ),
  "Buyer route projection missing."
);

assert.ok(
  indexSource.includes(
    'export * from "./project"'
  ),
  "Public projection export missing."
);

console.log(
  "3BOS AI context projection verification passed."
);
