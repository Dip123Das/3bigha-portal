"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";
import { createClient } from "@supabase/supabase-js";
import {
  calculateOperationalAttentionPriority,
  sortByOperationalAttention,
} from "@/lib/procurement/intelligence/operational-priority";

export default function ProcurementSituationRoomPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [live, setLive] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [compactMode, setCompactMode] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      Promise.all([
        fetch("/api/ai/procurement-live-events").then((r) => r.json()),
        fetch("/api/ai/procurement-timeline").then((r) => r.json()),
        fetch("/api/ai/procurement-telemetry").then((r) => r.json()),
      ])
        .then(([liveData, timelineData, telemetryData]) => {
          if (!mounted) return;

          setLive(liveData);
          setTimeline(timelineData);
          setTelemetry(telemetryData);
        })
        .catch(() => {
          if (!mounted) return;

          setLive({ ok: false });
          setTimeline({ ok: false });
        });
    };

    load();

        const realtime = supabase
      .channel("procurement-situation-room")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
        },
        () => {
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_memory_events",
        },
        () => {
          load();
        }
      )
      .subscribe();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);

      supabase.removeChannel(realtime);
    };
  }, []);

  const liveEvents = Array.isArray(live?.events) ? live.events : [];
  const timelineSteps = Array.isArray(timeline?.steps) ? timeline.steps : [];

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

  const criticalEvents = prioritizedLiveEvents.filter(
    (e: any) => e.tone === "critical" || e.priority === "critical"
  );

  const highEvents = prioritizedLiveEvents.filter(
    (e: any) => e.tone === "high" || e.priority === "high"
  );

  const executiveSummary = useMemo(() => {
    if (criticalEvents.length > 0) {
      return `${criticalEvents.length} critical procurement risk(s) require immediate escalation.`;
    }

    if (highEvents.length > 0) {
      return `${highEvents.length} high-priority procurement event(s) need follow-up.`;
    }

    return "Procurement situation is currently stable.";
  }, [criticalEvents.length, highEvents.length]);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-red-950 to-orange-950 p-6 md:p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            AI Procurement Work Updates
          </div>

          <h1 className="mt-5 text-3xl md:text-5xl font-black">
            Procurement Work Updates
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Unified command center for live procurement risks, timeline replay,
            memory events, RFQ pressure and autonomous AI action readiness.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {executiveSummary}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCompactMode((prev) => !prev)}
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
            >
              {compactMode ? "Expanded View" : "Compact View"}
            </button>

            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
              Operational Compression Active
            </div>
          </div>

        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-6">
          <LiveProcurementRefreshBadge label="Work Updates auto-refresh" />
        </div>

        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>
        <div className="mt-8">
          <ProcurementHeatmapIntelligence
            liveEvents={liveEvents}
            timelineSteps={timelineSteps}
          />
        </div>

        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          <Stat label="Live Events" value={live?.summary?.total || 0} />
          <Stat label="Critical" value={live?.summary?.critical || 0} />
          <Stat label="Timeline Steps" value={timeline?.summary?.total || 0} />
          <Stat label="Memory Signals" value={live?.summary?.memory || 0} />

          <Stat
            label="Operational Load"
            value={telemetry?.telemetry?.operationalLoad || 0}
          />

          <Stat
            label="Recovery Pressure"
            value={telemetry?.telemetry?.recoveryPressure || 0}
          />

          <Stat
            label="24h Messages"
            value={telemetry?.telemetry?.messages24h || 0}
          />

          <Stat
            label="RFQ Signals"
            value={telemetry?.telemetry?.rfqSignals24h || 0}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Critical Procurement Radar">
            {criticalEvents.length === 0 ? (
              <Empty text="No critical procurement risks detected." />
            ) : (
              criticalEvents.slice(0, compactMode ? 3 : 6).map((event: any) => (
                <EventCard key={event.id} event={event} attention={eventAttention(event)} />
              ))
            )}
          </Panel>

          <Panel title="High Priority Follow-ups">
            {highEvents.length === 0 ? (
              <Empty text="No high-priority follow-ups pending." />
            ) : (
              highEvents.slice(0, compactMode ? 3 : 6).map((event: any) => (
                <EventCard key={event.id} event={event} attention={eventAttention(event)} />
              ))
            )}
          </Panel>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Live Procurement Stream">
            {prioritizedLiveEvents.slice(0, compactMode ? 4 : 8).map((event: any) => (
              <EventCard key={`${event.id}-${event.eventType}`} event={event} attention={eventAttention(event)} />
            ))}
          </Panel>

          <Panel title="Activity Timeline Snapshot">
            {timelineSteps.slice(-(compactMode ? 4 : 8)).reverse().map((step: any) => (
              <div
                key={`${step.id}-${step.createdAt}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge>{step.stage}</Badge>
                  <Badge>{step.module}</Badge>
                  <Badge>{String(step.eventType || "").replace(/_/g, " ")}</Badge>
                </div>

                <div className="mt-3 text-base font-black text-slate-950">
                  {step.title}
                </div>

                <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  {step.description}
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            AI Command Actions
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Command href="/dashboard/procurement-live" title="Open Live Feed" />
            <Command href="/dashboard/procurement-timeline" title="Open Timeline" />
            <Command href="/dashboard/procurement-heatmap" title="Open Risk Overview" />
            <Command href="/dashboard/procurement-autonomous-tasks" title="Pending Tasks" />
            <Command href="/dashboard/procurement-mission-control" title="Work Desk" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>

      <div className="mt-4 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
      {children}
    </span>
  );
}

function EventCard({ event, attention }: { event: any; attention?: any }) {
  return (
    <Link
      href={event.href || "/dashboard/procurement-live"}
      className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 transition hover:bg-white"
    >
      <div className="flex flex-wrap gap-2">
        <Badge>{attention?.attentionLevel || event.tone || event.priority || "active"}</Badge>
        <Badge>{event.module || "procurement"}</Badge><Badge>attention {attention?.attentionScore ?? 0}</Badge>
      </div>

      <div className="mt-2 text-sm font-black text-slate-950">
        {event.title}
      </div>

      <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
        {event.signal || event.description || "Procurement signal detected."}
      </div>

      {event.action ? (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
          🤖 {event.action}
        </div>
      ) : null}
    </Link>
  );
}

function Command({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-black text-slate-800 transition hover:bg-white"
    >
      {title} →
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}