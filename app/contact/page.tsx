import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | 3Bigha",
  description:
    "Contact 3Bigha for support, business onboarding, vendor registration, RFQ, property, materials, services, rentals and investment-related queries.",
};

export default function ContactPage() {
  return (
    <main style={{ padding: "48px 16px", background: "#f8fafc" }}>
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 24,
          padding: "32px",
          boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <p style={{ color: "#16a34a", fontWeight: 900, marginBottom: 8 }}>
          CONTACT US
        </p>

        <h1 style={{ fontSize: 36, lineHeight: 1.15, marginBottom: 16 }}>
          We are here to help
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: "#475569" }}>
          For support, business onboarding, vendor registration, property,
          materials, services, rentals, RFQ or investment-related queries, you
          may contact 3Bigha through the details below.
        </p>

        <div style={{ marginTop: 28, lineHeight: 1.9, color: "#334155" }}>
          <p>
            <strong>Business Name:</strong> 3Bigha
          </p>
          <p>
            <strong>Email:</strong> support@3bigha.com
          </p>
          <p>
            <strong>Location:</strong> Cooch Behar, West Bengal, India
          </p>
          <p>
            <strong>Support Hours:</strong> Monday to Saturday, 10:00 AM to
            6:00 PM
          </p>
        </div>

        <p style={{ marginTop: 24, color: "#64748b", lineHeight: 1.7 }}>
          Note: Payment services are currently not active. Online payment
          infrastructure is being prepared and will be enabled only after
          completion of applicable legal, tax and banking formalities.
        </p>
      </section>
    </main>
  );
}