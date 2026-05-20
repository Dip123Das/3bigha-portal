"use client";

import Link from "next/link";
import type { SearchToRfqConversion } from "@/lib/search/search-to-rfq-engine";

export default function SearchToRfqConversionCard({
  conversion,
}: {
  conversion: SearchToRfqConversion;
}) {
  if (!conversion.show) return null;

  const urgencyStyle =
    conversion.urgency === "high"
      ? {
          background: "linear-gradient(135deg, #7f1d1d, #dc2626)",
          border: "1px solid #fecaca",
        }
      : conversion.urgency === "medium"
        ? {
            background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
            border: "1px solid #ddd6fe",
          }
        : {
            background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
            border: "1px solid #bfdbfe",
          };

  return (
    <div
      style={{
        ...urgencyStyle,
        color: "#ffffff",
        borderRadius: 20,
        padding: 16,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 42px rgba(15,23,42,0.16)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.72)" }}>
            Search-to-RFQ Conversion Engine
          </div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1000 }}>
            ⚡ {conversion.title}
          </div>
          <div style={{ marginTop: 6, color: "rgba(255,255,255,0.82)", fontWeight: 750, lineHeight: 1.55 }}>
            {conversion.subtitle}
          </div>
        </div>

        <div
          style={{
            borderRadius: 999,
            background: "rgba(255,255,255,0.14)",
            padding: "8px 11px",
            height: "fit-content",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          {Math.round(conversion.confidence * 100)}% RFQ fit
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {conversion.chips.map((chip) => (
          <span
            key={chip}
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "7px 10px",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {chip}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={conversion.rfqHref}
          className="topBtn"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid rgba(255,255,255,0.75)",
          }}
        >
          ⚡ Create RFQ Now
        </Link>

        <Link
          href={conversion.vendorHref}
          className="topBtn topBtnGhost"
          style={{
            textDecoration: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          🎯 Find Vendors
        </Link>

        <Link
          href={conversion.priceHref}
          className="topBtn topBtnGhost"
          style={{
            textDecoration: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          📊 Check Price
        </Link>
      </div>
    </div>
  );
}