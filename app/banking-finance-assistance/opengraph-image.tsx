import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3Bigha Banking and Finance Assistance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #0f766e 0%, #0f172a 55%, #7c2d12 100%)", color: "white", padding: "64px", fontFamily: "Arial" }}>
        <div style={{ fontSize: 54, fontWeight: 900 }}>3Bigha Finance</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05 }}>Banking & Loan Assistance</div>
          <div style={{ fontSize: 32, color: "#fef3c7", fontWeight: 700 }}>Check loan eligibility, connect with bankers and plan property finance.</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#d1fae5" }}>Home Loan • Plot Loan • Construction Loan • www.3bigha.com</div>
      </div>
    ),
    size
  );
}
