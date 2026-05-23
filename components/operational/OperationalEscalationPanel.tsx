"use client";

import Link from "next/link";
import type { OperationalEscalationItem } from "@/lib/operational-priority/escalation-engine";

function tone(level: OperationalEscalationItem["level"]) {
  if (level === "urgent") {
    return {
      border: "#dc2626",
      bg: "#fff5f5",
      text: "#991b1b",
      badge: "URGENT",
    };
  }

  if (level === "high") {
    return {
      border: "#f59e0b",
      bg: "#fffaf0",
      text: "#92400e",
      badge: "HIGH",
    };
  }

  if (level === "medium") {
    return {
      border: "#facc15",
      bg: "#fefce8",
      text: "#854d0e",
      badge: "MEDIUM",
    };
  }

  if (level === "low") {
    return {
      border: "#cbd5e1",
      bg: "#f8fafc",
      text: "#475569",
      badge: "LOW",
    };
  }

  return {
    border: "#bbf7d0",
    bg: "#f0fdf4",
    text: "#166534",
    badge: "STABLE",
  };
}

export default function OperationalEscalationPanel({
  title = "Operational escalation priorities",
  items = [],
}: {
  title?: string;
  items?: OperationalEscalationItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
          color: "#0f172a",
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item, idx) => {
          const styles = tone(item.level);

          const body = (
            <div
              style={{
                border: `1px solid ${styles.border}`,
                background: styles.bg,
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
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "4px 7px",
                    borderRadius: 999,
                    background: "#ffffff",
                    color: styles.text,
                    border: `1px solid ${styles.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {styles.badge}
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
