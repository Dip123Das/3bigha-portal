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
  timelineScore?: number;
  slaStatus?: string;
  followUpWindow?: string;
  nextMilestone?: string;
  deliveryRisk?: string;
  paymentRisk?: string;
  recommendedTimelineAction?: string;
} | null;

function riskClass(level?: string) {
  if (level === "High" || level === "Breached") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (level === "Medium" || level === "At risk") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

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

  const cacheKey = `ai_summary_v2_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;

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
            if (mounted && parsed?.summary) {
              setData(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }

        const [summaryRes, timelineRes] = await Promise.all([
          fetch("/api/inbox-ai", {
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
          fetch("/api/ai/procurement-timeline", {
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

        const summaryJson = await summaryRes.json().catch(() => ({}));
        const timelineJson = await timelineRes.json().catch(() => ({}));

        if (!mounted) return;

        const result = {
          summary: summaryJson?.summary ?? "",
          aiTag:
            timelineJson?.slaStatus === "Breached"
              ? "🚨 SLA Breach"
              : summaryJson?.aiTag ?? "—",
          reason: summaryJson?.reason ?? timelineJson?.recommendedTimelineAction ?? "",
          timelineScore: timelineJson?.timelineScore,
          slaStatus: timelineJson?.slaStatus,
          followUpWindow: timelineJson?.followUpWindow,
          nextMilestone: timelineJson?.nextMilestone,
          deliveryRisk: timelineJson?.deliveryRisk,
          paymentRisk: timelineJson?.paymentRisk,
          recommendedTimelineAction: timelineJson?.recommendedTimelineAction,
        };

        setData(result);
        localStorage.setItem(cacheKey, JSON.stringify(result));
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
    return (
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Generating procurement summary...
      </div>
    );
  }

  if (!data || !data.summary) return null;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          AI Procurement Summary
        </span>

        {data.aiTag && data.aiTag !== "—" ? (
          <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
            {data.aiTag}
          </span>
        ) : null}

        {typeof data.timelineScore === "number" ? (
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
            Timeline {data.timelineScore}/100
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-sm font-medium text-slate-800">
        {data.summary}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {data.slaStatus ? (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClass(
              data.slaStatus
            )}`}
          >
            SLA: {data.slaStatus}
          </span>
        ) : null}

        {data.deliveryRisk ? (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClass(
              data.deliveryRisk
            )}`}
          >
            Delivery: {data.deliveryRisk}
          </span>
        ) : null}

        {data.paymentRisk ? (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskClass(
              data.paymentRisk
            )}`}
          >
            Payment: {data.paymentRisk}
          </span>
        ) : null}

        {data.followUpWindow ? (
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
            {data.followUpWindow}
          </span>
        ) : null}
      </div>

      {data.nextMilestone ? (
        <div className="mt-2 text-xs font-semibold text-slate-600">
          Next milestone: {data.nextMilestone}
        </div>
      ) : null}

      {data.recommendedTimelineAction ? (
        <div className="mt-1 text-xs text-slate-500">
          Recommended: {data.recommendedTimelineAction}
        </div>
      ) : data.reason ? (
        <div className="mt-1 text-xs text-slate-500">Why: {data.reason}</div>
      ) : null}
    </div>
  );
}