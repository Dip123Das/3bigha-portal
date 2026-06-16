import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "3Bigha - India's Property and Construction Marketplace";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #7c2d12 100%)",
          color: "white",
          padding: "64px",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              background: "rgba(255,255,255,0.14)",
              border: "2px solid rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 46,
            }}
          >
            🏠
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-1px" }}>
              3Bigha
            </div>
            <div style={{ fontSize: 25, color: "#d1fae5", fontWeight: 700 }}>
              Property • Construction • Materials • Services • Rentals
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, maxWidth: 980 }}>
            India&apos;s Property & Construction Marketplace
          </div>
          <div style={{ fontSize: 30, color: "#fef3c7", fontWeight: 700, maxWidth: 980 }}>
            Buy property, source building materials, hire services, rent equipment and grow as a vendor.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            fontSize: 24,
            fontWeight: 800,
            color: "#ecfeff",
          }}
        >
          <span>Property</span>
          <span>•</span>
          <span>Materials</span>
          <span>•</span>
          <span>Services</span>
          <span>•</span>
          <span>Rentals</span>
          <span>•</span>
          <span>Vendor Opportunities</span>
        </div>
      </div>
    ),
    size
  );
}
