"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OperationalEvent } from "@/lib/operational-events/types";
import { getOperationalEvents } from "@/lib/operational-events/storage";

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function GlobalOperationalAwarenessBar() {
  const [events, setEvents] = useState<OperationalEvent[]>([]);

  useEffect(() => {
    function refresh() {
      setEvents(getOperationalEvents().slice(0, 3));
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("operational-events-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("operational-events-updated", refresh);
    };
  }, []);

  const latest = events[0];

  const summary = useMemo(() => {
    if (!events.length) return null;
    if (events.length === 1) return latest?.title || null;
    return `${events.length} recent operational updates`;
  }, [events.length, latest?.title]);

  if (!summary) return null;

  return (
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        background: "#f8fafc",
        padding: "7px 14px",
        fontSize: 12,
        color: "#334155",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 900, color: "#0f172a" }}>Operational update:</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary}
            {latest?.createdAt ? ` • ${timeAgo(latest.createdAt)}` : ""}
          </span>
        </div>

        {latest?.href ? (
          <Link
            href={latest.href}
            style={{
              fontWeight: 900,
              color: "#1d4ed8",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Open →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
