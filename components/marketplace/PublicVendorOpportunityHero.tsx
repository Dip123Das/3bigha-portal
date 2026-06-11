import Link from "next/link";

export default function PublicVendorOpportunityHero() {
  return (
    <section
      style={{
        borderRadius: 30,
        background: "linear-gradient(135deg,#064e3b,#0f766e,#1d4ed8)",
        color: "#ffffff",
        padding: "34px 22px",
        boxShadow: "0 20px 50px rgba(15,23,42,0.16)",
      }}
    >
      <div style={{ maxWidth: 920 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#bbf7d0",
          }}
        >
          AI powered 3Bigha vendor growth
        </div>

        <h1
          style={{
            marginTop: 10,
            fontSize: "clamp(32px,5vw,56px)",
            lineHeight: 1,
            fontWeight: 950,
          }}
        >
          Become a Vendor on 3Bigha
        </h1>

        <p
          style={{
            marginTop: 16,
            maxWidth: 820,
            fontSize: 16,
            lineHeight: 1.7,
            fontWeight: 700,
            color: "#e0f2fe",
          }}
        >
          Marketplace intelligence continuously identifies where buyers need more suppliers,
          contractors, service providers and equipment owners. Discover real business
          opportunities and grow with confidence.
        </p>

        <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/onboarding/business"
            style={{
              borderRadius: 999,
              background: "#ffffff",
              color: "#065f46",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 950,
              textDecoration: "none",
            }}
          >
            Become a Vendor
          </Link>

          <a
            href="#opportunities"
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.55)",
              color: "#ffffff",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 950,
              textDecoration: "none",
            }}
          >
            View Opportunities
          </a>
        </div>
      </div>
    </section>
  );
}
