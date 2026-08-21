"use client";

import Link from "next/link";

import type { CanonicalTrustModel } from "@/lib/trust";

import RegistrationVerificationBadge from "./RegistrationVerificationBadge";
import TrustStatusChip from "./TrustStatusChip";

export type TrustSummaryCardProps = {
  trust: CanonicalTrustModel;
  title?: string;
  description?: string;
};

export default function TrustSummaryCard({
  trust,
  title = "Registration trust",
  description = "This status is resolved from the canonical 3Bigha registration and verification records.",
}: TrustSummaryCardProps) {
  const visibleReasons = trust.reasons.filter(
    (item) =>
      item.code !== "professional_pending" ||
      trust.subject === "individual_professional"
  );

  return (
    <section
      style={{
        padding: 18,
        border: "1px solid #dbe3ee",
        borderRadius: 16,
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>{title}</h2>
            <TrustStatusChip trust={trust} />
            <RegistrationVerificationBadge
              trust={trust}
              compact
            />
          </div>
          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              maxWidth: 720,
            }}
          >
            {description}
          </p>
        </div>

        {trust.nextAction.href ? (
          <Link
            href={trust.nextAction.href}
            style={{
              padding: "9px 12px",
              borderRadius: 9,
              background:
                trust.isVerified ? "#166534" : "#0f766e",
              color: "white",
              textDecoration: "none",
              fontWeight: 850,
            }}
          >
            {trust.nextAction.label}
          </Link>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {[
          ["Trust level", trust.level],
          [
            "Verification score",
            trust.score === null
              ? "Not recorded"
              : `${Math.round(trust.score)}%`,
          ],
          [
            "Certificate",
            trust.certificate.active
              ? trust.certificate.certificateNumber ||
                "Active"
              : "Not active",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: 12,
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {label}
            </div>
            <div
              style={{
                marginTop: 4,
                fontWeight: 900,
                textTransform:
                  label === "Trust level"
                    ? "capitalize"
                    : undefined,
                wordBreak: "break-word",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 8,
        }}
      >
        {visibleReasons.map((item) => (
          <div
            key={item.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 10px",
              borderRadius: 9,
              background: item.satisfied
                ? "#f0fdf4"
                : "#f8fafc",
              color: item.satisfied
                ? "#166534"
                : "#475569",
              fontSize: 13,
            }}
          >
            <span aria-hidden="true">
              {item.satisfied ? "Complete" : "Pending"}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
