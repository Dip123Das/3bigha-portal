"use client";

import { useState } from "react";

export default function RfqUnifiedReplyBox({
  rfqId,
  conversationId,
}: {
  rfqId: string;
  conversationId: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(
        `/api/rfq-conversations/${encodeURIComponent(rfqId)}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            body,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Failed to send message.");
        setSending(false);
        return;
      }

      setText("");
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your RFQ reply..."
        rows={4}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Reply"}
        </button>
      </div>
    </form>
  );
}