"use client";

import { useEffect, useMemo, useState } from "react";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

const fallback = {
  score: 40,
  label: "Normal Lead",
  insight:
    "Conversation started but important deal details like price, quantity, delivery and confirmation are missing.",
  actionLabel: "Ask for details",
  actionMessage:
    "Please share price, quantity, delivery location and expected delivery time.",
};

export default function DealScoreClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: DealScoreMessage[];
}) {
  const [data, setData] = useState<any>(fallback);

  const messageKey = useMemo(() => {
    return (initialMessages || [])
      .map((m, i) => `${i}:${m.role || ""}:${m.body || ""}`)
      .join("|");
  }, [initialMessages]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/ai/deal-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            conversationId,
            messages: initialMessages || [],
          }),
        });

        const json = await res.json();

        if (!alive) return;

        // 🔥 ALWAYS SET DATA (even if API imperfect)
        setData({
          ...fallback,
          ...(json || {}),
        });
      } catch {
        if (alive) setData(fallback);
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