"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { UnifiedInboxItem } from "@/app/components/inbox/InboxThreadCard";

function readDueReminderIds(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem("inbox_reminders");
    if (!raw) return new Set();

    const parsed = JSON.parse(raw) as Record<
      string,
      { id?: string; dueAt?: number | string }
    >;

    const now = Date.now();

    const ids = Object.entries(parsed)
      .filter(([, value]) => {
        const dueAtRaw = value?.dueAt;
        const dueAt =
          typeof dueAtRaw === "number"
            ? dueAtRaw
            : typeof dueAtRaw === "string"
            ? Number(dueAtRaw)
            : NaN;

        return Number.isFinite(dueAt) && dueAt <= now;
      })
      .map(([id]) => id);

    return new Set(ids);
  } catch {
    return new Set();
  }
}

function parseMs(value?: string | null) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function computePriorityScore(
  item: UnifiedInboxItem,
  dueIds: Set<string>
) {
  let score = 0;

  if (dueIds.has(item.id)) score += 100;

  score += Math.min(item.unreadCount * 15, 45);

  if (item.module === "investment") score += 20;
  else if (item.module === "rfq") score += 12;
  else score += 6;

  const ageMs = Date.now() - parseMs(item.lastActivityAt);
  const ageHours = ageMs > 0 ? ageMs / (1000 * 60 * 60) : 0;

  if (item.unreadCount > 0 && ageHours >= 24) score += 20;
  else if (item.unreadCount > 0 && ageHours >= 6) score += 12;
  else if (item.unreadCount > 0 && ageHours >= 2) score += 8;

  if (item.automationPriority) {
    score += item.automationPriority;
  }

  return score;
}

function jumpToFirstMatch(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("ring-2", "ring-sky-300");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-sky-300");
  }, 1800);

  return true;
}

export default function InboxPrioritySummaryStrip({
  items,
}: {
  items: UnifiedInboxItem[];
}) {
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

  const summary = useMemo(() => {
    if (!mounted) {
      return {
        criticalCount: 0,
        dueCount: 0,
        highCount: 0,
        unreadTotal: items.reduce((sum, item) => sum + item.unreadCount, 0),
      };
    }

    const dueIds = readDueReminderIds();

    let criticalCount = 0;
    let highCount = 0;
    let unreadTotal = 0;

    for (const item of items) {
      unreadTotal += item.unreadCount;

      const score = computePriorityScore(item, dueIds);

      if (score >= 100) criticalCount += 1;
      else if (score >= 70) highCount += 1;
    }

    return {
      criticalCount,
      dueCount: dueIds.size,
      highCount,
      unreadTotal,
    };
  }, [items, mounted, tick]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        onClick={() =>
          jumpToFirstMatch('[data-thread-priority="Critical"]')
        }
        className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-300 hover:bg-rose-100/60"
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-rose-600">
          Critical Threads
        </div>
        <div className="mt-1 text-2xl font-semibold text-rose-900">
          {summary.criticalCount}
        </div>
        <div className="mt-1 text-xs text-rose-700">
          Immediate attention needed
        </div>
      </button>

      <button
        type="button"
        onClick={() =>
          jumpToFirstMatch('[data-thread-due="true"]')
        }
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100/60"
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-amber-600">
          Due Reminders
        </div>
        <div className="mt-1 text-2xl font-semibold text-amber-900">
          {summary.dueCount}
        </div>
        <div className="mt-1 text-xs text-amber-700">
          Reminder follow-ups due now
        </div>
      </button>

      <button
        type="button"
        onClick={() =>
          jumpToFirstMatch('[data-thread-priority="High"]')
        }
        className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100/60"
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-blue-600">
          High Priority
        </div>
        <div className="mt-1 text-2xl font-semibold text-blue-900">
          {summary.highCount}
        </div>
        <div className="mt-1 text-xs text-blue-700">
          Strong candidates for action
        </div>
      </button>

      <button
        type="button"
        onClick={() =>
          jumpToFirstMatch('[data-thread-unread="true"]')
        }
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100/60"
      >
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Total Unread
        </div>
        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {summary.unreadTotal}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          Across currently loaded threads
        </div>
      </button>
    </div>
  );
}