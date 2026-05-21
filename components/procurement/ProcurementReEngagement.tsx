"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readPersistentProcurementMemory,
  rankPersistentProcurementMemory,
  type PersistentProcurementMemory,
} from "@/lib/procurement/persistent-memory";

function getReEngagementSignals(
  items: PersistentProcurementMemory[]
) {
  const now = Date.now();

  return items
    .map((item) => {
      const ageHours =
        (now - Number(item.timestamp || 0)) / 36e5;

      let status = "active";
      let priority = 100;
      let action = "Continue procurement";

      if (ageHours > 6) {
        status = "cooling";
        priority -= 10;
      }

      if (ageHours > 24) {
        status = "stalled";
        priority -= 18;
        action = "Resume negotiation";
      }

      if (ageHours > 72) {
        status = "inactive";
        priority -= 25;
        action = "Restart procurement";
      }

      const query = String(item.query || "").toLowerCase();

      if (
        query.includes("cement") ||
        query.includes("steel") ||
        query.includes("rod")
      ) {
        priority += 12;
      }

      return {
        ...item,
        workflowStatus: status,
        recoveryPriority: Math.max(1, priority),
        recoveryAction: action,
      };
    })
    .sort(
      (a, b) =>
        Number((b as any).recoveryPriority || 0) -
        Number((a as any).recoveryPriority || 0)
    )
    .slice(0, 4);
}

export default function ProcurementReEngagement() {
  const [items, setItems] = useState<
    PersistentProcurementMemory[]
  >([]);

  useEffect(() => {
    const ranked = rankPersistentProcurementMemory(
      readPersistentProcurementMemory()
    );

    setItems(ranked);
  }, []);

  const workflows = useMemo(() => {
    return getReEngagementSignals(items);
  }, [items]);

  if (!workflows.length) return null;

  return (
    <div
      style={{
        border: "1px solid #fde68a",
        background:
          "linear-gradient(135deg,#fffdf5,#ffffff)",
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 1000,
          color: "#b45309",
        }}
      >
        Procurement Recovery AI
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 18,
          fontWeight: 1000,
          color: "#0f172a",
        }}
      >
        Resume unfinished procurement
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          color: "#64748b",
          fontWeight: 750,
        }}
      >
        AI detected procurement workflows that may need follow-up or continuation.
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 10,
        }}
      >
        {workflows.map((item, index) => {
          const href =
            item.href ||
            `/search?q=${encodeURIComponent(item.query)}`;

          return (
            <div
              key={`${item.query}-${index}`}
              style={{
                border: "1px solid #fde68a",
                borderRadius: 14,
                padding: 12,
                background: "#fffef7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 1000,
                      color: "#0f172a",
                    }}
                  >
                    🔄 {item.query}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: "#475569",
                      fontWeight: 800,
                    }}
                  >
                    Status: {(item as any).workflowStatus}
                    {" • "}
                    Recovery AI score:
                    {" "}
                    {(item as any).recoveryPriority}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: "#92400e",
                      fontWeight: 900,
                    }}
                  >
                    {(item as any).recoveryAction}
                  </div>
                </div>

                <Link
                  href={href}
                  className="topBtn"
                  style={{
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    padding: "8px 11px",
                  }}
                >
                  Resume →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}