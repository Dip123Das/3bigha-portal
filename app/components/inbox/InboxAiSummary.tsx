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

type AiState = {
  summary: string;
  aiTag: string;
  reason: string;
} | null;

export default function InboxAiSummary({
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
  const [data, setData] = useState<AiState>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const cacheKey = `ai_summary_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;

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
                summary?: string;
                aiTag?: string;
                reason?: string;
              };

              if (mounted && parsed?.summary) {
                setData({
                  summary: parsed.summary ?? "",
                  aiTag: parsed.aiTag ?? "—",
                  reason: parsed.reason ?? "",
                });
                setLoading(false);
                return;
              }
            } catch {
              // ignore bad cache
            }
          }
        }

        const res = await fetch("/api/inbox-ai", {
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
            summary: json.summary ?? "",
            aiTag: json.aiTag ?? "—",
            reason: json.reason ?? "",
          };

          setData(result);

          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          }
        }
      } catch (error) {
        console.error("AI summary failed", error);
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
    return (
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Generating GPT summary...
      </div>
    );
  }

  if (!data || !data.summary) return null;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          GPT Summary
        </span>

        {data.aiTag && data.aiTag !== "—" ? (
          <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
            {data.aiTag}
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-sm font-medium text-slate-800">
        {data.summary}
      </div>

      {data.reason ? (
        <div className="mt-1 text-xs text-slate-500">Why: {data.reason}</div>
      ) : null}
    </div>
  );
}