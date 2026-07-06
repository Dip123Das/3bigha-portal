"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readConversationContext,
  type ProcurementConversationContext,
} from "@/lib/procurement/conversation-context";

function ageLabel(timestamp: number) {
  const diff = Date.now() - Number(timestamp || 0);
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function ConversationContextBanner() {
  const [context, setContext] = useState<ProcurementConversationContext | null>(null);

  useEffect(() => {
    setContext(readConversationContext());
  }, []);

  if (!context?.query) return null;

  return (
    <div
      style={{
        border: "1px solid #bfdbfe",
        background: "#ffffff",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
        Conversation Context
      </div>

      <div style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
        Continuing procurement: “{context.query}”
      </div>

      <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 800 }}>
        Source: {context.source} • {context.module || "marketplace"} • saved {ageLabel(context.timestamp)}
      </div>

      {context.title ? (
        <div style={{ marginTop: 6, color: "#334155", fontSize: 13, fontWeight: 750 }}>
          Related item: {context.title}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <Link
          href={`/rfq?query=${encodeURIComponent(context.query)}`}
          className="topBtn"
          style={{ textDecoration: "none", fontSize: 12, padding: "8px 11px" }}
        >
          Continue RFQ
        </Link>

        <Link
          href={`/vendor/discovery?q=${encodeURIComponent(context.query)}${
            context.module && context.module !== "all"
              ? `&module=${encodeURIComponent(context.module)}`
              : ""
          }`}
          className="topBtn topBtnGhost"
          style={{ textDecoration: "none", fontSize: 12, padding: "8px 11px" }}
        >
          Find vendors
        </Link>

        <Link
          href={`/price-today?q=${encodeURIComponent(context.query)}`}
          className="topBtn topBtnGhost"
          style={{ textDecoration: "none", fontSize: 12, padding: "8px 11px" }}
        >
          Check price
        </Link>
      </div>
    </div>
  );
}