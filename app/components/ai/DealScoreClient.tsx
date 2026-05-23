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

function normalizeMessages(rows: any[]): DealScoreMessage[] {
  return (rows || [])
    .filter((m) => {
      const isSystem =
        m?.sender_role === "system" ||
        m?.role === "system" ||
        m?.message_type === "system";
      const isDeleted = Boolean(m?.meta?.deleted);
      return !isSystem && !isDeleted;
    })
    .map((m) => ({
      role: String(m?.sender_role || m?.role || "user"),
      body: String(m?.body || m?.message || m?.content || ""),
    }))
    .filter((m) => m.body.trim().length > 0);
}

async function fetchLiveMessages(
  conversationId: string
): Promise<DealScoreMessage[]> {
  try {
    if (!conversationId) return [];

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    const rows =
      Array.isArray(json?.messages)
        ? json.messages
        : Array.isArray(json?.rows)
        ? json.rows
        : Array.isArray(json)
        ? json
        : [];

    return normalizeMessages(rows);
  } catch {
    return [];
  }
}

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
        const liveMessages = await fetchLiveMessages(conversationId);

        const messagesToSend =
          liveMessages.length > 0
            ? liveMessages
            : normalizeMessages(initialMessages || []);

        const res = await fetch("/api/ai/deal-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            conversationId,
            messages: messagesToSend,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!alive) return;

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
  }, [conversationId, messageKey, initialMessages]);

  return (
    <div
      style={{
        border: "1px solid #fecaca",
        background: "#fff1f2",
        borderRadius: 12,
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
          borderRadius: 12,
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