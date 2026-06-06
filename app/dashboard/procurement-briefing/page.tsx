"use client";

import { useEffect, useMemo, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";
import {
  calculateOperationalAttentionPriority,
  sortByOperationalAttention,
} from "@/lib/procurement/intelligence/operational-priority";

export default function ProcurementBriefingPage() {
  const [live, setLive] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [cognition, setCognition] = useState<any>(null);
  const [compactMode, setCompactMode] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      Promise.all([
        fetch("/api/ai/procurement-live-events").then((r) => r.json()),
        fetch("/api/ai/procurement-timeline").then((r) => r.json()),
        fetch("/api/ai/procurement-unified-cognition").then((r) => r.json()),
      ])
        .then(([liveData, timelineData, cognitionData]) => {
          if (!mounted) return;

          setLive(liveData);
          setTimeline(timelineData);
          setCognition(cognitionData);
        })
        .catch(() => {
          if (!mounted) return;

          setLive({ ok: false });
          setTimeline({ ok: false });
        });
    };

    load();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const liveEvents = Array.isArray(live?.events) ? live.events : [];
  const timelineSteps = Array.isArray(timeline?.steps)
    ? timeline.steps
    : [];

  function eventAttention(event: any) {
    const activityAt = event.updated_at || event.createdAt;
    const activityAgeHours = activityAt
      ? Math.max(
          0,
          Math.round((Date.now() - new Date(activityAt).getTime()) / 3600000)
        )
      : 999;

    const tone = event.priority || event.tone || "active";

    const urgency =
      tone === "critical"
        ? 20
        : tone === "high"
          ? 14
          : tone === "medium"
            ? 8
            : tone === "low"
              ? 3
              : 5;

    const operationalRisk =
      tone === "critical"
        ? 15
        : tone === "high"
          ? 10
          : tone === "medium"
            ? 5
            : 0;

    return calculateOperationalAttentionPriority({
      decay: {
        workflowAgeHours: activityAgeHours,
        hoursSinceLastActivity: activityAgeHours,
        quoteCount: Number(event.score || 0) > 0 ? 1 : 0,
      },
      momentum: {
        recentActivityCount: activityAgeHours <= 12 ? 3 : 0,
        quoteGrowth: Number(event.score || 0) > 0 ? 1 : 0,
      },
      urgency,
      operationalRisk,
      workflowHealth:
        tone === "critical"
          ? 25
          : tone === "high"
            ? 45
            : tone === "medium"
              ? 65
              : 85,
      aiConfidence: Math.min(100, Number(event.score || 0)),
      escalationSignals:
        tone === "critical" ? 2 : tone === "high" ? 1 : 0,
    });
  }

  const prioritizedLiveEvents = sortByOperationalAttention(
    liveEvents,
    eventAttention
  );

  const critical = live?.summary?.critical || 0;
  const high = live?.summary?.high || 0;
  const total = live?.summary?.total || 0;

  const briefing = useMemo(() => {
    if (critical > 0) {
      return `Critical procurement pressure detected across ${critical} workflow(s). Immediate escalation recommended.`;
    }

    if (high > 0) {
      return `${high} high-priority procurement event(s) require follow-up attention today.`;
    }

    if (total > 0) {
      return `Procurement operations are active and stable with ${total} live procurement signals monitored by AI orchestration.`;
    }

    return "No procurement activity available yet.";
  }, [critical, high, total]);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-cyan-950 to-blue-950 p-6 md:p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            AI Executive Procurement Briefing
          </div>

          <h1 className="mt-5 text-3xl md:text-5xl font-black">
            Procurement Today's Summary
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            AI-generated adaptive procurement briefing summarizing live procurement
            pressure, risks, RFQ activity, memory intelligence and timeline
            signals.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-bold text-slate-100">
            {briefing}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCompactMode((prev) => !prev)}
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
            >
              {compactMode ? "Expanded View" : "Compact View"}
            </button>

            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
              Executive Compression Active
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-6">
          <LiveProcurementRefreshBadge label="Executive briefing auto-refresh" />
        </div>

        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>

        <div className="mt-6">
          <ProcurementHeatmapIntelligence
            liveEvents={liveEvents}
            timelineSteps={timelineSteps}
          />
        </div>

        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-5">
          <Stat label="Live Events" value={live?.summary?.total || 0} />
          <Stat label="Critical" value={critical} />
          <Stat label="High" value={high} />
          <Stat label="Timeline Steps" value={timeline?.summary?.total || 0} />
          <Stat label="Memory Signals" value={live?.summary?.memory || 0} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Section title="Critical Procurement Alerts">
            {liveEvents
              .filter(
                (e: any) =>
                  e.priority === "critical" ||
                  e.tone === "critical"
              )
              .slice(0, compactMode ? 3 : 6)
              .map((event: any) => (
                <AlertCard key={event.id} event={event} attention={eventAttention(event)} />
              ))}
          </Section>

          <Section title="High Priority RFQ Pressure">
            {liveEvents
              .filter(
                (e: any) =>
                  e.priority === "high" ||
                  e.tone === "high"
              )
              .slice(0, compactMode ? 3 : 6)
              .map((event: any) => (
                <AlertCard key={event.id} event={event} attention={eventAttention(event)} />
              ))}
          </Section>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Procurement Timeline Highlights
          </h2>

          <div className="mt-6 space-y-4">
            {timelineSteps
              .slice(-(compactMode ? 5 : 10))
              .reverse()
              .map((step: any, index: number) => (
                <div
                  key={`${step.id}-${index}`}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <Tag>{step.stage}</Tag>
                    <Tag>{step.module}</Tag>
                    <Tag>
                      {String(step.eventType || "").replace(/_/g, " ")}
                    </Tag>
                  </div>

                  <div className="mt-3 text-lg font-black text-slate-950">
                    {step.title}
                  </div>

                  <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {step.description}
                  </div>

                  <div className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Score {step.score}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">
        {title}
      </h2>

      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function AlertCard({ event, attention }: { event: any; attention?: any }) {
  return (
    <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-wrap gap-2">
        <Tag>{attention?.attentionLevel || event.tone || event.priority || "active"}</Tag><Tag>{event.module || "procurement"}</Tag><Tag>attention {attention?.attentionScore ?? 0}</Tag>
      </div>

      <div className="mt-2 text-sm font-black text-slate-950">
        {event.title}
      </div>

      <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">
        {event.signal || event.description}
      </div>

      {event.action ? (
        <div className="mt-2 rounded-lg border border-white bg-white px-3 py-2 text-xs font-black text-rose-700">
          🤖 {event.action}
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
      {children}
    </span>
  );
}