import React from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        margin: "18px 0 14px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 34,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>

        {subtitle ? (
          <p style={{ margin: "10px 0 0", color: "#5b6472", maxWidth: 860 }}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
    </div>
  );
}
