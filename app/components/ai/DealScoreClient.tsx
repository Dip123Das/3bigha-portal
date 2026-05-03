"use client";

import { useEffect, useMemo, useState } from "react";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

const fallbackDealScore = {
  ok: true,
  score: 40,
  label: "Normal Lead",
  insight: "AI is waiting for stronger deal signals like price, quantity, location, delivery time, or confirmation.",
  actionLabel: "Copy follow-up message",
  actionMessage:
    "Hello, can you please share your required quantity, delivery location, expected delivery time, and final budget?",
};

export default function DealScoreClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: DealScoreMessage[];
}) {
  const [data, setData] = useState<any>(fallbackDealScore);

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

        const res = await fetch("/api/ai/deal-score", {
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
            ...fallbackDealScore,
            ...json,
          });
        }
      } catch {
        if (alive) setData(fallbackDealScore);
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
        border: "1px solid #fecaca",
        background: "#fff1f2",
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 900, color: "#991b1b" }}>
        🔥 AI Deal Strength
      </div>

      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
        {data.score}% {data.label}
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: "#7f1d1d" }}>
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
          background: "#dc2626",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {data.actionLabel || "Copy follow-up message"}
      </button>
    </div>
  );
}