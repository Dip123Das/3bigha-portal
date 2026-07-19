import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync(
  "components/3bos/workspace-notifications/WorkspaceNotificationCenter.tsx",
  "utf8"
);

const commandCenter = fs.readFileSync(
  "components/3bos/workspace-command/WorkspaceCommandCenter.tsx",
  "utf8"
);

const css = fs.readFileSync(
  "components/3bos/workspace-notifications/workspace-notifications.module.css",
  "utf8"
);

assert.ok(
  component.includes(
    "resolveWorkspaceNotifications"
  ),
  "Notification engine is not connected."
);

assert.ok(
  component.includes(
    "markWorkspaceNotificationRead"
  ),
  "Mark-read control is missing."
);

assert.ok(
  component.includes(
    "dismissWorkspaceNotification"
  ),
  "Dismiss control is missing."
);

assert.ok(
  component.includes(
    "markAllWorkspaceNotificationsRead"
  ),
  "Mark-all-read control is missing."
);

assert.ok(
  commandCenter.includes(
    "<WorkspaceNotificationCenter />"
  ),
  "Notification Center is not mounted."
);

assert.ok(
  css.includes(
    ".priorityUrgent"
  ),
  "Urgent notification styling is missing."
);

console.log(
  "Smart Notification Center verification passed."
);
