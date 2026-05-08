export type VendorTrustSignal = {
  label: string;
  score: number;
  reason: string;
};

export function buildVendorTrustSignals(input: {
  subscriptionPlan?: string | null;

  isVerified?: boolean | null;

  responseRate?: number | null;

  completedDeals?: number | null;

  rfqResponses?: number | null;

  yearsActive?: number | null;

  boostActive?: boolean | null;
}) {
  const signals: VendorTrustSignal[] = [];

  if (input.isVerified) {
    signals.push({
      label: "Marketplace Verified",
      score: 15,
      reason: "Verified vendor profile",
    });
  }

  if ((input.responseRate || 0) >= 80) {
    signals.push({
      label: "Fast Response",
      score: 12,
      reason: "Responds quickly to RFQs",
    });
  }

  if ((input.completedDeals || 0) >= 10) {
    signals.push({
      label: "High Deal Activity",
      score: 18,
      reason: "Consistent completed marketplace deals",
    });
  }

  if ((input.rfqResponses || 0) >= 25) {
    signals.push({
      label: "RFQ Active",
      score: 10,
      reason: "Active supplier in RFQ ecosystem",
    });
  }

  if ((input.yearsActive || 0) >= 3) {
    signals.push({
      label: "Established Supplier",
      score: 14,
      reason: "Long-term marketplace activity",
    });
  }

  if (input.subscriptionPlan) {
    signals.push({
      label: `${input.subscriptionPlan} Member`,
      score: 8,
      reason: "Active marketplace subscription",
    });
  }

  if (input.boostActive) {
    signals.push({
      label: "Boost Active",
      score: 6,
      reason: "Vendor visibility boost enabled",
    });
  }

  const totalScore = signals.reduce(
    (sum, signal) => sum + signal.score,
    0
  );

  return {
    signals,
    totalScore,
  };
}