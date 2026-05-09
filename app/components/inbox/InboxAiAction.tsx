"use client";

import { useEffect, useState } from "react";

type Props = {
  threadId: string;
  title: string;
  subtitle: string;
  counterpart: string;
  statusLabel: string;
  stageLabel?: string;
  module: string;
  side: string;
  unreadCount: number;
  metaLine?: string;
};

type AiActionState = {
  action: string;
  confidence: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
  schedulerDecision?: string;
  suggestedMessage?: string;
  executionReason?: string;
  nextRunWindow?: string;
} | null;

function actionClass(action?: string, priority?: string) {
  if (priority === "Critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "High") return "border-amber-200 bg-amber-50 text-amber-700";
  if (action === "Reply now") return "border-rose-200 bg-rose-50 text-rose-700";
  if (action === "Follow up") return "border-blue-200 bg-blue-50 text-blue-700";
  if (action === "Review details") return "border-amber-200 bg-amber-50 text-amber-700";
  if (action === "Monitor") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function nextRunMs(nextRunWindow?: string) {
  const now = Date.now();

  if (nextRunWindow === "now") return now;
  if (nextRunWindow === "within_1_hour") return now + 60 * 60 * 1000;
  if (nextRunWindow === "today") return now + 6 * 60 * 60 * 1000;

  return now + 24 * 60 * 60 * 1000;
}

function upsertProcurementQueue(threadId: string, data: NonNullable<AiActionState>) {
  try {
    if (!data.priority || data.priority === "Low") return;

    const raw = localStorage.getItem("procurement_scheduler_queue");
    const queue = raw ? JSON.parse(raw) : {};

    queue[threadId] = {
      threadId,
      action: data.action || "Procurement action",
      priority: data.priority,
      dueAt: nextRunMs(data.nextRunWindow),
      reason: data.executionReason || data.schedulerDecision || "AI procurement action recommended.",
      createdAt: Date.now(),
    };

    localStorage.setItem("procurement_scheduler_queue", JSON.stringify(queue));

    window.dispatchEvent(new CustomEvent("procurement-scheduler-mutated"));
  } catch {
    // ignore local queue failure
  }
}

export default function InboxAiAction({
  threadId,
  title,
  subtitle,
  counterpart,
  statusLabel,
  stageLabel,
  module,
  side,
  unreadCount,
  metaLine,
}: Props) {
  const [data, setData] = useState<AiActionState>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const cacheKey = `ai_action_v2_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;

  useEffect(() => {
    function onRefresh(ev: Event) {
      const custom = ev as CustomEvent<{ threadId?: string }>;
      if (custom.detail?.threadId === threadId) {
        setRefreshNonce((v) => v + 1);
      }
    }

    window.addEventListener("inbox-ai-refresh", onRefresh as EventListener);
    return () => {
      window.removeEventListener("inbox-ai-refresh", onRefresh as EventListener);
    };
  }, [threadId]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);

        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (mounted && parsed?.action) {
              setData(parsed);
              upsertProcurementQueue(threadId, parsed);
              setLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }

        const [basicRes, procurementRes] = await Promise.all([
          fetch("/api/inbox-ai-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              subtitle,
              counterpart,
              statusLabel,
              stageLabel,
              module,
              side,
              unreadCount,
              metaLine,
            }),
          }),
          fetch("/api/ai/procurement-auto-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              threadId,
              title,
              subtitle,
              counterpart,
              statusLabel,
              stageLabel,
              module,
              side,
              unreadCount,
              metaLine,
              lastActivityAt: null,
              messages: [{ role: side, body: `${title}. ${subtitle}. ${metaLine ?? ""}` }],
            }),
          }),
        ]);

        const basicJson = await basicRes.json().catch(() => ({}));
        const procurementJson = await procurementRes.json().catch(() => ({}));

        if (!mounted) return;

        const result = {
          action:
            procurementJson?.autoActionType === "follow_up"
              ? "Follow up"
              : procurementJson?.autoActionType === "reply"
              ? "Reply now"
              : procurementJson?.autoActionType === "payment_reminder"
              ? "Payment reminder"
              : procurementJson?.autoActionType === "escalate"
              ? "Escalate"
              : basicJson?.action ?? "Monitor",
          confidence:
            procurementJson?.priority === "Critical" || procurementJson?.priority === "High"
              ? "High"
              : basicJson?.confidence ?? "Medium",
          priority: procurementJson?.priority,
          schedulerDecision: procurementJson?.schedulerDecision,
          suggestedMessage: procurementJson?.suggestedMessage,
          executionReason: procurementJson?.executionReason,
          nextRunWindow: procurementJson?.nextRunWindow,
        };

        setData(result);
        localStorage.setItem(cacheKey, JSON.stringify(result));
        upsertProcurementQueue(threadId, result);
      } catch (error) {
        console.error("AI action failed", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [
    cacheKey,
    refreshNonce,
    threadId,
    title,
    subtitle,
    counterpart,
    statusLabel,
    stageLabel,
    module,
    side,
    unreadCount,
    metaLine,
  ]);

  if (loading) {
    return <div className="mt-2 text-xs text-slate-400">Checking procurement action...</div>;
  }

  if (!data?.action) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
          AI Auto-Action
        </span>

        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionClass(
            data.action,
            data.priority
          )}`}
        >
          {data.action}
        </span>

        {data.priority ? (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionClass(
              data.action,
              data.priority
            )}`}
          >
            Priority: {data.priority}
          </span>
        ) : null}

        {data.confidence ? (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Confidence: {data.confidence}
          </span>
        ) : null}
      </div>

      {data.schedulerDecision ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
          Scheduler: {data.schedulerDecision}
        </div>
      ) : null}

      {data.executionReason ? (
        <div className="text-xs font-medium leading-5 text-slate-500">
          Why: {data.executionReason}
        </div>
      ) : null}
    </div>
  );
}