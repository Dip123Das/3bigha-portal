import { HUMAN_IDENTITY_REGISTRY } from "./registry";
import type {
  HumanIdentityDefinition,
  HumanIdentityKey,
} from "./types";

export type LegacyIdentitySignals = {
  role?: string | null;
  portalUseReason?: string | null;
  moduleKeys?: Array<string | null | undefined>;
  natureOfBusiness?: Array<string | null | undefined>;
  businessType?: string | null;
};

export type IdentitySuggestionReason =
  | "legacy_role"
  | "portal_use_reason"
  | "module_grant"
  | "business_activity"
  | "business_type";

export type IdentitySuggestion = {
  identity: HumanIdentityDefinition;
  score: number;
  reasons: IdentitySuggestionReason[];
  ambiguous: boolean;
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeList(
  values: Array<string | null | undefined> | null | undefined
): string[] {
  return Array.from(
    new Set((values ?? []).map(normalize).filter(Boolean))
  );
}

function addSuggestion(
  map: Map<
    HumanIdentityKey,
    {
      score: number;
      reasons: Set<IdentitySuggestionReason>;
      ambiguous: boolean;
    }
  >,
  key: HumanIdentityKey,
  score: number,
  reason: IdentitySuggestionReason,
  ambiguous = false
) {
  const existing = map.get(key);

  if (existing) {
    existing.score += score;
    existing.reasons.add(reason);
    existing.ambiguous = existing.ambiguous || ambiguous;
    return;
  }

  map.set(key, {
    score,
    reasons: new Set([reason]),
    ambiguous,
  });
}

export function resolveLegacyIdentitySuggestions(
  signals: LegacyIdentitySignals
): IdentitySuggestion[] {
  const role = normalize(signals.role);
  const purpose = normalize(signals.portalUseReason);
  const businessType = normalize(signals.businessType);
  const modules = normalizeList(signals.moduleKeys);
  const activities = normalizeList(signals.natureOfBusiness);

  const suggestions = new Map<
    HumanIdentityKey,
    {
      score: number;
      reasons: Set<IdentitySuggestionReason>;
      ambiguous: boolean;
    }
  >();

  // ---------------------------------------------------------
  // Legacy role signals
  // ---------------------------------------------------------

  if (role === "buyer") {
    addSuggestion(suggestions, "customer", 100, "legacy_role");
  }

  if (role === "builder") {
    addSuggestion(suggestions, "builder", 100, "legacy_role");
  }

  if (role === "blogger") {
    addSuggestion(suggestions, "author", 100, "legacy_role");
  }

  /*
   * vendor and hub_vendor are intentionally not mapped directly.
   * They describe legacy access structure, not a respectful identity.
   */


  // ---------------------------------------------------------
  // Portal-use purpose signals
  // ---------------------------------------------------------

  if (purpose === "buy_property_or_materials") {
    addSuggestion(suggestions, "customer", 90, "portal_use_reason");
  }

  if (purpose === "sell_materials") {
    addSuggestion(
      suggestions,
      "material_business",
      90,
      "portal_use_reason"
    );
  }

  if (purpose === "provide_rentals") {
    addSuggestion(
      suggestions,
      "rental_business",
      90,
      "portal_use_reason"
    );
  }

  if (purpose === "list_property_for_sale") {
    addSuggestion(
      suggestions,
      "property_owner",
      90,
      "portal_use_reason"
    );
  }

  if (purpose === "manage_builder_projects") {
    addSuggestion(suggestions, "builder", 90, "portal_use_reason");
  }

  if (purpose === "invest_in_opportunities") {
    addSuggestion(suggestions, "investor", 90, "portal_use_reason");
  }

  if (purpose === "publish_blog_or_news") {
    addSuggestion(suggestions, "author", 90, "portal_use_reason");
  }

  if (purpose === "offer_services") {
    addSuggestion(
      suggestions,
      "professional",
      45,
      "portal_use_reason",
      true
    );
    addSuggestion(
      suggestions,
      "contractor",
      45,
      "portal_use_reason",
      true
    );
    addSuggestion(
      suggestions,
      "skilled_workforce",
      45,
      "portal_use_reason",
      true
    );
  }


  // ---------------------------------------------------------
  // Module-grant signals
  // ---------------------------------------------------------

  if (modules.includes("materials")) {
    addSuggestion(suggestions, "material_business", 80, "module_grant");
  }

  if (modules.includes("rentals")) {
    addSuggestion(suggestions, "rental_business", 80, "module_grant");
  }

  if (
    modules.includes("property") ||
    modules.includes("property_owner")
  ) {
    addSuggestion(suggestions, "property_owner", 80, "module_grant");
  }

  if (modules.includes("property_builder")) {
    addSuggestion(suggestions, "builder", 80, "module_grant");
  }

  if (modules.includes("blog_author")) {
    addSuggestion(suggestions, "author", 80, "module_grant");
  }

  if (modules.includes("investor")) {
    addSuggestion(suggestions, "investor", 80, "module_grant");
  }

  if (modules.includes("services")) {
    addSuggestion(
      suggestions,
      "professional",
      40,
      "module_grant",
      true
    );
    addSuggestion(
      suggestions,
      "contractor",
      40,
      "module_grant",
      true
    );
    addSuggestion(
      suggestions,
      "skilled_workforce",
      40,
      "module_grant",
      true
    );
  }


  // ---------------------------------------------------------
  // Business-activity signals
  // ---------------------------------------------------------

  if (activities.includes("materials")) {
    addSuggestion(
      suggestions,
      "material_business",
      70,
      "business_activity"
    );
  }

  if (activities.includes("rentals")) {
    addSuggestion(
      suggestions,
      "rental_business",
      70,
      "business_activity"
    );
  }

  if (activities.includes("property")) {
    if (role === "builder" || businessType === "builder") {
      addSuggestion(suggestions, "builder", 70, "business_activity");
    } else {
      addSuggestion(
        suggestions,
        "property_owner",
        70,
        "business_activity"
      );
    }
  }

  if (activities.includes("blog")) {
    addSuggestion(suggestions, "author", 70, "business_activity");
  }

  if (activities.includes("services")) {
    addSuggestion(
      suggestions,
      "professional",
      35,
      "business_activity",
      true
    );
    addSuggestion(
      suggestions,
      "contractor",
      35,
      "business_activity",
      true
    );
    addSuggestion(
      suggestions,
      "skilled_workforce",
      35,
      "business_activity",
      true
    );
  }


  // ---------------------------------------------------------
  // Business-type signals
  // ---------------------------------------------------------

  if (businessType === "builder") {
    addSuggestion(suggestions, "builder", 75, "business_type");
  }

  if (businessType === "blogger") {
    addSuggestion(suggestions, "author", 75, "business_type");
  }

  /*
   * vendor and hub remain intentionally unresolved because they
   * do not describe a precise human identity.
   */


  return Array.from(suggestions.entries())
    .map(([key, value]) => ({
      identity: HUMAN_IDENTITY_REGISTRY[key],
      score: value.score,
      reasons: Array.from(value.reasons),
      ambiguous: value.ambiguous,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.identity.label.localeCompare(b.identity.label);
    });
}

export function getPrimaryLegacyIdentitySuggestion(
  signals: LegacyIdentitySignals
): IdentitySuggestion | null {
  const suggestions = resolveLegacyIdentitySuggestions(signals);

  if (suggestions.length === 0) return null;

  const first = suggestions[0];
  const second = suggestions[1];

  /*
   * Do not auto-select when:
   * - the strongest result is ambiguous;
   * - another suggestion has the same score.
   */
  if (first.ambiguous) return null;

  if (second && second.score === first.score) return null;

  return first;
}
