"use client";

import { useEffect } from "react";

type ReminderEntry = {
  id: string;
  dueAt: number;
};

type ProcurementSchedulerEntry = {
  threadId: string;
  action: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  dueAt: number;
  reason: string;
  createdAt: number;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getDueReminderState() {
  const parsed = readJson<Record<string, ReminderEntry>>("inbox_reminders", {});
  const now = Date.now();

  const dueThreadIds = Object.entries(parsed)
    .filter(([, item]) => now >= item.dueAt)
    .map(([threadId]) => threadId);

  return {
    dueCount: dueThreadIds.length,
    dueThreadIds,
  };
}

function getProcurementSchedulerState() {
  const queue = readJson<Record<string, ProcurementSchedulerEntry>>(
    "procurement_scheduler_queue",
    {}
  );

  const now = Date.now();
  const entries = Object.values(queue);

  const dueActions = entries.filter((item) => now >= item.dueAt);
  const critical = entries.filter((item) => item.priority === "Critical").length;
  const high = entries.filter((item) => item.priority === "High").length;

  return {
    queue,
    total: entries.length,
    dueCount: dueActions.length,
    critical,
    high,
    dueThreadIds: dueActions.map((item) => item.threadId),
  };
}

export default function InboxBackgroundScheduler() {
  useEffect(() => {
    const originalTitle = document.title;

    function publishDueCount() {
      const { dueCount, dueThreadIds } = getDueReminderState();
      const procurement = getProcurementSchedulerState();

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

      window.dispatchEvent(
        new CustomEvent("procurement-scheduler-updated", {
          detail: {
            ...procurement,
            now: Date.now(),
          },
        })
      );

      const totalDue = dueCount + procurement.dueCount;

      document.title =
        totalDue > 0
          ? `(${totalDue}) Actions Due • ${originalTitle}`
          : originalTitle;
    }

    publishDueCount();

    const interval = window.setInterval(() => {
      publishDueCount();
    }, 60 * 1000);

    const onMutation = () => publishDueCount();

    window.addEventListener("storage", onMutation);
    window.addEventListener("focus", onMutation);
    window.addEventListener("inbox-reminder-set", onMutation);
    window.addEventListener("inbox-reminder-cleared", onMutation);
    window.addEventListener("inbox-reminders-mutated", onMutation);
    window.addEventListener("procurement-scheduler-mutated", onMutation);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onMutation);
      window.removeEventListener("focus", onMutation);
      window.removeEventListener("inbox-reminder-set", onMutation);
      window.removeEventListener("inbox-reminder-cleared", onMutation);
      window.removeEventListener("inbox-reminders-mutated", onMutation);
      window.removeEventListener("procurement-scheduler-mutated", onMutation);
      document.title = originalTitle;
    };
  }, []);

  return null;
}