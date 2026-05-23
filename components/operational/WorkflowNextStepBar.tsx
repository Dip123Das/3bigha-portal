import Link from "next/link";

type WorkflowAction = {
  label: string;
  href?: string;
  onClickLabel?: string;
  tone?: "primary" | "normal" | "warning";
};

export default function WorkflowNextStepBar({
  title = "What to do next",
  nextStep,
  actions = [],
}: {
  title?: string;
  nextStep: string;
  actions?: WorkflowAction[];
}) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>{title}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
            {nextStep}
          </div>
        </div>

        {actions.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {actions.map((action, idx) => {
              const style: React.CSSProperties = {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: action.tone === "primary" ? "#111827" : action.tone === "warning" ? "#fffbeb" : "#ffffff",
                color: action.tone === "primary" ? "#ffffff" : action.tone === "warning" ? "#92400e" : "#111827",
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
              };

              return action.href ? (
                <Link key={idx} href={action.href} style={style}>
                  {action.label}
                </Link>
              ) : (
                <span key={idx} style={style}>
                  {action.onClickLabel || action.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
