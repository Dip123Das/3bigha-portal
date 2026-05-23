"use client";

import { useState } from "react";

type CopilotMessage = {
  role: "buyer" | "ai";
  body: string;
};

export default function ProcurementCopilotBox({
  defaultMessage = "",
  module = "marketplace",
  city = "",
  district = "",
  locality = "",
}: {
  defaultMessage?: string;
  module?: string;
  city?: string;
  district?: string;
  locality?: string;
}) {
  const [input, setInput] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  async function askCopilot() {
    try {
      const message = input.trim();

      if (!message) return;

      setLoading(true);

      setMessages((prev) => [
        ...prev,
        {
          role: "buyer",
          body: message,
        },
      ]);

      const res = await fetch("/api/ai/procurement-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          module,
          city,
          district,
          locality,
        }),
      });

      const json = await res.json();
      const copilot = json?.copilot;

      setLastResult(copilot || null);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          body:
            copilot?.reply ||
            "I understood your requirement. Please share quantity, location and timeline.",
        },
      ]);

      setInput("");
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          body: "AI copilot could not respond right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const extracted = lastResult?.extracted;

  return (
    <section
      style={{
        border: "1px solid #dbeafe",
        background: "#eff6ff",
        borderRadius: 20,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 950 }}>
        🤖 AI Procurement Copilot
      </div>

      <div style={{ marginTop: 6, color: "#334155", fontSize: 14 }}>
        Chat with AI to understand your requirement, draft RFQ details, and plan procurement.
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              border: "1px dashed #93c5fd",
              borderRadius: 12,
              padding: 14,
              color: "#1e3a8a",
              background: "white",
              fontSize: 14,
            }}
          >
            Example: Need 500 bags cement in Cooch Behar within 7 days.
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                justifySelf: message.role === "buyer" ? "end" : "start",
                maxWidth: "85%",
                borderRadius: 12,
                padding: 12,
                background: message.role === "buyer" ? "#2563eb" : "white",
                color: message.role === "buyer" ? "white" : "#0f172a",
                border: message.role === "buyer" ? "0" : "1px solid #bfdbfe",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {message.body}
            </div>
          ))
        )}
      </div>

      {extracted ? (
        <div
          style={{
            marginTop: 16,
            border: "1px solid #bfdbfe",
            background: "white",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            AI Extracted Procurement Details
          </div>

          <div style={{ display: "grid", gap: 6, fontSize: 14, color: "#334155" }}>
            {extracted.title ? <div><b>Title:</b> {extracted.title}</div> : null}
            {extracted.category ? <div><b>Category:</b> {extracted.category}</div> : null}
            {extracted.intent ? <div><b>Intent:</b> {extracted.intent}</div> : null}
          </div>

          {Array.isArray(extracted.items) && extracted.items.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Items</div>
              <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                {extracted.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 13,
                    }}
                  >
                    {item.item || "Item"}{" "}
                    {item.qty ? `• Qty: ${item.qty}` : ""}
                    {item.unit ? ` ${item.unit}` : ""}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {Array.isArray(lastResult?.nextQuestions) &&
          lastResult.nextQuestions.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Next Questions</div>
              <ul style={{ marginTop: 6, paddingLeft: 20, fontSize: 13 }}>
                {lastResult.nextQuestions.map((question: string) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell AI what you need..."
          rows={3}
          style={{
            flex: 1,
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: 12,
            resize: "vertical",
          }}
        />

        <button
          type="button"
          onClick={askCopilot}
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 12,
            background: loading ? "#93c5fd" : "#2563eb",
            color: "white",
            fontWeight: 900,
            padding: "0 18px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </div>
    </section>
  );
}