export default function ContextualHelpPanel({
  title = "Need help?",
  summary,
  children,
  defaultOpen = false,
}: {
  title?: string;
  summary?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      style={{
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 900, color: "#111827" }}>
        {title}
      </summary>

      {summary ? (
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
          {summary}
        </div>
      ) : null}

      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </details>
  );
}
