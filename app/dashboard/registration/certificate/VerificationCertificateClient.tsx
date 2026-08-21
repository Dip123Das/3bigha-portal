"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Certificate = {
  id: string;
  certificate_number: string;
  verification_status: string;
  verified_at: string;
  issued_at: string;
  issuer: string;
  holder_name?: string | null;
  business_name?: string | null;
  status: string;
};

function displayDate(value: string) {
  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
      }).format(date)
    : "Unavailable";
}

export default function VerificationCertificateClient() {
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");
  const [certificate, setCertificate] =
    useState<Certificate | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/registration/certificate",
        {
          cache: "no-store",
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            "Certificate could not be loaded."
        );
      }

      setCertificate(payload.certificate || null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Certificate could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function issue() {
    setIssuing(true);
    setError("");

    try {
      const response = await fetch(
        "/api/registration/certificate",
        {
          method: "POST",
          cache: "no-store",
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            "Certificate could not be issued."
        );
      }

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Certificate could not be issued."
      );
    } finally {
      setIssuing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <p>Loading verification certificate…</p>;
  }

  if (!certificate) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Verification Certificate</h1>
        <p>
          Your registration must be verified before a
          certificate can be issued.
        </p>

        {error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : null}

        <button
          type="button"
          disabled={issuing}
          onClick={issue}
        >
          {issuing
            ? "Checking eligibility…"
            : "Issue my certificate"}
        </button>

        <div style={{ marginTop: 14 }}>
          <Link href="/dashboard/registration">
            Return to Registration Centre
          </Link>
        </div>
      </main>
    );
  }

  const publicUrl =
    `/verify/registration/${encodeURIComponent(
      certificate.certificate_number
    )}`;

  return (
    <main
      style={{
        padding: 24,
        width: "100%",
      }}
    >
      <div
        className="certificate-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <Link href="/dashboard/registration">
          Registration Centre
        </Link>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link href={publicUrl}>
            Public verification
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 42,
          border: "8px double #0f766e",
          borderRadius: 18,
          background: "white",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#0f766e",
            fontWeight: 950,
            fontSize: 15,
            letterSpacing: 1.4,
          }}
        >
          3BIGHA REGISTRATION AUTHORITY
        </div>

        <h1
          style={{
            margin: "22px 0 8px",
            fontSize: 36,
          }}
        >
          Certificate of Verification
        </h1>

        <p style={{ color: "#475569" }}>
          This certificate confirms that the registration
          named below was verified through the 3Bigha
          registration process.
        </p>

        <div
          style={{
            margin: "30px auto",
            padding: 24,
            borderTop: "1px solid #cbd5e1",
            borderBottom: "1px solid #cbd5e1",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 950,
            }}
          >
            {certificate.business_name ||
              certificate.holder_name ||
              "Verified 3Bigha Member"}
          </div>

          {certificate.business_name &&
          certificate.holder_name ? (
            <div
              style={{
                marginTop: 8,
                color: "#475569",
              }}
            >
              Represented by {certificate.holder_name}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
            textAlign: "left",
          }}
        >
          {[
            [
              "Verification ID",
              certificate.certificate_number,
            ],
            [
              "Verified on",
              displayDate(certificate.verified_at),
            ],
            [
              "Issued on",
              displayDate(certificate.issued_at),
            ],
            [
              "Certificate status",
              certificate.status.toUpperCase(),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: 14,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 850,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  marginTop: 5,
                  fontWeight: 950,
                  wordBreak: "break-word",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 30,
            color: "#475569",
            fontSize: 13,
          }}
        >
          Verification confirms the registration evidence
          reviewed by 3Bigha. It is not a government
          licence, statutory registration, financial
          guarantee, or endorsement of future performance.
        </p>
      </section>

      <style jsx global>{`
        @media print {
          header,
          nav,
          footer,
          .certificate-actions {
            display: none !important;
          }

          body {
            background: white !important;
          }

          main {
            padding: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
