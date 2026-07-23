export type VendorProfileStrength =
  | "excellent"
  | "strong"
  | "growing"
  | "building";

export type VendorProfilePresentationInput = {
  authorityScore?: number | null;
  trustScore?: number | null;
  recommendationScore?: number | null;
  leaderboardScore?: number | null;
  reputationScore?: number | null;

  rfqActivityCount?: number | null;
  totalMatches?: number | null;
  totalConverted?: number | null;
  conversionRate?: number | null;

  isVerified?: boolean | null;
  boostActive?: boolean | null;

  categories?: string[] | null;
  services?: string[] | null;
  materials?: string[] | null;
  locations?: string[] | null;
  badges?: string[] | null;
};

export type HumanFirstBusinessSignal = {
  key: string;
  label: string;
  value: string;
  description: string;
  strength: VendorProfileStrength;
};

export type VendorProfilePresentation = {
  overall: {
    label: string;
    description: string;
    strength: VendorProfileStrength;
  };

  reputation: HumanFirstBusinessSignal;
  trust: HumanFirstBusinessSignal;
  visibility: HumanFirstBusinessSignal;
  reach: HumanFirstBusinessSignal;
  activity: HumanFirstBusinessSignal;

  customerReasons: string[];
  growthSuggestions: string[];

  detailedInsights: {
    authorityScore: number;
    trustScore: number;
    recommendationScore: number;
    leaderboardScore: number;
    reputationScore: number;
    rfqActivityCount: number;
    totalMatches: number;
    totalConverted: number;
    conversionRate: number;
  };
};

function clampScore(
  value: number | null | undefined
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value))
  );
}

function safeCount(
  value: number | null | undefined
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function uniqueStrings(
  values: string[] | null | undefined
): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === "string"
            ? value.trim()
            : ""
        )
        .filter(Boolean)
    )
  );
}

function resolveStrength(
  score: number
): VendorProfileStrength {
  if (score >= 80) return "excellent";
  if (score >= 65) return "strong";
  if (score >= 45) return "growing";

  return "building";
}

function reputationLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Growing";

  return "Building";
}

function trustLabel(score: number): string {
  if (score >= 80) return "Highly trusted";
  if (score >= 65) return "Well trusted";
  if (score >= 45) return "Trust is growing";

  return "Building customer trust";
}

function visibilityLabel(score: number): string {
  if (score >= 80) return "Easy to find";
  if (score >= 65) return "Visible to customers";
  if (score >= 45) return "Visibility is growing";

  return "Needs more visibility";
}

function reachLabel(score: number): string {
  if (score >= 80) return "Strong marketplace reach";
  if (score >= 65) return "Good local reach";
  if (score >= 45) return "Growing locally";

  return "Building local reach";
}

function activityLabel(input: {
  rfqActivityCount: number;
  totalMatches: number;
  totalConverted: number;
}): {
  value: string;
  description: string;
  strength: VendorProfileStrength;
} {
  const activityTotal =
    input.rfqActivityCount +
    input.totalMatches +
    input.totalConverted;

  if (
    input.totalConverted >= 5 ||
    activityTotal >= 20
  ) {
    return {
      value: "Very active",
      description:
        "This business is regularly receiving opportunities and completing customer work.",
      strength: "excellent",
    };
  }

  if (
    input.totalConverted >= 2 ||
    activityTotal >= 10
  ) {
    return {
      value: "Active",
      description:
        "This business is receiving customer interest and participating regularly.",
      strength: "strong",
    };
  }

  if (activityTotal > 0) {
    return {
      value: "Activity is growing",
      description:
        "This business has started receiving marketplace activity and customer interest.",
      strength: "growing",
    };
  }

  return {
    value: "Getting started",
    description:
      "This business is preparing to receive more customer opportunities.",
    strength: "building",
  };
}

