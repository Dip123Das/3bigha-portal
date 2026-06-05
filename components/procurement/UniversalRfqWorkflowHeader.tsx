import {
  resolveProcurementWorkflowState,
} from "@/lib/procurement/workflow-state";

type Props = {
  rfqId?: string | null;
  rfqStatus?: string | null;
  workflowStage?: string | null;
  workflowRisk?: string | null;
  vendorCount?: number | null;
  quoteCount?: number | null;
  deliveryStatus?: string | null;
  lastActivityAt?: string | null;
};

function fmtRelativeTime(iso?: string | null) {
  if (!iso) return "Recently updated";

  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMin = Math.max(1, Math.round((now - then) / 60000));

    if (diffMin < 60) return `${diffMin}m ago`;

    const hrs = Math.round(diffMin / 60);
    if (hrs < 24) return `${hrs}h ago`;

    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "Recently updated";
  }
}

function healthColor(level: string) {
  if (level === "critical") {
    return {
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  if (level === "warning") {
    return {
      border: "1px solid #fde68a",
      background: "#fffbeb",
      color: "#92400e",
    };
  }

  if (level === "completed") {
    return {
      border: "1px solid #bbf7d0",
      background: "#ecfdf5",
      color: "#065f46",
    };
  }

  return {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
  };
}

export default function UniversalRfqWorkflowHeader({
  rfqId,
  rfqStatus,
  workflowStage,
  workflowRisk,
  vendorCount,
  quoteCount,
  deliveryStatus,
  lastActivityAt,
}: Props) {
  const workflow = resolveProcurementWorkflowState({
    rfqStatus,
    workflowStage,
    workflowRisk,
    vendorCount,
    quoteCount,
    deliveryStatus,
  });

  return (
    <div
      style={{
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#ffffff",
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Procurement Workflow
          </div>

          <div
            style={{
              marginTop: 4,
              fontWeight: 900,
              fontSize: 20,
              color: "#0f172a",
            }}
          >
            {rfqId || "RFQ Workflow"}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#475569",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {workflow.operationalMessage}
          </div>
        </div>

        <div
          style={{
            ...healthColor(workflow.health),
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {workflow.label}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 14,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            Workflow Health
          </div>

          <div
            style={{
              marginTop: 6,
              fontWeight: 900,
              fontSize: 16,
              color: "#0f172a",
            }}
          >
            {workflow.health}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 14,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            Progress
          </div>

          <div
            style={{
              marginTop: 6,
              fontWeight: 900,
              fontSize: 16,
              color: "#0f172a",
            }}
          >
            {workflow.progress}%
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 14,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            Vendors Active
          </div>

          <div
            style={{
              marginTop: 6,
              fontWeight: 900,
              fontSize: 16,
              color: "#0f172a",
            }}
          >
            {vendorCount || 0}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 14,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            Last Activity
          </div>

          <div
            style={{
              marginTop: 6,
              fontWeight: 900,
              fontSize: 16,
              color: "#0f172a",
            }}
          >
            {fmtRelativeTime(lastActivityAt)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          borderRadius: 14,
          overflow: "hidden",
          background: "#e2e8f0",
          height: 10,
        }}
      >
        <div
          style={{
            width: `${workflow.progress}%`,
            height: "100%",
            background:
              workflow.health === "critical"
                ? "#dc2626"
                : workflow.health === "warning"
                  ? "#f59e0b"
                  : "#2563eb",
            transition: "width 0.25s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: "#0f172a",
            fontSize: 14,
          }}
        >
          Next Action:
        </div>

        <div
          style={{
            color: "#334155",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {workflow.primaryAction}
        </div>
      </div>
    </div>
  );
}
