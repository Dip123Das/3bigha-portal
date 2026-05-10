export type UserIntentSignal = {
  module?: string;
  action?: string;
  category?: string;
  type?: string;
  city?: string;
  district?: string;
  locality?: string;
  price?: number | null;
  createdAt?: string;
};

export type UserIntelligenceProfile = {
  preferredModules: string[];
  preferredLocations: string[];
  preferredCategories: string[];
  preferredTypes: string[];
  priceMin: number | null;
  priceMax: number | null;
  intentScore: number;
  intentLabel: "cold" | "warm" | "hot";
  summary: string;
};

function safe(v: unknown) {
  return String(v || "").trim();
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function topValues(values: string[], limit = 5) {
  const counts = new Map<string, number>();

  values.map(safe).filter(Boolean).forEach((v) => {
    counts.set(v, (counts.get(v) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function intentLabel(score: number): UserIntelligenceProfile["intentLabel"] {
  if (score >= 75) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export function buildUserIntelligence(
  signals: UserIntentSignal[] = []
): UserIntelligenceProfile {
  const cleanSignals = Array.isArray(signals) ? signals : [];

  const prices = cleanSignals
    .map((s) => num(s.price))
    .filter((v): v is number => v !== null && v > 0);

  const preferredModules = topValues(cleanSignals.map((s) => safe(s.module)));
  const preferredLocations = topValues(
    cleanSignals.flatMap((s) => [
      safe(s.locality),
      safe(s.city),
      safe(s.district),
    ])
  );
  const preferredCategories = topValues(
    cleanSignals.map((s) => safe(s.category))
  );
  const preferredTypes = topValues(cleanSignals.map((s) => safe(s.type)));

  const strongActions = cleanSignals.filter((s) =>
    ["rfq", "enquiry", "chat", "shortlist", "compare", "call"].includes(
      safe(s.action).toLowerCase()
    )
  ).length;

  const intentScore = Math.min(
    100,
    cleanSignals.length * 8 + strongActions * 12
  );

  const label = intentLabel(intentScore);

  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  const summary =
    label === "hot"
      ? "User is showing strong buying or procurement intent based on repeated marketplace actions."
      : label === "warm"
        ? "User is showing active discovery behavior and may need guided recommendations."
        : "User has limited activity and may need broader discovery suggestions.";

  return {
    preferredModules,
    preferredLocations,
    preferredCategories,
    preferredTypes,
    priceMin,
    priceMax,
    intentScore,
    intentLabel: label,
    summary,
  };
}

export function explainUserRecommendation(profile: UserIntelligenceProfile) {
  const location = profile.preferredLocations[0];
  const category = profile.preferredCategories[0];
  const moduleName = profile.preferredModules[0];

  return [
    moduleName ? `User often explores ${moduleName}.` : "",
    category ? `Interest appears stronger around ${category}.` : "",
    location ? `Location preference is concentrated around ${location}.` : "",
    profile.priceMin && profile.priceMax
      ? `Observed budget range is roughly ₹${profile.priceMin} to ₹${profile.priceMax}.`
      : "",
    `Intent level: ${profile.intentLabel.toUpperCase()} (${profile.intentScore}/100).`,
  ]
    .filter(Boolean)
    .join(" ");
}