export function buildHumanFirstVendorProfilePresentation(
  input: VendorProfilePresentationInput
): VendorProfilePresentation {
  const authorityScore = clampScore(
    input.authorityScore
  );

  const trustScore = clampScore(
    input.trustScore
  );

  const recommendationScore = clampScore(
    input.recommendationScore
  );

  const leaderboardScore = clampScore(
    input.leaderboardScore
  );

  const reputationScore = clampScore(
    input.reputationScore
  );

  const rfqActivityCount = safeCount(
    input.rfqActivityCount
  );

  const totalMatches = safeCount(
    input.totalMatches
  );

  const totalConverted = safeCount(
    input.totalConverted
  );

  const conversionRate = clampScore(
    input.conversionRate
  );

  const categories = uniqueStrings(
    input.categories
  );

  const services = uniqueStrings(
    input.services
  );

  const materials = uniqueStrings(
    input.materials
  );

  const locations = uniqueStrings(
    input.locations
  );

  const badges = uniqueStrings(
    input.badges
  );

  const overallScore = Math.round(
    (
      authorityScore +
      trustScore +
      recommendationScore +
      leaderboardScore +
      reputationScore
    ) / 5
  );

  const activity = activityLabel({
    rfqActivityCount,
    totalMatches,
    totalConverted,
  });

  const customerReasons: string[] = [];

  if (input.isVerified) {
    customerReasons.push(
      "Business details have been verified."
    );
  }

  if (trustScore >= 65) {
    customerReasons.push(
      "Customers can see strong trust signals."
    );
  }

  if (conversionRate >= 40) {
    customerReasons.push(
      "Customer enquiries are regularly turning into completed work."
    );
  }

  if (locations.length > 0) {
    customerReasons.push(
      `Serves ${locations.slice(0, 3).join(", ")}.`
    );
  }

  if (services.length > 0) {
    customerReasons.push(
      `Provides ${services.slice(0, 3).join(", ")}.`
    );
  }

  if (materials.length > 0) {
    customerReasons.push(
      `Supplies ${materials.slice(0, 3).join(", ")}.`
    );
  }

  for (const badge of badges.slice(0, 3)) {
    customerReasons.push(badge);
  }

  if (customerReasons.length === 0) {
    customerReasons.push(
      "Business information is available for customers to review."
    );
  }

  const growthSuggestions: string[] = [];

  if (!input.isVerified) {
    growthSuggestions.push(
      "Complete business verification to build greater customer confidence."
    );
  }

  if (recommendationScore < 65) {
    growthSuggestions.push(
      "Add more products, services and service areas so nearby customers can find the business."
    );
  }

  if (reputationScore < 65) {
    growthSuggestions.push(
      "Respond to enquiries and complete more customer work to strengthen business reputation."
    );
  }

  if (categories.length === 0) {
    growthSuggestions.push(
      "Add the main business categories."
    );
  }

  if (
    services.length === 0 &&
    materials.length === 0
  ) {
    growthSuggestions.push(
      "Add the products or services offered by this business."
    );
  }

  if (locations.length === 0) {
    growthSuggestions.push(
      "Add service locations so nearby customers can discover the business."
    );
  }

  if (!input.boostActive) {
    growthSuggestions.push(
      "Increase marketplace visibility when more enquiries are needed."
    );
  }

  if (growthSuggestions.length === 0) {
    growthSuggestions.push(
      "Keep business information, prices and availability up to date."
    );
  }

  return {
    overall: {
      label: reputationLabel(overallScore),
      description:
        overallScore >= 80
          ? "This business has a strong marketplace presence and customer confidence."
          : overallScore >= 65
          ? "This business is well established and visible to customers."
          : overallScore >= 45
          ? "This business is growing its customer reach and reputation."
          : "This business is building its marketplace presence.",
      strength: resolveStrength(overallScore),
    },

    reputation: {
      key: "business-reputation",
      label: "Business Reputation",
      value: reputationLabel(reputationScore),
      description:
        reputationScore >= 65
          ? "Customer activity and completed work support this business’s reputation."
          : "More customer activity and completed work will strengthen this business’s reputation.",
      strength: resolveStrength(
        reputationScore
      ),
    },

    trust: {
      key: "customer-trust",
      label: "Customer Trust",
      value: trustLabel(trustScore),
      description:
        trustScore >= 65
          ? "Customers can see useful reasons to feel confident about this business."
          : "Completing verification and responding consistently will build greater customer confidence.",
      strength: resolveStrength(trustScore),
    },

    visibility: {
      key: "marketplace-visibility",
      label: "Marketplace Visibility",
      value: visibilityLabel(
        recommendationScore
      ),
      description:
        recommendationScore >= 65
          ? "This business can be discovered through relevant products, services and locations."
          : "Adding complete business information will help more nearby customers discover it.",
      strength: resolveStrength(
        recommendationScore
      ),
    },

    reach: {
      key: "business-reach",
      label: "Business Reach",
      value: reachLabel(leaderboardScore),
      description:
        leaderboardScore >= 65
          ? "The business has a meaningful presence in its marketplace."
          : "More customer activity and updated offerings will improve marketplace reach.",
      strength: resolveStrength(
        leaderboardScore
      ),
    },

    activity: {
      key: "business-activity",
      label: "Business Activity",
      value: activity.value,
      description: activity.description,
      strength: activity.strength,
    },

    customerReasons: Array.from(
      new Set(customerReasons)
    ).slice(0, 8),

    growthSuggestions: Array.from(
      new Set(growthSuggestions)
    ).slice(0, 6),

    detailedInsights: {
      authorityScore,
      trustScore,
      recommendationScore,
      leaderboardScore,
      reputationScore,
      rfqActivityCount,
      totalMatches,
      totalConverted,
      conversionRate,
    },
  };
}
