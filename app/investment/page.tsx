import Link from "next/link";

export default function InvestmentPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>
        Investment Opportunities
      </h1>

      <p style={{ marginTop: 8, color: "#555" }}>
        Explore builder projects open for investment.
      </p>

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 800 }}>Sample Project</div>
          <div style={{ marginTop: 6 }}>Cooch Behar Residential Project</div>

          <Link
            href="/property"
            style={{
              display: "inline-block",
              marginTop: 10,
              fontWeight: 700,
              color: "#0b57d0",
            }}
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}