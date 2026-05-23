"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OperationalEvent } from "@/lib/operational-events/types";
import {
  clearOperationalEvents,
  getOperationalEvents,
} from "@/lib/operational-events/storage";

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

function toneStyle(tone: OperationalEvent["tone"] = "normal"): React.CSSProperties {
  if (tone === "success") return { borderColor: "#bbf7d0", background: "#f0fdf4" };
  if (tone === "warning") return { borderColor: "#fde68a", background: "#fffbeb" };
  if (tone === "danger") return { borderColor: "#fecaca", background: "#fff7f7" };
  if (tone === "info") return { borderColor: "#bfdbfe", background: "#eff6ff" };
  return { borderColor: "#e5e7eb", background: "#ffffff" };
}

export default function OperationalEventStream({
  title = "Recent activity",
  limit = 5,
}: {
  title?: string;
  limit?: number;
}) {
  const [events, setEvents] = useState<OperationalEvent[]>([]);

  useEffect(() => {
    function refresh() {
      setEvents(getOperationalEvents().slice(0, limit));
    }

    refresh();

    window.addEventListener("storage", refresh);
    window.addEventListener("operational-events-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("operational-events-updated", refresh);
    };
  }, [limit]);

  if (!events.length) return null;

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
          {title}
        </div>

        <button
          type="button"
          onClick={() => {
            clearOperationalEvents();
            setEvents([]);
          }}
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            borderRadius: 10,
            padding: "5px 9px",
            fontSize: 12,
            fontWeight: 800,
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {events.map((event) => {
          const body = (
            <div
              style={{
                border: "1px solid",
                borderRadius: 12,
                padding: 10,
                ...toneStyle(event.tone),
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", whiteSpace: "nowrap" }}>
                  {timeAgo(event.createdAt)}
                </div>
              </div>

              {event.detail ? (
                <div style={{ marginTop: 3, fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
                  {event.detail}
                </div>
              ) : null}
            </div>
          );

          return event.href ? (
            <Link key={event.id} href={event.href} style={{ textDecoration: "none" }}>
              {body}
            </Link>
          ) : (
            <div key={event.id}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
