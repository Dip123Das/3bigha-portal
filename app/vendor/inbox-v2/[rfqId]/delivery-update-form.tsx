"use client";

import { useState } from "react";

type Msg = { kind: "ok" | "err"; text: string } | null;

export default function DeliveryUpdateForm(props: {
  rfqId: string;
  latestQuoteId?: string | null;
}) {
  const { rfqId, latestQuoteId } = props;

  const [status, setStatus] = useState("confirmed");
  const [expectedDispatchDate, setExpectedDispatchDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function onSubmit() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/vendor/rfq/${encodeURIComponent(rfqId)}/delivery-update`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          quote_id: latestQuoteId ?? null,
          status,
          message,
          expected_dispatch_date: expectedDispatchDate || null,
          expected_delivery_date: expectedDeliveryDate || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg({ kind: "err", text: json?.error ?? "Failed to save delivery update." });
        return;
      }

      setMsg({ kind: "ok", text: "Delivery update saved successfully." });
      setMessage("");
      window.location.reload();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? "Failed to save delivery update." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <h3 style={{ margin: 0, fontWeight: 800 }}>Update Delivery Schedule</h3>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: 8, width: 220 }}
          >
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_to_dispatch">Ready to Dispatch</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
            Expected Dispatch Date
          </div>
          <input
            type="date"
            value={expectedDispatchDate}
            onChange={(e) => setExpectedDispatchDate(e.target.value)}
            style={{ padding: 8, width: 180 }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
            Expected Delivery Date
          </div>
          <input
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            style={{ padding: 8, width: 180 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Update Note</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a short update for buyer..."
          rows={4}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 10,
          }}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            fontWeight: 900,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Saving..." : "Save Delivery Update"}
        </button>

        {msg ? (
          <div style={{ color: msg.kind === "err" ? "crimson" : "green", fontWeight: 700 }}>
            {msg.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}