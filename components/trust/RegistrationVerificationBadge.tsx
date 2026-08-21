"use client";

import Link from "next/link";

import type { CanonicalTrustModel } from "@/lib/trust";

export type RegistrationVerificationBadgeProps = {
  trust: CanonicalTrustModel;
  compact?: boolean;
  showLink?: boolean;
  className?: string;
};

export default function RegistrationVerificationBadge({
  trust,
  compact = false,
  showLink = true,
  className = "",
}: RegistrationVerificationBadgeProps) {
  if (!trust.mayDisplayVerifiedBadge) {
    return null;
  }

  const content = (
    <span
      className={className}
      title="Registration verified through the canonical 3Bigha verification process."
      aria-label="3Bigha registration verified"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 5 : 7,
        padding: compact ? "4px 8px" : "6px 10px",
        border: "1px solid #86efac",
        borderRadius: 999,
        background: "#f0fdf4",
        color: "#166534",
        fontSize: compact ? 11 : 12,
        fontWeight: 900,
        lineHeight: 1.2,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">Verified</span>
      {!compact ? "3Bigha Verified" : null}
    </span>
  );

  if (
    showLink &&
    trust.certificate.active &&
    trust.certificate.verificationHref
  ) {
    return (
      <Link
        href={trust.certificate.verificationHref}
        style={{ textDecoration: "none" }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
