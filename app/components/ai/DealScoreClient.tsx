"use client";

import { useEffect, useMemo, useState } from "react";

type DealScoreMessage = {
  role?: string;
  body?: string;
};

export default function DealScoreClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: DealScoreMessage[];
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const messageKey = useMemo(() => {
    return (initialMessages || [])
      .map((m, index) => `${index}:${m.role || ""}:${m.body || ""}`)
      .join("|");
  }, [initialMessages]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      console.log("🔥 DealScore messages:", initialMessages);
      try {
        setLoading(true);

        const safeMessages = Array.isArray(initialMessages)
          ? initialMessages
          : [];

        const res = await fetch("/api/ai/deal-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            conversationId,
            messages: safeMessages,
          }),
        });

        const json = await res.json();

        if (!alive) return;

        if (json?.ok) {
          setData(json);
        } else {
          setData({
            ok: true,
            score: 0,
            label: "Preparing",
            insight: "AI is waiting for stronger deal signals in this chat.",
            actionLabel: "Copy follow-up message",
            actionMessage:
              "Hello, can you please share your best price, availability, delivery timeline, and payment terms?",
          });
        }
      } catch {
        if (!alive) return;

        setData({
          ok: true,
          score: 0,
          label: "Offline",
          insight: "AI Deal Score could not refresh right now.",
          actionLabel: "Copy follow-up message",
          actionMessage:
            "Hello, can you please share your best price, availability, delivery timeline, and payment terms?",
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    timer = setInterval(load, 5000);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [conversationId, messageKey, initialMessages.length]);

  if (!data) {
    return (
      <div
        style={{
          border: "1px solid #fecaca",
          background: "#fff1f2",
          borderRadius: 16,
          padding: 14,
          marginBottom: 16,
          fontWeight: 800,
          color: "#991b1b",
        }}
      >
        🔥 AI Deal Strength
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          {loading ? "Analyzing conversation..." : "Preparing deal score..."}
        </div>
      </div>
    );
  }

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