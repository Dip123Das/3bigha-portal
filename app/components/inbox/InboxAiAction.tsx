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
} | null;

function actionClass(action?: string) {
  if (action === "Reply now") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (action === "Follow up") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (action === "Review details") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (action === "Monitor") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
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

  const cacheKey = `ai_action_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;

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

        if (typeof window !== "undefined") {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached) as {
                action?: string;
                confidence?: string;
              };

              if (mounted && parsed?.action) {
                setData({
                  action: parsed.action ?? "",
                  confidence: parsed.confidence ?? "",
                });
                setLoading(false);
                return;
              }
            } catch {
              // ignore bad cache
            }
          }
        }

        const res = await fetch("/api/inbox-ai-action", {
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
        });

        const json = await res.json();

        if (!mounted) return;

        if (json?.ok) {
          const result = {
            action: json.action ?? "",
            confidence: json.confidence ?? "",
          };

          setData(result);

          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          }
        }
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
    return <div className="mt-2 text-xs text-slate-400">Checking best action...</div>;
  }

  if (!data?.action) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
        AI Action
      </span>

      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionClass(
          data.action
        )}`}
      >
        {data.action}
      </span>

      {data.confidence ? (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            data.confidence === "High"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : data.confidence === "Medium"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          Confidence: {data.confidence}
        </span>
      ) : null}
    </div>
  );
}