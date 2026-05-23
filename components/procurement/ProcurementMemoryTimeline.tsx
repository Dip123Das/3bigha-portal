"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readPersistentProcurementMemory,
  rankPersistentProcurementMemory,
  type PersistentProcurementMemory,
} from "@/lib/procurement/persistent-memory";

function timeAgo(timestamp: number) {
  const diff = Date.now() - Number(timestamp || 0);
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function ProcurementMemoryTimeline() {
  const [items, setItems] = useState<PersistentProcurementMemory[]>([]);

  useEffect(() => {
    setItems(rankPersistentProcurementMemory(readPersistentProcurementMemory()).slice(0, 5));
  }, []);

  if (!items.length) return null;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        borderRadius: 18,
        padding: "12px",
        boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0b57d0" }}>
        Procurement Memory
      </div>

      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
        Recent procurement timeline
      </div>

      <div className="hidden md:block" style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 750 }}>
        Continue previous search, RFQ, vendor discovery or negotiation workflows.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {items.map((item, index) => {
          const href =
            item.href ||
            `/search?q=${encodeURIComponent(item.query)}${
              item.module && item.module !== "all"
                ? `&module=${encodeURIComponent(item.module)}`
                : ""
            }`;

          return (
            <Link
              key={`${item.query}-${item.module}-${item.timestamp}-${index}`}
              href={href}
              style={{
                textDecoration: "none",
                display: "grid",
                gap: 4,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: 12,
                padding: 11,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                🔎 {item.query}
              </div>

              <div style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>
                {item.module || "marketplace"} • {item.source || "workflow"} • {timeAgo(item.timestamp)}
                {" "}• AI priority {(item as any).intelligenceScore || 100}
              </div>

              {item.title ? (
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 750 }}>
                  {item.title}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}