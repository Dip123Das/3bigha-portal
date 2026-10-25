import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | 3Bigha",
  description:
    "Privacy Policy of 3Bigha explaining how user data is collected, used, stored and protected.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
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
          PRIVACY POLICY
        </p>

        <h1 style={{ fontSize: 34, marginBottom: 16 }}>
          Your privacy matters to us
        </h1>

        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          3Bigha respects your privacy and is committed to protecting your
          personal information. This policy explains how we collect, use and
          safeguard your data.
        </p>

        <h2 style={{ marginTop: 16 }}>Information we collect</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "#334155" }}>
          <li>Basic user information (name, email, phone number)</li>
          <li>Business details and documents (if applicable)</li>
          <li>Location data for service eligibility and local discovery</li>
          <li>Usage data to improve platform experience</li>
        </ul>

        <h2 style={{ marginTop: 16 }}>How we use your information</h2>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "#334155" }}>
          <li>To provide platform services and features</li>
          <li>To connect buyers, vendors, builders and investors</li>
          <li>To improve AI-assisted recommendations and workflows</li>
          <li>To communicate important updates and support</li>
        </ul>

        <h2 style={{ marginTop: 16 }}>Data protection</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          We implement reasonable technical and security measures to protect
          user data. However, no system is completely secure, and users are
          advised to exercise caution while sharing sensitive information.
        </p>

        <h2 style={{ marginTop: 16 }}>Third-party services</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          3Bigha may integrate with third-party services such as payment
          gateways and messaging platforms. These services operate under their
          own privacy policies.
        </p>

                <h2 style={{ marginTop: 16 }}>Account deletion and retention</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          You can request deletion without signing in by emailing{" "}
          <a href="mailto:support@3bigha.com">support@3bigha.com</a>. Include
          the name and email address or phone number on your account. We may
          verify ownership before processing the request and aim to complete
          verified requests within 30 calendar days. The sign-in account and
          database records linked to it for cascading deletion are removed by
          the account-deletion process. A restricted administrator audit
          currently retains the account ID, contact details, name, deletion
          reason, and profile, business, and authentication metadata snapshots
          without a fixed expiry. Other information may be retained where
          required for legal obligations, security, fraud prevention, or
          resolving disputes, and removed or anonymised when that need ends
          where possible. Full instructions and details are available on our{" "}
          <a href="/delete-account">account deletion page</a>.
        </p>

<h2 style={{ marginTop: 16 }}>Policy updates</h2>
        <p style={{ color: "#475569", lineHeight: 1.8 }}>
          This policy may be updated from time to time. Continued use of the
          platform implies acceptance of the latest version.
        </p>
      </section>
    </main>
  );
}
