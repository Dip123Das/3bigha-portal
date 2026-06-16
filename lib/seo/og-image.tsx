import { ImageResponse } from "next/og";

type OgTheme = "green" | "blue" | "amber" | "purple" | "slate" | "teal" | "orange";

const themes: Record<OgTheme, string> = {
  green: "linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #7c2d12 100%)",
  blue: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 55%, #064e3b 100%)",
  amber: "linear-gradient(135deg, #78350f 0%, #0f172a 55%, #064e3b 100%)",
  purple: "linear-gradient(135deg, #581c87 0%, #0f172a 55%, #14532d 100%)",
  slate: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #064e3b 100%)",
  teal: "linear-gradient(135deg, #0f766e 0%, #0f172a 55%, #7c2d12 100%)",
  orange: "linear-gradient(135deg, #9a3412 0%, #0f172a 55%, #064e3b 100%)",
};

export const ogImageSize = { width: 1200, height: 630 };

export function createOgImage({
  badge,
  title,
  subtitle,
  footer,
  theme = "green",
}: {
  badge: string;
  title: string;
  subtitle: string;
  footer: string;
  theme?: OgTheme;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: themes[theme],
          color: "white",
          padding: "64px",
          fontFamily: "Arial",
        }}
      >
        <div style={{ fontSize: 50, fontWeight: 900 }}>{badge}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05, maxWidth: 980 }}>
            {title}
          </div>
          <div style={{ fontSize: 31, color: "#fef3c7", fontWeight: 700, maxWidth: 980 }}>
            {subtitle}
          </div>
        </div>

        <div style={{ fontSize: 25, fontWeight: 800, color: "#d1fae5" }}>
          {footer} • www.3bigha.com
        </div>
      </div>
    ),
    ogImageSize
  );
}
