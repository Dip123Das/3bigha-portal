"use client";

import { useEffect, useMemo, useState } from "react";

type TickerEvent = {
  id?: string;
  title?: string;
  eventType?: string;
  module?: string;
  tone?: string;
  priority?: string;
  action?: string;
};

export default function ProcurementLiveTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      fetch("/api/ai/procurement-live-events")
        .then((r) => r.json())
        .then((json) => {
          if (!mounted) return;
          setEvents(Array.isArray(json?.events) ? json.events.slice(0, 12) : []);
        })
        .catch(() => {
          if (!mounted) return;
          setEvents([]);
        });
    };

    load();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const text = useMemo(() => {
    if (events.length === 0) {
      return "Procurement Workspace is monitoring live RFQs, chats, recommendations, memory events and supplier signals.";
    }

    return events
      .map((event) => {
        const level = String(event.tone || event.priority || "active").toUpperCase();
        const kind = String(event.eventType || "procurement_event").replace(/_/g, " ");
        const title = event.title || "Procurement signal";
        const action = event.action ? ` → ${event.action}` : "";

        return `${level}: ${kind} • ${title}${action}`;
      })
      .join("   •   ");
  }, [events]);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">
          LIVE AI OS
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="animate-[ticker_38s_linear_infinite] whitespace-nowrap text-sm font-bold text-slate-100">
            {text}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}