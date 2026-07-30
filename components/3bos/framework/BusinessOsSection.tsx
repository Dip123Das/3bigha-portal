import type { CSSProperties, ReactNode } from "react";
import {
  businessOsColors,
  businessOsRadius,
  businessOsShadow,
  businessOsSpacing,
} from "@/lib/design/business-os-tokens";

type BusinessOsSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function BusinessOsSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  style,
}: BusinessOsSectionProps) {
  return (
    <section
      className={className}
      style={{
        minWidth: 0,
        border: `1px solid ${businessOsColors.line}`,
        borderRadius: businessOsRadius.panel,
        background: businessOsColors.surface,
        boxShadow: businessOsShadow.card,
        padding: businessOsSpacing.lg,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: businessOsSpacing.md }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow ? (
            <div style={{ color: businessOsColors.primary, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {eyebrow}
            </div>
          ) : null}
          <h2 style={{ margin: eyebrow ? "6px 0 0" : 0, color: businessOsColors.ink, fontSize: 21, lineHeight: 1.2, fontWeight: 900 }}>
            {title}
          </h2>
          {description ? (
            <p style={{ margin: "6px 0 0", color: businessOsColors.muted, fontSize: 13, lineHeight: 1.55, fontWeight: 650 }}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div style={{ flex: "0 0 auto" }}>{action}</div> : null}
      </div>
      <div style={{ marginTop: businessOsSpacing.md }}>{children}</div>
    </section>
  );
}
