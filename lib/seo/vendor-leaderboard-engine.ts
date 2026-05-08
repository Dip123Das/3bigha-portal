export type VendorLeaderboardInput = {
  vendorId: string;
  businessName: string;
  slug: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  category?: string | null;
  subscriptionPlan?: string | null;
  isVerified?: boolean | null;
  boostActive?: boolean | null;
  reputationScore?: number | null;
  authorityScore?: number | null;
  rfqActivityCount?: number | null;
  conversionRate?: number | null;
};

export type VendorLeaderboardResult = VendorLeaderboardInput & {
  leaderboardScore: number;
  rankReason: string;
  rankSignals: string[];
};

function planScore(plan?: string | null) {
  const value = String(plan || "").toLowerCase();

  if (value.includes("platinum")) return 15;
  if (value.includes("gold")) return 12;
  if (value.includes("silver")) return 9;
  if (value.includes("basic")) return 5;

  return 0;
}

export function calculateVendorLeaderboardScore(
  input: VendorLeaderboardInput
): VendorLeaderboardResult {
  const rankSignals: string[] = [];

  const reputation = Math.min(35, Math.round((input.reputationScore || 0) * 0.35));
  const authority = Math.min(25, Math.round((input.authorityScore || 0) * 0.25));
  const conversion = Math.min(15, Math.round((input.conversionRate || 0) * 0.15));
  const rfq = Math.min(10, Math.round((input.rfqActivityCount || 0) * 0.5));
  const plan = planScore(input.subscriptionPlan);
  const verified = input.isVerified ? 8 : 0;
  const boost = input.boostActive ? 5 : 0;

  if (reputation > 0) rankSignals.push("Reputation performance");
  if (authority > 0) rankSignals.push("Marketplace authority");
  if (conversion > 0) rankSignals.push("Deal conversion");
  if (rfq > 0) rankSignals.push("RFQ activity");
  if (plan > 0) rankSignals.push("Subscription strength");
  if (verified > 0) rankSignals.push("Verified profile");
  if (boost > 0) rankSignals.push("Active visibility boost");

  const leaderboardScore = Math.min(
    100,
    reputation + authority + conversion + rfq + plan + verified + boost
  );

  return {
    ...input,
    leaderboardScore,
    rankSignals,
    rankReason:
      rankSignals.length > 0
        ? `Ranked using ${rankSignals.join(", ")}.`
        : "Ranked using baseline marketplace availability.",
  };
}

export function sortVendorLeaderboard(
  vendors: VendorLeaderboardInput[]
): VendorLeaderboardResult[] {
  return vendors
    .map(calculateVendorLeaderboardScore)
    .sort((a, b) => b.leaderboardScore - a.leaderboardScore);
}