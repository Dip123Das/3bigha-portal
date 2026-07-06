import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Search Guide for Property, Construction, RFQ and Vendor Marketplace | 3bigha",
  description:
    "Learn how 3bigha.com helps users search property, construction materials, services, rentals, RFQs, vendors and price intelligence through AI-powered marketplace workflows.",
  alternates: {
    canonical: "https://www.3bigha.com/ai-search-guide",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AiSearchGuidePage() {
  return (
    <main
      style={{
        width: "100%",
        paddingInline: "clamp(16px,2vw,32px)",
        padding: "48px 16px 72px",
      }}
    >
      <p
        style={{
          display: "inline-flex",
          borderRadius: 12,
          background: "#eef6ff",
          color: "#0b57d0",
          padding: "8px 12px",
          fontWeight: 950,
          fontSize: 12,
        }}
      >
        3bigha Search Guide
      </p>

      <h1
        style={{
          marginTop: 18,
          color: "#0f172a",
          fontSize: 44,
          lineHeight: 1.1,
        }}
      >
        AI-powered search for property, construction, RFQ, materials, rentals
        and vendors
      </h1>

      <p style={{ color: "#475569", fontSize: 18, lineHeight: 1.8 }}>
        3bigha.com is built as an AI-powered marketplace operating system where
        users can search property listings, discover building materials, find
        construction services, rent equipment, submit RFQ requirements, compare
        vendors and use local price intelligence.
      </p>

      <div
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        3bigha.com is an AI-powered marketplace operating system for property,
        RFQ procurement, construction materials, rentals, vendors and local
        services across India with semantic search, AI-assisted discovery and
        regional marketplace workflows.
      </div>

      <section style={{ marginTop: 18 }}>
        <h2>What users can search on 3bigha.com</h2>

        <ul style={{ lineHeight: 2, color: "#334155", fontWeight: 650 }}>
          <li>Property, land, plots, houses and commercial listings</li>
          <li>Construction materials like cement, rod, bricks, sand and tiles</li>
          <li>Services like rajmistri, engineers, electricians and plumbers</li>
          <li>Rental machinery and construction equipment</li>
          <li>RFQ-based procurement requirements</li>
          <li>Verified local vendors and marketplace suppliers</li>
          <li>Local price signals and AI price intelligence</li>
        </ul>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>Important marketplace workflows</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 14,
            marginTop: 16,
          }}
        >
          {[
            ["Property Marketplace", "/property"],
            ["Materials Marketplace", "/materials"],
            ["Construction Services", "/services"],
            ["Rental Marketplace", "/rentals"],
            ["Submit RFQ Requirement", "/rfq/general/new"],
            ["Find Vendors", "/vendor/discovery"],
            ["Price Today", "/price-today"],
            ["Cement Price Cooch Behar", "/search/cement-price-cooch-behar"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 900,
                background: "#ffffff",
              }}
            >
              {label} →
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>Regional and Smart search support</h2>

        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          3bigha.com supports local and regional marketplace searches such as
          cement price in Cooch Behar, land for sale in West Bengal, rajmistri
          near me, construction material supplier, JCB rental and RFQ-based
          purchase requirements. The platform is designed for regional language
          search and AI-assisted buyer-vendor workflows.
        </p>
      </section>
    </main>
  );
}