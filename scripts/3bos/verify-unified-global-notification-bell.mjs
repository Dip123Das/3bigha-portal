import assert from "node:assert/strict";
import fs from "node:fs";

const bell = fs.readFileSync(
  "app/_components/GlobalNotificationBell.tsx",
  "utf8"
);

const center = fs.readFileSync(
  "components/3bos/workspace-notifications/WorkspaceNotificationCenter.tsx",
  "utf8"
);

const css = fs.readFileSync(
  "app/_components/GlobalNotificationBell.module.css",
  "utf8"
);

assert.ok(
  bell.includes(
    'from("vendor_notifications")'
  ),
  "Existing Supabase notifications were not preserved."
);

assert.ok(
  bell.includes(
    "resolveWorkspaceNotifications"
  ),
  "3BOS notification engine is not connected."
);

assert.ok(
  bell.includes(
    "combinedUnreadCount"
  ),
  "Unified unread count is missing."
);

assert.ok(
  bell.includes(
    "THREE_BOS_EVENT_BUS_UPDATE"
  ),
  "Operational event updates are not connected."
);

assert.ok(
  bell.includes(
    "markWorkspaceNotificationRead"
  ),
  "Mark-read behavior is missing."
);

assert.ok(
  bell.includes(
    "dismissWorkspaceNotification"
  ),
  "Dismiss behavior is missing."
);

assert.ok(
  css.includes(
    ".panel"
  ),
  "Notification dropdown styling is missing."
);

assert.ok(
  !center.includes(
    "THREE_BOS_NOTIFICATION_UPDATE,\n      refresh"
  ),
  "Notification Center still contains the recursive refresh listener."
);

console.log(
  "Unified global notification bell verification passed."
);
