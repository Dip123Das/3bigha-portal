import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3Bigha Land Area Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #365314 0%, #0f172a 55%, #7c2d12 100%)", color: "white", padding: "64px", fontFamily: "Arial" }}>
        <div style={{ fontSize: 54, fontWeight: 900 }}>3Bigha Tools</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05 }}>Land Area Calculator</div>
          <div style={{ fontSize: 32, color: "#fef3c7", fontWeight: 700 }}>Convert land area, calculate katha, bigha, acre and square feet.</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#d1fae5" }}>Land • Plot • Measurement • www.3bigha.com</div>
      </div>
    ),
    size
  );
}
