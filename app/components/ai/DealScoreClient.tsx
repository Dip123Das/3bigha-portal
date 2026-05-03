"use client";

import { useEffect, useState } from "react";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

export default function DealScoreClient({
  initialMessages,
}: {
  conversationId: string;
  initialMessages: DealScoreMessage[];
}) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/deal-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: initialMessages }),
        });

        const json = await res.json();
        if (json?.ok) setData(json);
      } catch {}
    }

    load();
  }, [initialMessages]);

  if (!data) return null;

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
        {data.actionLabel}
      </button>
    </div>
  );
}
