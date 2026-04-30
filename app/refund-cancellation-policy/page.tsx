import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | 3Bigha",
  description:
    "Refund and Cancellation Policy of 3Bigha covering subscription, future payments and platform usage terms.",
};

export default function RefundPolicyPage() {
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
          REFUND & CANCELLATION POLICY
        </p>

        <h1 style={{ fontSize: 34, marginBottom: 16 }}>
          Refund and cancellation guidelines
        </h1>

        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          Currently, 3Bigha does not process any direct payments through the
          platform. Therefore, no refunds or cancellations are applicable at
          this stage.
        </p>

        <h2 style={{ marginTop: 28 }}>Future payment services</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          Once payment features (such as subscriptions, vendor boosts or other
          services) are activated, refund and cancellation terms will be
          clearly defined and updated on this page.
        </p>

        <h2 style={{ marginTop: 28 }}>Third-party transactions</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          Any payments made directly between users (buyers and vendors) are
          outside the control of 3Bigha. Users must resolve such matters
          independently between themselves.
        </p>

        <h2 style={{ marginTop: 28 }}>Policy updates</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          This policy may be updated as payment features are introduced and
          regulatory requirements evolve. Users are advised to review this page
          periodically.
        </p>
      </section>
    </main>
  );
}