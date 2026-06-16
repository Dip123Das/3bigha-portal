import { ImageResponse } from "next/og";

export const ogImageSize = { width: 1200, height: 630 };

export function createOgImage({
  badge,
  title,
  subtitle,
  footer,
  segment,
}: {
  badge: string;
  title: string;
  subtitle: string;
  footer: string;
  segment: string;
}) {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #7c2d12 100%)",
        color: "white",
        padding: "60px",
        fontFamily: "Arial",
      }}>
        <div style={{ width: "70%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 48, fontWeight: 900 }}>3Bigha</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#d1fae5" }}>{badge}</div>
          </div>

          <div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>{title}</div>
            <div style={{ marginTop: 20, fontSize: 30, color: "#fef3c7", fontWeight: 700, lineHeight: 1.25 }}>{subtitle}</div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: "#d1fae5" }}>
            {footer} • www.3bigha.com
          </div>
        </div>

        <div style={{ width: "30%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 265,
            height: 265,
            borderRadius: 48,
            background: "rgba(255,255,255,0.14)",
            border: "3px solid rgba(255,255,255,0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 900,
            textAlign: "center",
            lineHeight: 1.05,
            padding: 24,
          }}>
            {segment}
          </div>
        </div>
      </div>
    ),
    ogImageSize
  );
}
