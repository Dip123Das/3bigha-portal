"use client";

import type {
  CanonicalTrustModel,
  CanonicalTrustState,
} from "@/lib/trust";

const PRESENTATION: Record<
  CanonicalTrustState,
  {
    label: string;
    border: string;
    background: string;
    color: string;
  }
> = {
  verified: {
    label: "Verified",
    border: "#86efac",
    background: "#f0fdf4",
    color: "#166534",
  },
  under_review: {
    label: "Under review",
    border: "#bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
  },
  correction_required: {
    label: "Correction required",
    border: "#fde68a",
    background: "#fffbeb",
    color: "#92400e",
  },
  in_progress: {
    label: "In progress",
    border: "#cbd5e1",
    background: "#f8fafc",
    color: "#475569",
  },
  restricted: {
    label: "Restricted",
    border: "#fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
  },
  rejected: {
    label: "Rejected",
    border: "#fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
  },
  unverified: {
    label: "Not verified",
    border: "#cbd5e1",
    background: "#f8fafc",
    color: "#475569",
  },
};

export type TrustStatusChipProps = {
  trust: CanonicalTrustModel;
  className?: string;
};

export default function TrustStatusChip({
  trust,
  className = "",
}: TrustStatusChipProps) {
  const presentation = PRESENTATION[trust.state];

  return (
    <span
      className={className}
      title={`Canonical trust state: ${presentation.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        border: `1px solid ${presentation.border}`,
        borderRadius: 999,
        background: presentation.background,
        color: presentation.color,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1.2,
      }}
    >
      {presentation.label}
    </span>
  );
}
