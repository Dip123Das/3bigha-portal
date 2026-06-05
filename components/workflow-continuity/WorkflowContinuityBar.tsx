"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkflowContinuityState } from "@/lib/workflow-continuity/types";
import {
  clearWorkflowContinuity,
  getWorkflowContinuity,
} from "@/lib/workflow-continuity/storage";
import {
  getWorkflowAttentionLevel,
  getWorkflowHeartbeat,
} from "@/lib/procurement/workflow-state";

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function WorkflowContinuityBar() {
  const [workflow, setWorkflow] = useState<WorkflowContinuityState | null>(null);

  useEffect(() => {
    setWorkflow(getWorkflowContinuity());

    function onStorage() {
      setWorkflow(getWorkflowContinuity());
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("workflow-continuity-updated", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("workflow-continuity-updated", onStorage);
    };
  }, []);

  if (!workflow) return null;

  const heartbeat = getWorkflowHeartbeat(workflow.updatedAt);

  const attention = getWorkflowAttentionLevel({
    updatedAt: workflow.updatedAt,
    stage: workflow.stage,
  });

  const heartbeatColor =
    heartbeat.level === "attention"
      ? "#dc2626"
      : heartbeat.level === "stale"
        ? "#d97706"
        : heartbeat.level === "watching"
          ? "#2563eb"
          : "#059669";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
            Continue where you left off • {timeAgo(workflow.updatedAt)}
          </div>

          <div
            style={{
              border: `1px solid ${heartbeatColor}22`,
              background: `${heartbeatColor}12`,
              color: heartbeatColor,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {heartbeat.label}
          </div>
        </div>

        <div style={{ marginTop: 3, fontSize: 14, fontWeight: 900, color: "#111827" }}>
          {workflow.title}
        </div>

        {workflow.summary ? (
          <div style={{ marginTop: 3, fontSize: 12, color: "#475569" }}>
            {workflow.summary}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            color: heartbeatColor,
          }}
        >
          {attention.label} • {heartbeat.detail}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href={workflow.href}
          style={{
            minHeight: 34,
            padding: "0 12px",
            borderRadius: 10,
            background: "#111827",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          {workflow.primaryActionLabel || "Continue"}
        </Link>

        <button
          type="button"
          onClick={() => {
            clearWorkflowContinuity();
            setWorkflow(null);
          }}
          style={{
            minHeight: 34,
            padding: "0 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#64748b",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
