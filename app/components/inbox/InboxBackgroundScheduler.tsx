"use client";

import { useEffect } from "react";

type ReminderEntry = {
  id: string;
  dueAt: number;
};

function getDueReminderState() {
  try {
    const raw = localStorage.getItem("inbox_reminders");
    if (!raw) {
      return {
        dueCount: 0,
        dueThreadIds: [] as string[],
      };
    }

    const parsed = JSON.parse(raw) as Record<string, ReminderEntry>;
    const now = Date.now();

    const dueThreadIds = Object.entries(parsed)
      .filter(([, item]) => now >= item.dueAt)
      .map(([threadId]) => threadId);

    return {
      dueCount: dueThreadIds.length,
      dueThreadIds,
    };
  } catch {
    return {
      dueCount: 0,
      dueThreadIds: [] as string[],
    };
  }
}

function getDueReminderCount() {
  return getDueReminderState().dueCount;
}

export default function InboxBackgroundScheduler() {
  useEffect(() => {
    const originalTitle = document.title;

    function publishDueCount() {
      const { dueCount, dueThreadIds } = getDueReminderState();

      window.dispatchEvent(
        new CustomEvent("inbox-reminders-updated", {
          detail: { dueCount, dueThreadIds },
        })
      );

      window.dispatchEvent(
        new CustomEvent("inbox-v2-reminders-updated", {
          detail: {
            dueCount,
            dueThreadIds,
            now: Date.now(),
          },
        })
      );

      document.title =
        dueCount > 0
          ? `(${dueCount}) Reminders Due • ${originalTitle}`
          : originalTitle;
    }

    publishDueCount();

    const interval = window.setInterval(() => {
      publishDueCount();
    }, 60 * 1000);

    const onStorage = () => publishDueCount();
    const onReminderMutation = () => publishDueCount();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    window.addEventListener("inbox-reminder-set", onReminderMutation);
    window.addEventListener("inbox-reminder-cleared", onReminderMutation);
    window.addEventListener("inbox-reminders-mutated", onReminderMutation);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener("inbox-reminder-set", onReminderMutation);
      window.removeEventListener("inbox-reminder-cleared", onReminderMutation);
      window.removeEventListener("inbox-reminders-mutated", onReminderMutation);
      document.title = originalTitle;
    };
  }, []);

  return null;
}