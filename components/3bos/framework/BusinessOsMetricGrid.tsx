import Link from "next/link";
import {
  businessOsColors,
  businessOsRadius,
  businessOsSpacing,
  businessOsTone,
} from "@/lib/design/business-os-tokens";
import type { BusinessOsMetric } from "./types";

export default function BusinessOsMetricGrid({ items }: { items: BusinessOsMetric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: businessOsSpacing.sm }}>
      {items.map((item) => {
        const tone = businessOsTone[item.tone ?? "neutral"];
        const body = (
          <>
            <div style={{ color: businessOsColors.muted, fontSize: 11, lineHeight: 1.3, fontWeight: 850 }}>{item.label}</div>
            <div style={{ marginTop: 7, color: businessOsColors.ink, fontSize: 25, lineHeight: 1, fontWeight: 950 }}>{item.value}</div>
            {item.description ? (
              <div style={{ marginTop: 6, color: tone.foreground, fontSize: 10, lineHeight: 1.35, fontWeight: 800 }}>{item.description}</div>
            ) : null}
          </>
        );
        const style = {
          minWidth: 0,
          minHeight: 92,
          padding: businessOsSpacing.md,
          border: `1px solid ${tone.border}`,
          borderRadius: businessOsRadius.card,
          background: tone.background,
          textDecoration: "none",
        };
        return item.href ? (
          <Link key={item.key} href={item.href} style={style}>{body}</Link>
        ) : (
          <div key={item.key} style={style}>{body}</div>
        );
      })}
    </div>
  );
}
