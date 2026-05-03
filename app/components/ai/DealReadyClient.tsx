"use client";

import { useEffect, useMemo, useState } from "react";

type DealReadyMessage = {
  role?: string;
  body?: string;
};

const fallbackDealReady = {
  ok: true,
  ready: false,
  confidence: 35,
  label: "Deal Not Ready",
  insight: "Final price, quantity, delivery location and confirmation should be discussed before closing.",
  actionLabel: "Ask Final Details",
  actionMessage:
    "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
};

export default function DealReadyClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: DealReadyMessage[];
}) {
  const [data, setData] = useState<any>(fallbackDealReady);

  const messageKey = useMemo(() => {
    return (initialMessages || [])
      .map((m, i) => `${i}:${m.role || ""}:${m.body || ""}`)
      .join("|");
  }, [initialMessages]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch("/api/ai/deal-ready", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            conversationId,
            messages: Array.isArray(initialMessages) ? initialMessages : [],
          }),
        });

        clearTimeout(timeout);

        const json = await res.json();

        if (!alive) return;

        if (json?.ok) {
          setData({
            ...fallbackDealReady,
            ...json,
          });
        }
      } catch {
        if (alive) setData(fallbackDealReady);
      }
    }

    load();
    const timer = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [conversationId, messageKey]);

  return (
    <div
      style={{
        border: data.ready ? "1px solid #86efac" : "1px solid #bbf7d0",
        background: data.ready ? "#ecfdf5" : "#f0fdf4",
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 900, color: "#166534" }}>
        {data.ready ? "🟢 Deal Ready" : "🟡 Deal Readiness"}
      </div>

      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
        {data.confidence}% {data.label}
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: "#166534" }}>
        {data.insight}
      </div>

      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(data.actionMessage || "")}
        style={{
          width: "100%",
          marginTop: 12,
          border: 0,
          borderRadius: 999,
          padding: "10px 14px",
          background: data.ready ? "#16a34a" : "#22c55e",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {data.actionLabel || "Confirm Deal Details"}
      </button>
    </div>
  );
}