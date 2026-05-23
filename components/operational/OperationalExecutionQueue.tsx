"use client";

import Link from "next/link";
import type { WorkflowExecutionItem } from "@/lib/operational-priority/orchestration-engine";

function badge(state: WorkflowExecutionItem["state"]) {
  if (state === "execute-now") {
    return {
      label: "EXECUTE NOW",
      border: "#dc2626",
      bg: "#fff5f5",
      text: "#991b1b",
    };
  }

  if (state === "high-priority") {
    return {
      label: "HIGH PRIORITY",
      border: "#f59e0b",
      bg: "#fffaf0",
      text: "#92400e",
    };
  }

  if (state === "scheduled") {
    return {
      label: "SCHEDULED",
      border: "#facc15",
      bg: "#fefce8",
      text: "#854d0e",
    };
  }

  if (state === "blocked") {
    return {
      label: "BLOCKED",
      border: "#94a3b8",
      bg: "#f8fafc",
      text: "#475569",
    };
  }

  return {
    label: "STABLE",
    border: "#bbf7d0",
    bg: "#f0fdf4",
    text: "#166534",
  };
}

export default function OperationalExecutionQueue({
  title = "Execution sequence",
  items = [],
}: {
  title?: string;
  items?: WorkflowExecutionItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#ffffff",
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
          marginBottom: 12,
          color: "#0f172a",
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item, idx) => {
          const b = badge(item.state);

          const body = (
            <div
              style={{
                border: `1px solid ${b.border}`,
                background: b.bg,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    border: `1px solid ${b.border}`,
                    background: "#ffffff",
                    color: b.text,
                    borderRadius: 999,
                    padding: "4px 8px",
                    fontSize: 10,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.label}
                </div>
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "#475569",
                }}
              >
                {item.detail}
              </div>
            </div>
          );

          return item.href ? (
            <Link
              key={idx}
              href={item.href}
              style={{ textDecoration: "none" }}
            >
              {body}
            </Link>
          ) : (
            <div key={idx}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
