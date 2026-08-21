"use client";

import Link from "next/link";

import type { MarketplaceIdentity } from "@/lib/trust";

import RegistrationVerificationBadge from "./RegistrationVerificationBadge";
import TrustStatusChip from "./TrustStatusChip";

export type MarketplaceIdentityHeaderProps = {
  identity: MarketplaceIdentity;
  compact?: boolean;
  showName?: boolean;
  showStatus?: boolean;
  className?: string;
};

export default function MarketplaceIdentityHeader({
  identity,
  compact = false,
  showName = true,
  showStatus = false,
  className = "",
}: MarketplaceIdentityHeaderProps) {
  const content = (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        flexWrap: "wrap",
        minWidth: 0,
      }}
    >
      {showName ? (
        <span
          style={{
            color: "#475569",
            fontSize: compact ? 12 : 13,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {identity.displayName}
        </span>
      ) : null}

      {showStatus && identity.trust ? (
        <TrustStatusChip trust={identity.trust} />
      ) : null}

      {identity.trust ? (
        <RegistrationVerificationBadge
          trust={identity.trust}
          compact={compact}
        />
      ) : null}
    </span>
  );

  if (identity.profileHref && showName) {
    return (
      <Link
        href={identity.profileHref}
        style={{
          color: "inherit",
          textDecoration: "none",
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
