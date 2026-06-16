import { ImageResponse } from "next/og";

type OgTheme = "property" | "materials" | "services" | "rentals" | "investment" | "blog" | "finance" | "tools" | "market";

const themes: Record<OgTheme, string> = {
  property: "linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #7c2d12 100%)",
  materials: "linear-gradient(135deg, #9a3412 0%, #0f172a 55%, #064e3b 100%)",
  services: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 55%, #064e3b 100%)",
  rentals: "linear-gradient(135deg, #78350f 0%, #0f172a 55%, #064e3b 100%)",
  investment: "linear-gradient(135deg, #581c87 0%, #0f172a 55%, #14532d 100%)",
  blog: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #064e3b 100%)",
  finance: "linear-gradient(135deg, #0f766e 0%, #0f172a 55%, #7c2d12 100%)",
  tools: "linear-gradient(135deg, #365314 0%, #0f172a 55%, #7c2d12 100%)",
  market: "linear-gradient(135deg, #7c2d12 0%, #0f172a 55%, #064e3b 100%)",
};

export const ogImageSize = { width: 1200, height: 630 };

export function createOgImage({
  badge,
  title,
  subtitle,
  footer,
  icon,
  theme = "property",
}: {
  badge: string;
  title: string;
  subtitle: string;
  footer: string;
  icon: string;
  theme?: OgTheme;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: themes[theme],
          color: "white",
          padding: "58px",
          fontFamily: "Arial",
        }}
      >
        <div style={{ width: "68%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: 20,
                background: "rgba(255,255,255,0.14)",
                border: "2px solid rgba(255,255,255,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              🏠
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 46, fontWeight: 900 }}>3Bigha</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#d1fae5" }}>{badge}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>{title}</div>
            <div style={{ fontSize: 30, color: "#fef3c7", fontWeight: 700, lineHeight: 1.25 }}>{subtitle}</div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: "#d1fae5" }}>
            {footer} • www.3bigha.com
          </div>
        </div>

        <div style={{ width: "32%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 270,
              height: 270,
              borderRadius: 54,
              background: "rgba(255,255,255,0.14)",
              border: "3px solid rgba(255,255,255,0.24)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 128,
              boxShadow: "0 28px 80px rgba(0,0,0,0.25)",
            }}
          >
            {icon}
          </div>
        </div>
      </div>
    ),
    ogImageSize
  );
}
