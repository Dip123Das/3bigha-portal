"use client";

import React, { useEffect, useMemo, useState } from "react";
import InboxThreadCard, {
  type UnifiedInboxItem,
} from "@/app/components/inbox/InboxThreadCard";

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

function computeLivePriority(
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

  let priorityLabel: UnifiedInboxItem["priorityLabel"] = "Low";
  let priorityTone: UnifiedInboxItem["priorityTone"] = "slate";

  if (score >= 100) {
    priorityLabel = "Critical";
    priorityTone = "rose";
  } else if (score >= 70) {
    priorityLabel = "High";
    priorityTone = "amber";
  } else if (score >= 35) {
    priorityLabel = "Medium";
    priorityTone = "blue";
  }

  return {
    score,
    priorityLabel,
    priorityTone,
  };
}

export default function ThreadSectionLiveList({
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

  const rankedItems = useMemo(() => {
    if (!mounted) return items;

    const dueIds = readDueReminderIds();

    return items
      .map((item, index) => {
        const livePriority = computeLivePriority(item, dueIds);

        const mergedScore =
          typeof item.priorityScore === "number"
            ? Math.max(item.priorityScore, livePriority.score)
            : livePriority.score;

        return {
          index,
          item: {
            ...item,
            priorityScore: mergedScore,
            priorityLabel: livePriority.priorityLabel,
            priorityTone: livePriority.priorityTone,
          },
        };
      })
      .sort((a, b) => {
        const aDue = dueIds.has(a.item.id);
        const bDue = dueIds.has(b.item.id);

        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;

        const scoreDiff =
          Number(b.item.priorityScore ?? 0) - Number(a.item.priorityScore ?? 0);

        if (scoreDiff !== 0) return scoreDiff;

        const recencyDiff =
          parseMs(b.item.lastActivityAt) - parseMs(a.item.lastActivityAt);

        if (recencyDiff !== 0) return recencyDiff;

        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [items, tick, mounted]);

  return (
    <div className="grid gap-4">
      {rankedItems.map((item, index) => (
        <InboxThreadCard
          key={item.id}
          item={item}
          showAiSummary={index < 3}
        />
      ))}
    </div>
  );
}