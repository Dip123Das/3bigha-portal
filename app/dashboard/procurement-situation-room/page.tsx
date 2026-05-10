"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";

export default function ProcurementSituationRoomPage() {
  const [live, setLive] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/procurement-live-events").then((r) => r.json()),
      fetch("/api/ai/procurement-timeline").then((r) => r.json()),
    ])
      .then(([liveData, timelineData]) => {
        setLive(liveData);
        setTimeline(timelineData);
      })
      .catch(() => {
        setLive({ ok: false });
        setTimeline({ ok: false });
      });
  }, []);

  const liveEvents = Array.isArray(live?.events) ? live.events : [];
  const timelineSteps = Array.isArray(timeline?.steps) ? timeline.steps : [];

  const criticalEvents = liveEvents.filter(
    (e: any) => e.tone === "critical" || e.priority === "critical"
  );

  const highEvents = liveEvents.filter(
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
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-red-950 to-orange-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            AI Procurement Situation Room
          </div>

          <h1 className="mt-6 text-5xl font-black">
            Procurement Situation Room
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Unified command center for live procurement risks, timeline replay,
            memory events, RFQ pressure and autonomous AI action readiness.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {executiveSummary}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Live Events" value={live?.summary?.total || 0} />
          <Stat label="Critical" value={live?.summary?.critical || 0} />
          <Stat label="Timeline Steps" value={timeline?.summary?.total || 0} />
          <Stat label="Memory Signals" value={live?.summary?.memory || 0} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Critical Procurement Radar">
            {criticalEvents.length === 0 ? (
              <Empty text="No critical procurement risks detected." />
            ) : (
              criticalEvents.slice(0, 6).map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </Panel>

          <Panel title="High Priority Follow-ups">
            {highEvents.length === 0 ? (
              <Empty text="No high-priority follow-ups pending." />
            ) : (
              highEvents.slice(0, 6).map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </Panel>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Live Procurement Stream">
            {liveEvents.slice(0, 8).map((event: any) => (
              <EventCard key={`${event.id}-${event.eventType}`} event={event} />
            ))}
          </Panel>

          <Panel title="Timeline Replay Snapshot">
            {timelineSteps.slice(-8).reverse().map((step: any) => (
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

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            AI Command Actions
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Command href="/dashboard/procurement-live" title="Open Live Feed" />
            <Command href="/dashboard/procurement-timeline" title="Open Timeline" />
            <Command href="/dashboard/procurement-autonomous-tasks" title="Autonomous Tasks" />
            <Command href="/dashboard/procurement-mission-control" title="Mission Control" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
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

function EventCard({ event }: { event: any }) {
  return (
    <Link
      href={event.href || "/dashboard/procurement-live"}
      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
    >
      <div className="flex flex-wrap gap-2">
        <Badge>{event.tone || event.priority || "active"}</Badge>
        <Badge>{event.module || "procurement"}</Badge>
        <Badge>{String(event.eventType || "event").replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-3 text-base font-black text-slate-950">
        {event.title}
      </div>

      <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
        {event.signal || event.description || "Procurement signal detected."}
      </div>

      {event.action ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
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