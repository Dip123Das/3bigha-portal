import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Account Deletion | 3Bigha",
  description:
    "Request deletion of your 3Bigha account and learn what information is deleted or retained.",
  alternates: {
    canonical: "/delete-account",
  },
};

const requestEmail =
  "mailto:support@3bigha.com?subject=3Bigha%20account%20deletion%20request&body=I%20request%20deletion%20of%20my%203Bigha%20account.%0A%0AFull%20name%3A%0ARegistered%20email%20(if%20known)%3A%0ARegistered%20phone%20(including%20country%20code)%3A%0A%0AI%20understand%20that%203Bigha%20may%20contact%20me%20to%20verify%20ownership%20before%20processing%20this%20request.";

export default function DeleteAccountPage() {
  return (
    <main style={{ padding: "48px 16px", background: "#f8fafc" }}>
      <article style={cardStyle}>
        <p style={eyebrowStyle}>3BIGHA ACCOUNT SUPPORT</p>
        <h1 style={{ margin: "0 0 14px", fontSize: 34, lineHeight: 1.2 }}>
          Request account deletion
        </h1>
        <p style={introStyle}>
          You can request deletion without signing in to the 3Bigha website or
          app. Send us an email using the button below, or email{" "}
          <a href="mailto:support@3bigha.com">support@3bigha.com</a> from any
          email account.
        </p>

        <a href={requestEmail} style={buttonStyle}>
          Email 3Bigha to request deletion
        </a>

        <h2 style={headingStyle}>What to include</h2>
        <ol style={listStyle}>
          <li>Write “I request deletion of my 3Bigha account.”</li>
          <li>Include your name and the email address or phone number on the account.</li>
          <li>
            If you cannot access the registered email, include the registered
            phone number with its country code. We may contact you to verify
            ownership before making a permanent change.
          </li>
        </ol>
        <p style={noteStyle}>
          Do not include your password, one-time password, or identity documents
          in the first email. A request is not completed simply by opening the
          email link; you must send the email and complete any ownership check.
        </p>

        <h2 style={headingStyle}>What we delete</h2>
        <p style={bodyStyle}>
          After ownership is verified, 3Bigha’s account-deletion process
          permanently deletes the sign-in account. Database records linked to
          that account for cascading deletion are removed as part of the same
          process. A deletion request does not instantly erase information
          before the request has been reviewed and processed.
        </p>

        <h2 style={headingStyle}>What may be retained, and for how long</h2>
        <p style={bodyStyle}>
          The current restricted administrator deletion audit stores the deleted
          account ID, email address, phone number, name, deletion reason, and
          snapshots of profile, business, and authentication metadata. The
          repository currently defines no expiry or automatic purge for these
          audit records, so this information may be retained indefinitely. We
          will retain other information only where needed for legal obligations,
          security, fraud prevention, or resolving disputes, and remove or
          anonymise it when that need ends where possible.
        </p>
        <p style={bodyStyle}>
          We aim to complete verified requests within 30 calendar days. If we
          need more time or cannot delete a particular record, we will explain
          the reason by email. Any information still retained after the account
          deletion will be described in that response.
        </p>

        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          See the <a href="/privacy-policy">3Bigha Privacy Policy</a> or return
          to <a href="/">3bigha.com</a>.
        </p>
      </article>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: 24,
  padding: "32px",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  border: "1px solid #e5e7eb",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: 900,
  margin: "0 0 8px",
};

const introStyle: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.8,
  color: "#475569",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  margin: "8px 0 12px",
  padding: "13px 18px",
  borderRadius: 10,
  background: "#14532d",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
};

const headingStyle: React.CSSProperties = {
  marginTop: 26,
  marginBottom: 8,
  fontSize: 21,
  color: "#0f172a",
};

const listStyle: React.CSSProperties = {
  paddingLeft: 22,
  lineHeight: 1.8,
  color: "#334155",
};

const bodyStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.8,
};

const noteStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: "#fefce8",
  border: "1px solid #fde68a",
  color: "#713f12",
  lineHeight: 1.7,
};
