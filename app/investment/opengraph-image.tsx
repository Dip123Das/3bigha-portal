import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3Bigha Investment Opportunities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #14532d 0%, #0f172a 55%, #581c87 100%)", color: "white", padding: "64px", fontFamily: "Arial" }}>
        <div style={{ fontSize: 54, fontWeight: 900 }}>3Bigha</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05 }}>Investment Opportunities</div>
          <div style={{ fontSize: 32, color: "#fef3c7", fontWeight: 700 }}>Discover property, construction and marketplace investment opportunities.</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#d1fae5" }}>AI-Powered Property & Construction Marketplace • www.3bigha.com</div>
      </div>
    ),
    size
  );
}
