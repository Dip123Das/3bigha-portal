import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3Bigha Property Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(135deg, #064e3b 0%, #0f172a 58%, #7c2d12 100%)",
          color: "white",
          fontFamily: "Arial",
          padding: "60px",
        }}
      >
        <div
          style={{
            width: "760px",
            height: "510px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 52, fontWeight: 900 }}>3Bigha</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#d1fae5" }}>
              Property Marketplace
            </div>
          </div>

          <div>
            <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1.05 }}>
              Buy & Sell Property Across India
            </div>
            <div style={{ marginTop: 22, fontSize: 30, fontWeight: 700, color: "#fef3c7", lineHeight: 1.25 }}>
              Residential plots, land, houses and real estate listings by location.
            </div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 800, color: "#d1fae5" }}>
            Property • Land • Plot • House • www.3bigha.com
          </div>
        </div>

        <div
          style={{
            width: "320px",
            height: "510px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "40px",
          }}
        >
          <div
            style={{
              width: "270px",
              height: "270px",
              borderRadius: "48px",
              background: "rgba(255,255,255,0.16)",
              border: "3px solid rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "44px",
              fontWeight: 900,
              textAlign: "center",
              color: "white",
            }}
          >
            PROPERTY
          </div>
        </div>
      </div>
    ),
    size
  );
}
