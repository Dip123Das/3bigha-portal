"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";
import { createClient } from "@supabase/supabase-js";
import GlobalAiOperationalStatus from "@/components/ai-operational/GlobalAiOperationalStatus";
import OperationalRecoveryFeed from "@/components/ai-operational/OperationalRecoveryFeed";

type LiveEvent = {
  id: string;
  title: string;
  description?: string;
  module?: string;
  eventType?: string;
  priority?: "critical" | "high" | "medium" | "low";
  tone?: "critical" | "high" | "medium" | "active" | "closed";
  score?: number;
  signal?: string;
  action?: string;
  href?: string;
  updated_at?: string;
  createdAt?: string;
};

function toneClass(tone?: string) {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "medium") return "border-blue-200 bg-blue-50 text-blue-800";
  if (tone === "closed") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function fmt(v?: string) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export default function ProcurementLivePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [data, setData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    const load = () => {
      Promise.all([
        fetch("/api/ai/procurement-live-events").then((r) => r.json()),
        fetch("/api/ai/procurement-telemetry").then((r) => r.json()),
      ])
        .then(([liveJson, telemetryJson]) => {
          if (!mounted) return;

          setData(liveJson);
          setTelemetry(telemetryJson);
        })
        .catch(() => {
          if (mounted) setData({ ok: false });
        });
    };

    load();

        const realtime = supabase
      .channel("procurement-live-realtime")
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

  const events: LiveEvent[] = Array.isArray(data?.events) ? data.events : [];

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;

    return events.filter(
      (event) =>
        event.tone === filter ||
        event.priority === filter ||
        event.module === filter ||
        event.eventType === filter
    );
  }, [events, filter]);

  const summary = data?.summary || {};

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 space-y-4">
          <GlobalAiOperationalStatus
            battlefieldPulse="active"
            procurementPressure="attention"
            economicStress="watch"
            supplyChainRisk="stable"
            orchestrationState="loaded"
          />

          <OperationalRecoveryFeed />
        </div>
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Live Procurement Event Feed
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Procurement Live Situation Feed
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Live RFQ, chat, memory, listing-view, recommendation-click and
            procurement-risk signals flowing into one operational command stream.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveSignal || "Loading live procurement intelligence..."}
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-6 py-4 text-sm font-bold text-cyan-100">
            Realtime AI procurement telemetry stream connected to Supabase event infrastructure.
          </div>

          {data?.feedHealth ? (
            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-6 py-4 text-sm font-bold text-emerald-100">
              Feed Health: {data.feedHealth}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>

        <div className="mt-8">
          <ProcurementHeatmapIntelligence
            liveEvents={events}
            timelineSteps={[]}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4 xl:grid-cols-12">
          <Stat label="Total" value={summary.total || 0} />
          <Stat label="Critical" value={summary.critical || 0} />
          <Stat label="High" value={summary.high || 0} />
          <Stat label="Medium" value={summary.medium || 0} />
          <Stat label="Active" value={summary.active || 0} />
          <Stat label="Memory" value={summary.memory || 0} />
          <Stat label="RFQ" value={summary.rfq || 0} />
          <Stat label="Chat" value={summary.chat || 0} />

          <Stat
            label="Load"
            value={telemetry?.telemetry?.operationalLoad || 0}
          />

          <Stat
            label="Recovery"
            value={telemetry?.telemetry?.recoveryPressure || 0}
          />

          <Stat
            label="Stale"
            value={telemetry?.telemetry?.staleConversations || 0}
          />

          <Stat
            label="24h Msg"
            value={telemetry?.telemetry?.messages24h || 0}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[
            ["all", "All"],
            ["critical", "Critical"],
            ["high", "High"],
            ["medium", "Medium"],
            ["active", "Active"],
            ["rfq", "RFQ"],
            ["chat", "Chat"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-5 py-3 text-sm font-black transition ${
                filter === key
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}

          <Link
            href="/dashboard/procurement-mission-control"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Work Desk
          </Link>

          <Link
            href="/dashboard/procurement-autonomous-tasks"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Pending Tasks
          </Link>
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Live Event Stream
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Showing {filteredEvents.length} of {events.length} procurement signals.
              </p>
            </div>

            <LiveProcurementRefreshBadge label="Live feed auto-refresh" />
          </div>

          <div className="mt-6 space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm font-bold text-slate-500">
                No live procurement events found for this filter.
              </div>
            ) : (
              filteredEvents.map((event) => (
                <Link
                  key={`${event.id}-${event.eventType}`}
                  href={event.href || "/dashboard/procurement-live"}
                  className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                            event.tone
                          )}`}
                        >
                          {(event.tone || event.priority || "active").toUpperCase()}
                        </span>

                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          {event.module || "procurement"}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                          {String(event.eventType || "event").replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-3 text-lg font-black text-slate-950">
                        {event.title}
                      </div>

                      <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                        {event.description || event.signal || "Procurement event detected."}
                      </div>

                      {event.action ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                          🤖 Next action: {event.action}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-[120px] text-left md:text-right">
                      <div className="text-3xl font-black text-slate-950">
                        {event.score || 0}
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        AI Score
                      </div>
                      <div className="mt-3 text-xs font-bold text-slate-500">
                        {fmt(event.updated_at || event.createdAt)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
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