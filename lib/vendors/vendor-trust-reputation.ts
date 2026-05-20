export type VendorTrustReputation = {
  score: number;
  label: string;
  badges: string[];
  riskLevel: "low" | "medium" | "high";
  reason: string;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildVendorTrustReputation(input: {
  isVerified?: boolean | null;
  approvalStatus?: string | null;
  city?: string | null;
  locality?: string | null;
  district?: string | null;
  description?: string | null;
  boostPriority?: number | null;
  reputationScore?: number | null;
  leaderboardScore?: number | null;
  recommendationScore?: number | null;
  totalMatches?: number | null;
  totalSelected?: number | null;
  totalConverted?: number | null;
  readyDealSignals?: number | null;
  responseScore?: number | null;
  riskScore?: number | null;
}): VendorTrustReputation {
  let score = 45;
  const badges: string[] = [];
  const reasons: string[] = [];

  const verified =
    input.isVerified === true ||
    clean(input.approvalStatus).toLowerCase() === "approved";

  if (verified) {
    score += 14;
    badges.push("Verified Vendor");
    reasons.push("verified profile");
  }

  if (input.city || input.locality || input.district) {
    score += 8;
    badges.push("Local Presence");
    reasons.push("local business presence");
  }

  if (clean(input.description).length >= 25) {
    score += 7;
    badges.push("Complete Profile");
    reasons.push("complete profile information");
  }

  const reputationScore = Number(input.reputationScore || 0);
  if (reputationScore >= 70) {
    score += 14;
    badges.push("High Reputation");
    reasons.push("strong reputation score");
  } else if (reputationScore >= 55) {
    score += 8;
    badges.push("Good Reputation");
    reasons.push("good reputation score");
  }

  const leaderboardScore = Number(input.leaderboardScore || 0);
  if (leaderboardScore >= 75) {
    score += 8;
    badges.push("Leaderboard Performer");
  }

  const recommendationScore = Number(input.recommendationScore || 0);
  if (recommendationScore >= 75) {
    score += 8;
    badges.push("AI Recommended");
  }

  const totalMatches = Number(input.totalMatches || 0);
  const totalSelected = Number(input.totalSelected || 0);
  const totalConverted = Number(input.totalConverted || 0);

  if (totalMatches >= 10) {
    score += 6;
    badges.push("Marketplace Active");
  }

  if (totalSelected > 0 && totalMatches > 0 && totalSelected / totalMatches >= 0.25) {
    score += 7;
    badges.push("Buyer Preferred");
  }

  if (totalConverted > 0) {
    score += 8;
    badges.push("Deal Experience");
  }

  if (Number(input.readyDealSignals || 0) > 0) {
    score += 6;
    badges.push("Deal-Ready Signals");
  }

  if (Number(input.boostPriority || 0) > 0) {
    score += 3;
    badges.push("Premium Visibility");
  }

  const riskScore = Number(input.riskScore || 0);
  if (riskScore >= 70) {
    score -= 35;
  } else if (riskScore >= 45) {
    score -= 18;
  } else if (riskScore >= 25) {
    score -= 8;
  }

  const finalScore = clamp(score);

  const label =
    finalScore >= 85
      ? "AI Trusted Vendor"
      : finalScore >= 72
      ? "Strong Trust"
      : finalScore >= 58
      ? "Good Trust"
      : finalScore >= 42
      ? "Basic Trust"
      : "Needs Review";

  const riskLevel =
    riskScore >= 55 || finalScore < 42
      ? "high"
      : riskScore >= 30 || finalScore < 58
      ? "medium"
      : "low";

  return {
    score: finalScore,
    label,
    badges: Array.from(new Set(badges)).slice(0, 6),
    riskLevel,
    reason: reasons.length
      ? reasons.join(" • ")
      : "Computed from profile quality, activity, reputation and risk signals",
  };
}