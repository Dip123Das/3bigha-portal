"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  threadId: string;
  module: "investment" | "rfq" | "direct";
  unreadCount: number;
  lastActivityAt: string | null;
};

function hoursSince(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return null;
  return (Date.now() - ts) / (60 * 60 * 1000);
}

function writeReminder(threadId: string, dueAt: number) {
  try {
    const raw = localStorage.getItem("inbox_reminders");
    const parsed = raw ? JSON.parse(raw) : {};

    parsed[threadId] = {
      id: threadId,
      dueAt,
    };

    localStorage.setItem("inbox_reminders", JSON.stringify(parsed));

    const now = Date.now();
    const dueThreadIds = Object.entries(parsed)
      .filter(([, item]: any) => now >= Number(item?.dueAt))
      .map(([id]) => id);

    const detail = {
      dueCount: dueThreadIds.length,
      dueThreadIds,
      now,
    };

    window.dispatchEvent(new CustomEvent("inbox-reminder-set", { detail }));
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

export default function InboxAutoReminderSuggestion({
  threadId,
  module,
  unreadCount,
  lastActivityAt,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const suggestion = useMemo(() => {
    if (!mounted) return null;

    const hrs = hoursSince(lastActivityAt);
    if (hrs == null) return null;

    if (unreadCount > 0 && hrs >= 2 && hrs < 24) {
      return {
        label: "AI: follow up soon",
        helper: `Unread for ${Math.round(hrs)}h`,
        dueAt: Date.now() + 60 * 60 * 1000,
      };
    }

    if (module === "investment" && hrs >= 24) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      return {
        label: "AI: check stage tomorrow",
        helper: `Inactive for ${Math.round(hrs)}h`,
        dueAt: tomorrow.getTime(),
      };
    }

    if (unreadCount > 0 && hrs >= 24) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      return {
        label: "AI: remind tomorrow",
        helper: `Unread for ${Math.round(hrs)}h`,
        dueAt: tomorrow.getTime(),
      };
    }

    return null;
  }, [mounted, lastActivityAt, module, unreadCount]);

  if (!mounted || !suggestion) return null;

  return (
    <div
      className="rounded-2xl border border-violet-200 bg-violet-50 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-violet-600">
        AI Auto Reminder
      </div>

      <div className="mt-1 text-sm font-semibold text-violet-900">
        {suggestion.label}
      </div>

      <div className="mt-1 text-xs text-violet-700">{suggestion.helper}</div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => writeReminder(threadId, suggestion.dueAt)}
          className="rounded-xl border border-violet-200 bg-white px-2 py-1 text-xs text-violet-700 transition hover:border-violet-300"
        >
          Apply reminder
        </button>
      </div>
    </div>
  );
}