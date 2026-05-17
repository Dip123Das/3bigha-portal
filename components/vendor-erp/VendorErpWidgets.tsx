import type { ReactNode } from "react";

export function ErpKpiCard({
  label,
  value,
  helper,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: "blue" | "green" | "orange" | "red" | "violet" | "slate";
}) {
  const tones = {
    blue: ["#eff6ff", "#bfdbfe", "#1d4ed8"],
    green: ["#ecfdf5", "#bbf7d0", "#047857"],
    orange: ["#fff7ed", "#fed7aa", "#9a3412"],
    red: ["#fef2f2", "#fecaca", "#991b1b"],
    violet: ["#f5f3ff", "#ddd6fe", "#6d28d9"],
    slate: ["#f8fafc", "#e2e8f0", "#334155"],
  } as const;

  const [bg, border, color] = tones[tone];

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 18,
        padding: 14,
        background: bg,
        minHeight: 104,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 28, lineHeight: 1, fontWeight: 1000, color: "#0f172a" }}>
        {value}
      </div>
      {helper ? (
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#64748b", lineHeight: 1.45 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export function ErpKpiGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

export function ErpActionGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

export function ErpActionCard({
  title,
  description,
  href = "#",
  tone = "blue",
}: {
  title: string;
  description: string;
  href?: string;
  tone?: "blue" | "green" | "orange" | "violet";
}) {
  const tones = {
    blue: ["#eff6ff", "#bfdbfe", "#1d4ed8"],
    green: ["#ecfdf5", "#bbf7d0", "#047857"],
    orange: ["#fff7ed", "#fed7aa", "#9a3412"],
    violet: ["#f5f3ff", "#ddd6fe", "#6d28d9"],
  } as const;

  const [bg, border, color] = tones[tone];

  return (
    <a
      href={href}
      style={{
        display: "block",
        borderRadius: 18,
        padding: 14,
        textDecoration: "none",
        border: `1px solid ${border}`,
        background: bg,
        transition: "all 0.18s ease",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 1000,
          color,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1.5,
          color: "#475569",
          fontWeight: 700,
        }}
      >
        {description}
      </div>
    </a>
  );
}

export function ErpAlertList({
  alerts,
}: {
  alerts: {
    label: string;
    tone?: "green" | "orange" | "red" | "blue" | "violet";
  }[];
}) {
  return (
    <div
      style={{
        marginTop: 14,
        display: "grid",
        gap: 10,
      }}
    >
      {alerts.map((alert, index) => {
        const toneMap = {
          green: "#047857",
          orange: "#c2410c",
          red: "#b91c1c",
          blue: "#1d4ed8",
          violet: "#6d28d9",
        } as const;

        return (
          <div
            key={`${alert.label}-${index}`}
            style={{
              borderRadius: 14,
              padding: "12px 14px",
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: toneMap[alert.tone || "blue"],
                flexShrink: 0,
              }}
            />

            <div
              style={{
                fontSize: 13,
                color: "#0f172a",
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              {alert.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ErpPanel({
  title,
  subtitle,
  tone = "blue",
  children,
}: {
  title: string;
  subtitle: string;
  tone?: "blue" | "green" | "orange" | "violet";
  children?: ReactNode;
}) {
  const tones = {
    blue: ["#eef2ff", "#c7d2fe", "#3730a3"],
    green: ["#ecfdf5", "#bbf7d0", "#064e3b"],
    orange: ["#fff7ed", "#fed7aa", "#9a3412"],
    violet: ["#f5f3ff", "#c4b5fd", "#5b21b6"],
  } as const;

  const [bg, border, color] = tones[tone];

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${border}`,
        background: `linear-gradient(135deg, ${bg}, #ffffff)`,
        boxShadow: "0 16px 38px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 950, color }}>{title}</div>
      <div style={{ marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
        {subtitle}
      </div>
      {children}
    </div>
  );
}

export function ErpActivityFeed({
  title = "ERP Operational Timeline",
  items,
}: {
  title?: string;
  items: {
    label: string;
    meta: string;
    tone?: "green" | "orange" | "red" | "blue" | "violet" | "slate";
  }[];
}) {
  const toneMap = {
    green: "#047857",
    orange: "#c2410c",
    red: "#b91c1c",
    blue: "#1d4ed8",
    violet: "#6d28d9",
    slate: "#475569",
  } as const;

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 18,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 14px",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          fontSize: 14,
          fontWeight: 1000,
          color: "#0f172a",
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid" }}>
        {items.length ? (
          items.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "14px 1fr",
                gap: 10,
                padding: "12px 14px",
                borderBottom:
                  index === items.length - 1 ? "0" : "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: toneMap[item.tone || "blue"],
                  marginTop: 4,
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.4,
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#64748b",
                  }}
                >
                  {item.meta}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: 14,
              fontSize: 13,
              fontWeight: 800,
              color: "#64748b",
            }}
          >
            No ERP activity yet.
          </div>
        )}
      </div>
    </div>
  );
}