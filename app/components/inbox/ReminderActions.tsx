"use client";

import { useEffect, useState } from "react";

type Props = {
  threadId: string;
};

type Reminder = {
  id: string;
  dueAt: number;
};

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

function getDueReminderState() {
  try {
    const raw = localStorage.getItem("inbox_reminders");
    if (!raw) {
      return {
        dueCount: 0,
        dueThreadIds: [] as string[],
      };
    }

    const parsed = JSON.parse(raw) as Record<string, Reminder>;
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

function publishReminderMutation(eventName: string) {
  const { dueCount, dueThreadIds } = getDueReminderState();

  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: { dueCount, dueThreadIds, now: Date.now() },
    })
  );

  window.dispatchEvent(
    new CustomEvent("inbox-reminders-mutated", {
      detail: { dueCount, dueThreadIds, now: Date.now() },
    })
  );

  window.dispatchEvent(
    new CustomEvent("inbox-reminders-updated", {
      detail: { dueCount, dueThreadIds, now: Date.now() },
    })
  );

  window.dispatchEvent(
    new CustomEvent("inbox-v2-reminders-updated", {
      detail: { dueCount, dueThreadIds, now: Date.now() },
    })
  );
}

export default function ReminderActions({ threadId }: Props) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function syncReminder() {
      try {
        const raw = localStorage.getItem("inbox_reminders");
        if (!raw) {
          setReminder(null);
          return;
        }

        const parsed: Record<string, Reminder> = JSON.parse(raw);
        setReminder(parsed[threadId] ?? null);
      } catch {
        setReminder(null);
      }
    }

    syncReminder();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "inbox_reminders") {
        syncReminder();
      }
    };

    const onReminderMutation = () => {
      syncReminder();
      setTick((v) => v + 1);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onReminderMutation);
    window.addEventListener("inbox-reminder-set", onReminderMutation);
    window.addEventListener("inbox-reminder-cleared", onReminderMutation);
    window.addEventListener("inbox-reminders-mutated", onReminderMutation);
    window.addEventListener("inbox-reminders-updated", onReminderMutation);
    window.addEventListener("inbox-v2-reminders-updated", onReminderMutation);

    const interval = window.setInterval(() => {
      setTick((v) => v + 1);
    }, 15000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onReminderMutation);
      window.removeEventListener("inbox-reminder-set", onReminderMutation);
      window.removeEventListener("inbox-reminder-cleared", onReminderMutation);
      window.removeEventListener("inbox-reminders-mutated", onReminderMutation);
      window.removeEventListener("inbox-reminders-updated", onReminderMutation);
      window.removeEventListener("inbox-v2-reminders-updated", onReminderMutation);
      window.clearInterval(interval);
    };
  }, [threadId]);

  function saveExactReminder(dueAt: number) {
    const raw = localStorage.getItem("inbox_reminders");
    const parsed = raw ? JSON.parse(raw) : {};

    parsed[threadId] = {
      id: threadId,
      dueAt,
    };

    localStorage.setItem("inbox_reminders", JSON.stringify(parsed));
    setReminder(parsed[threadId]);
    publishReminderMutation("inbox-reminder-set");
  }

  function saveReminder(minutes: number) {
    const dueAt = Date.now() + minutes * 60 * 1000;
    saveExactReminder(dueAt);
  }

  function snoozeHours(hours: number) {
    const dueAt = Date.now() + hours * 60 * 60 * 1000;
    saveExactReminder(dueAt);
  }

  function snoozeTonight() {
    const now = new Date();
    const tonight = new Date();

    tonight.setHours(21, 0, 0, 0);

    if (tonight.getTime() <= now.getTime()) {
      tonight.setDate(tonight.getDate() + 1);
    }

    saveExactReminder(tonight.getTime());
  }

  function snoozeTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    saveExactReminder(tomorrow.getTime());
  }

  function snoozeNextWeek() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);

    saveExactReminder(nextWeek.getTime());
  }

  function clearReminder() {
    const raw = localStorage.getItem("inbox_reminders");
    if (!raw) {
      setReminder(null);
      publishReminderMutation("inbox-reminder-cleared");
      return;
    }

    const parsed = JSON.parse(raw);
    delete parsed[threadId];

    localStorage.setItem("inbox_reminders", JSON.stringify(parsed));
    setReminder(null);
    publishReminderMutation("inbox-reminder-cleared");
  }

  const isDue = !!(reminder && Date.now() >= reminder.dueAt);
  const reminderLabel = reminder
    ? formatReminderRelative(reminder.dueAt, Date.now())
    : null;

  return (
    <div
      className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Reminder
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {!reminder ? (
          <>
            <button
              onClick={() => saveReminder(120)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Remind 2h
            </button>

            <button
              onClick={() => saveReminder(24 * 60)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tomorrow
            </button>

            <button
              onClick={() => snoozeHours(1)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Snooze 1h
            </button>

            <button
              onClick={snoozeTonight}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tonight
            </button>

            <button
              onClick={snoozeNextWeek}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Next Week
            </button>
          </>
        ) : (
          <>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                isDue
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {reminderLabel}
            </span>

            <button
              onClick={() => snoozeHours(1)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              +1h
            </button>

            <button
              onClick={snoozeTonight}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tonight
            </button>

            <button
              onClick={snoozeTomorrow}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Tomorrow 9 AM
            </button>

            <button
              onClick={snoozeNextWeek}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Next Week
            </button>

            <button
              onClick={clearReminder}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear
            </button>
          </>
        )}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {reminder ? "Local inbox reminder active" : "No reminder set"}
      </div>
    </div>
  );
}