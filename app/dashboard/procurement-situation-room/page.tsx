"use client";

import { useEffect, useState } from "react";

type FeedEvent = {
  type: string;
  title: string;
  detail: string;
  time: string;
};

function eventClass(type?: string) {
  if (type === "critical") {
    return "border-rose-200 bg-rose-50";
  }

  if (type === "warning") {
    return "border-amber-200 bg-amber-50";
  }

  return "border-emerald-200 bg-emerald-50";
}

export default function ProcurementSituationRoomPage() {
  const [headline, setHeadline] = useState("");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch(
        "/api/ai/procurement-situation-feed",
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      if (json?.ok) {
        setHeadline(json.headline || "");
        setEvents(
          Array.isArray(json.events)
            ? json.events
            : []
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval = window.setInterval(() => {
      load();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        Loading procurement situation room...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-rose-950 p-8 text-white shadow-2xl">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-200">
          Enterprise Procurement Situation Room
        </div>

        <h1 className="mt-3 text-5xl font-black">
          Live Operational Intelligence Feed
        </h1>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-5 text-sm font-semibold text-slate-100">
          {headline}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="/dashboard/procurement-mission-control"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Open Mission Control
        </a>

        <a
          href="/dashboard/procurement-crisis-center"
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Open Crisis Center
        </a>
      </div>

      <div className="mt-8 space-y-4">
        {events.map((event, idx) => (
          <div
            key={idx}
            className={`rounded-3xl border p-6 ${eventClass(
              event.type
            )}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-lg font-black text-slate-950">
                {event.title}
              </div>

              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {event.type}
              </div>
            </div>

            <div className="mt-3 text-sm font-medium text-slate-700">
              {event.detail}
            </div>

            <div className="mt-4 text-xs font-bold text-slate-500">
              {new Date(event.time).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}