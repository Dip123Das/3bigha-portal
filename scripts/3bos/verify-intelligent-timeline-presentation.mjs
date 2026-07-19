import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync(
  "components/3bos/workspace-command/WorkspaceTimeline.tsx",
  "utf8"
);

const css = fs.readFileSync(
  "components/3bos/workspace-command/workspace-command.module.css",
  "utf8"
);

assert.ok(
  component.includes(
    "projectWorkspaceTimeline"
  ),
  "Timeline projection is not connected."
);

assert.ok(
  component.includes(
    "getThreeBOSEvents"
  ),
  "Unified event bus is not connected."
);

assert.ok(
  component.includes(
    'PERIOD_LABELS'
  ),
  "Timeline periods are missing."
);

assert.ok(
  component.includes(
    "projection.attentionCount"
  ),
  "Attention summary is missing."
);

assert.ok(
  css.includes(
    ".timelineGroupHeader"
  ),
  "Timeline grouping styles are missing."
);

assert.ok(
  css.includes(
    ".timelineDotSuccess"
  ),
  "Timeline tone styles are missing."
);

console.log(
  "Intelligent timeline presentation verification passed."
);
