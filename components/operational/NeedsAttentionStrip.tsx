import Link from "next/link";

type AttentionItem = {
  label: string;
  detail?: string;
  href?: string;
  tone?: "normal" | "warning" | "danger" | "success";
};

function toneStyle(tone: AttentionItem["tone"] = "normal"): React.CSSProperties {
  if (tone === "danger") return { borderColor: "#fecaca", background: "#fff7f7", color: "#991b1b" };
  if (tone === "warning") return { borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" };
  if (tone === "success") return { borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534" };
  return { borderColor: "#e5e7eb", background: "#ffffff", color: "#111827" };
}

export default function NeedsAttentionStrip({
  title = "Needs attention",
  items = [],
}: {
  title?: string;
  items?: AttentionItem[];
}) {
  if (!items.length) return null;

  return (
    <section style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {items.map((item, idx) => {
          const body = (
            <div
              style={{
                minWidth: 220,
                border: "1px solid",
                borderRadius: 12,
                padding: 10,
                ...toneStyle(item.tone),
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13 }}>{item.label}</div>
              {item.detail ? (
                <div style={{ marginTop: 3, fontSize: 12, opacity: 0.82 }}>{item.detail}</div>
              ) : null}
            </div>
          );

          return item.href ? (
            <Link key={idx} href={item.href} style={{ textDecoration: "none" }}>
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
