"use client";

import Link from "next/link";
import {
  readConversationContext,
} from "@/lib/procurement/conversation-context";

function buildSuggestions(query: string, module: string) {
  const q = String(query || "").toLowerCase();

  const suggestions: {
    label: string;
    description: string;
    href?: string;
  }[] = [];

  suggestions.push({
    label: "Ask delivery timeline",
    description: "Confirm delivery/work completion timeline before closing.",
  });

  suggestions.push({
    label: "Request GST & invoice",
    description: "Clarify billing, GST and invoice availability.",
  });

  if (
    q.includes("cement") ||
    q.includes("steel") ||
    q.includes("rod") ||
    q.includes("sand") ||
    module === "materials"
  ) {
    suggestions.push({
      label: "Negotiate bulk rate",
      description: "Bulk procurement may reduce material pricing.",
    });

    suggestions.push({
      label: "Create procurement RFQ",
      description: "Convert this discussion into structured vendor comparison.",
      href: `/rfq?query=${encodeURIComponent(query)}`,
    });
  }

  if (module === "property") {
    suggestions.push({
      label: "Check ownership documents",
      description: "Verify title, mutation and legal ownership before proceeding.",
    });
  }

  if (module === "services") {
    suggestions.push({
      label: "Confirm scope of work",
      description: "Clarify exclusions, labour/material responsibility and timeline.",
    });
  }

  return suggestions.slice(0, 5);
}

export default function ProcurementActionSuggestions() {
  const context = readConversationContext();

  if (!context?.query) return null;

  const suggestions = buildSuggestions(
    context.query,
    context.module
  );

  if (!suggestions.length) return null;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0b57d0" }}>
        AI Procurement Suggestions
      </div>

      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
        Suggested next actions
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {suggestions.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#475569",
                    fontWeight: 700,
                  }}
                >
                  {item.description}
                </div>
              </div>

              {item.href ? (
                <Link
                  href={item.href}
                  className="topBtn"
                  style={{
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    padding: "8px 11px",
                  }}
                >
                  Open →
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}