import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | 3Bigha",
  description:
    "Terms and Conditions governing the use of 3Bigha platform including user responsibilities, services and limitations.",
};

export default function TermsPage() {
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
          TERMS & CONDITIONS
        </p>

        <h1 style={{ fontSize: 34, marginBottom: 16 }}>
          Terms governing the use of 3Bigha
        </h1>

        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          By accessing or using 3Bigha.com, you agree to comply with these
          Terms and Conditions. If you do not agree, you should not use the
          platform.
        </p>

        <h2 style={{ marginTop: 16 }}>Platform nature</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          3Bigha is a digital platform that facilitates discovery, connection,
          communication and workflow between buyers, vendors, builders,
          service providers and investors. We do not directly sell products or
          execute transactions between users.
        </p>

        <h2 style={{ marginTop: 16 }}>User responsibilities</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "#334155" }}>
          <li>Provide accurate and truthful information</li>
          <li>Use the platform for lawful purposes only</li>
          <li>Do not misuse or attempt to disrupt platform services</li>
          <li>Respect other users and maintain professional conduct</li>
        </ul>

        <h2 style={{ marginTop: 16 }}>Vendor and listing responsibility</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          Vendors, builders and service providers are solely responsible for
          the accuracy of their listings, pricing, availability and
          commitments. 3Bigha does not guarantee the quality or completion of
          any service or transaction.
        </p>

        <h2 style={{ marginTop: 16 }}>Payments</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          Payments between users (buyers and vendors) are handled directly
          between them. 3Bigha may introduce platform-level payment systems in
          the future, subject to legal compliance and activation.
        </p>

        <h2 style={{ marginTop: 16 }}>Limitation of liability</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          3Bigha is not liable for any loss, dispute, delay, fraud or damage
          arising from interactions between users. Users are advised to verify
          details independently before making decisions.
        </p>

        <h2 style={{ marginTop: 16 }}>Changes to terms</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          These terms may be updated from time to time. Continued use of the
          platform indicates acceptance of the revised terms.
        </p>
      </section>
    </main>
  );
}