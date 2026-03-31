"use client";

import React, { useEffect, useMemo, useState } from "react";

function readDueReminderIds(): string[] {
  try {
    const raw = localStorage.getItem("inbox_reminders");
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Record<
      string,
      { id?: string; dueAt?: number | string }
    >;

    const now = Date.now();

    return Object.entries(parsed)
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
  } catch {
    return [];
  }
}

function jumpToThreadCard(threadId: string) {
  const el = document.getElementById(`thread-card-${threadId}`);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("ring-2", "ring-rose-300");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-rose-300");
  }, 1800);

  return true;
}

export default function InboxReminderBanner() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);

    const sync = () => setTick((v) => v + 1);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "inbox_reminders") sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    window.addEventListener("inbox-reminder-set", sync);
    window.addEventListener("inbox-reminder-cleared", sync);
    window.addEventListener("inbox-reminders-mutated", sync);
    window.addEventListener("inbox-reminders-updated", sync);
    window.addEventListener("inbox-v2-reminders-updated", sync);

    const interval = window.setInterval(sync, 15000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
      window.removeEventListener("inbox-reminder-set", sync);
      window.removeEventListener("inbox-reminder-cleared", sync);
      window.removeEventListener("inbox-reminders-mutated", sync);
      window.removeEventListener("inbox-reminders-updated", sync);
      window.removeEventListener("inbox-v2-reminders-updated", sync);
      window.clearInterval(interval);
    };
  }, []);

  const dueIds = useMemo(() => {
    if (!mounted) return [];
    return readDueReminderIds();
  }, [mounted, tick]);

  if (!mounted || dueIds.length === 0) return null;

  const firstDueId = dueIds[0];

  return (
    <button
      type="button"
      onClick={() => jumpToThreadCard(firstDueId)}
      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition hover:border-rose-300 hover:bg-rose-100/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700">
          Reminder Alert
        </span>

        <span className="text-sm font-semibold text-rose-900">
          {dueIds.length === 1
            ? "1 reminder due now"
            : `${dueIds.length} reminders due now`}
        </span>
      </div>

      <div className="mt-1 text-sm text-rose-700">
        Open the related thread and use your AI action + reminder tools to continue follow-up.
      </div>
    </button>
  );
}