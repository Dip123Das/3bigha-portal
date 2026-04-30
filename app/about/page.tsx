import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | 3Bigha",
  description:
    "3Bigha is an AI-assisted real estate and construction workflow platform for property, materials, services, rentals, RFQ, local vendors and investment opportunities.",
};

export default function AboutPage() {
  return (
    <main style={{ padding: "48px 16px", background: "#f8fafc" }}>
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 24,
          padding: "32px",
          boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <p style={{ color: "#16a34a", fontWeight: 900, marginBottom: 8 }}>
          ABOUT 3BIGHA
        </p>

        <h1 style={{ fontSize: 36, lineHeight: 1.15, marginBottom: 16 }}>
          AI-assisted real estate and construction workflow platform
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: "#475569" }}>
          3Bigha.com is being developed as a practical digital platform for
          property, building materials, construction services, rentals, RFQ,
          verified local vendors and investment opportunities. Our goal is to
          help users move from search to requirement, quotation, comparison,
          communication and decision-making through one connected workflow.
        </p>

        <h2 style={{ marginTop: 32 }}>What we do</h2>

        <ul style={{ lineHeight: 1.9, color: "#334155", paddingLeft: 22 }}>
          <li>Property listing and discovery</li>
          <li>Building material and service discovery</li>
          <li>Rental equipment and local vendor access</li>
          <li>RFQ-based quotation comparison</li>
          <li>Unified chat between buyers, vendors, builders and investors</li>
          <li>Price Today market signals and vendor price updates</li>
          <li>AI-assisted workflows for faster decision-making</li>
        </ul>

        <h2 style={{ marginTop: 32 }}>Our vision</h2>

        <p style={{ fontSize: 16, lineHeight: 1.8, color: "#475569" }}>
          We aim to build a trusted local-first platform where people can find
          genuine opportunities, compare offers, connect with verified
          businesses and complete real estate or construction-related decisions
          with greater confidence.
        </p>

        <div style={{ marginTop: 34 }}>
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#ffffff",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Contact 3Bigha
          </Link>
        </div>
      </section>
    </main>
  );
}