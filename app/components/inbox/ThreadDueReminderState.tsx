"use client";

import React, { useEffect, useMemo, useState } from "react";

type ReminderMap = Record<
  string,
  number | string | { id?: string; dueAt?: number | string }
>;

function readReminderMap(): ReminderMap {
  if (typeof window === "undefined") return {};

  const candidateKeys = [
    "inbox_reminders",
    "inbox-v2-reminders",
    "inboxReminders",
    "threadReminders",
  ];

  for (const key of candidateKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as ReminderMap;
      }
    } catch {
      // ignore malformed storage and continue
    }
  }

  return {};
}

function getDueAtForThread(threadId: string): number | null {
  const map = readReminderMap();
  const value = map?.[threadId];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const asNum = Number(value);
    return Number.isFinite(asNum) ? asNum : null;
  }

  if (value && typeof value === "object") {
    const raw = value.dueAt;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const asNum = Number(raw);
      return Number.isFinite(asNum) ? asNum : null;
    }
  }

  return null;
}

function formatReminderRelative(dueAt: number, now = Date.now()) {
  const diffMs = dueAt - now;
  const absMs = Math.abs(diffMs);

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  const minutes = Math.max(1, Math.round(absMs / minuteMs));
  const hours = Math.max(1, Math.round(absMs / hourMs));
  const days = Math.max(1, Math.round(absMs / dayMs));

  if (diffMs <= 0) {
    if (absMs < minuteMs) return "Due now";
    if (absMs < hourMs) return `Overdue by ${minutes}m`;
    if (absMs < dayMs) return `Overdue by ${hours}h`;
    return `Overdue by ${days}d`;
  }

  if (diffMs < hourMs) return `Due in ${minutes}m`;
  if (diffMs < dayMs) return `Due in ${hours}h`;
  if (diffMs < 2 * dayMs) return "Due tomorrow";
  return `Due in ${days}d`;
}

function clearThreadReminder(threadId: string) {
  try {
    const raw = window.localStorage.getItem("inbox_reminders");
    if (!raw) return;

    const parsed = JSON.parse(raw) as Record<
      string,
      { id?: string; dueAt?: number | string }
    >;

    if (!parsed[threadId]) return;

    delete parsed[threadId];
    window.localStorage.setItem("inbox_reminders", JSON.stringify(parsed));

    const now = Date.now();
    const dueThreadIds = Object.entries(parsed)
      .filter(([, value]) => {
        const rawDueAt = value?.dueAt;
        const dueAt =
          typeof rawDueAt === "number"
            ? rawDueAt
            : typeof rawDueAt === "string"
            ? Number(rawDueAt)
            : NaN;

        return Number.isFinite(dueAt) && dueAt <= now;
      })
      .map(([id]) => id);

    const detail = {
      dueCount: dueThreadIds.length,
      dueThreadIds,
      now,
    };

    window.dispatchEvent(
      new CustomEvent("inbox-reminder-cleared", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-reminders-mutated", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-reminders-updated", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-v2-reminders-updated", { detail })
    );
  } catch {
    // no-op
  }
}

function useReminderDueState(threadId: string) {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  const sync = () => setTick((v) => v + 1);

  useEffect(() => {
    setMounted(true);

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === "inbox_reminders" ||
        event.key === "inbox-v2-reminders" ||
        event.key === "inboxReminders" ||
        event.key === "threadReminders"
      ) {
        sync();
      }
    };

    const onReminderEvent = () => {
      sync();
    };

    const onFocus = () => {
      sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("inbox-v2-reminders-updated", onReminderEvent);
    window.addEventListener("inbox-v2-reminder-due", onReminderEvent);
    window.addEventListener("inbox-reminders-updated", onReminderEvent);
    window.addEventListener("inbox-reminder-set", onReminderEvent);
    window.addEventListener("inbox-reminder-cleared", onReminderEvent);
    window.addEventListener("inbox-reminders-mutated", onReminderEvent);

    const interval = window.setInterval(() => {
      sync();
    }, 15000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("inbox-v2-reminders-updated", onReminderEvent);
      window.removeEventListener("inbox-v2-reminder-due", onReminderEvent);
      window.removeEventListener("inbox-reminders-updated", onReminderEvent);
      window.removeEventListener("inbox-reminder-set", onReminderEvent);
      window.removeEventListener("inbox-reminder-cleared", onReminderEvent);
      window.removeEventListener("inbox-reminders-mutated", onReminderEvent);
      window.clearInterval(interval);
    };
  }, []);

  const dueAt = useMemo(() => {
    if (!mounted) return null;
    return getDueAtForThread(threadId);
  }, [threadId, tick, mounted]);

  const isDue = useMemo(() => {
    if (!mounted || dueAt == null) return false;
    return dueAt <= Date.now();
  }, [dueAt, tick, mounted]);

  const reminderLabel = useMemo(() => {
    if (!mounted || dueAt == null) return null;
    return formatReminderRelative(dueAt);
  }, [dueAt, tick, mounted]);

  return { mounted, isDue, dueAt, reminderLabel };
}

type LinkProps = {
  threadId: string;
  href: string;
  children: React.ReactNode;
  module?: string;
  priorityLabel?: string;
  unreadCount?: number;
};

export default function ThreadDueReminderState({
  threadId,
  href,
  children,
  module,
  priorityLabel,
  unreadCount,
}: LinkProps) {
  const { mounted, isDue } = useReminderDueState(threadId);

  return (
    <div
      id={`thread-card-${threadId}`}
      data-thread-id={threadId}
      data-thread-module={module ?? ""}
      data-thread-priority={priorityLabel ?? ""}
      data-thread-due={mounted && isDue ? "true" : "false"}
      data-thread-unread={Number(unreadCount ?? 0) > 0 ? "true" : "false"}
      data-thread-href={href}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest("a[href]");
        if (anchor) {
          clearThreadReminder(threadId);
        }
      }}
      className={`block rounded-3xl border p-4 shadow-sm transition hover:shadow-md ${
        mounted && isDue
          ? "border-rose-300 bg-rose-50/60 ring-1 ring-rose-200 hover:border-rose-400"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {children}
    </div>
  );
}

type BadgeProps = {
  threadId: string;
};

export function ThreadDueReminderBadge({ threadId }: BadgeProps) {
  const { mounted, isDue, reminderLabel } = useReminderDueState(threadId);

  if (!mounted || !reminderLabel) return null;

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        isDue
          ? "border-rose-300 bg-rose-100 text-rose-700"
          : "border-amber-300 bg-amber-50 text-amber-700"
      }`}
    >
      {reminderLabel}
    </span>
  );
}