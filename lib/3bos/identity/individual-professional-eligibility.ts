export type IndividualProfessionalEligibilityInput = {
  operatingProfile: string;
  identityKey: string;
  identityLabel?: string | null;
  legacyRole?: string | null;
  requiresBusinessOnboarding?: boolean;
};

export type IndividualProfessionalEligibility = {
  eligible: boolean;
  reason:
    | "eligible_self_working_professional"
    | "not_individual_profile"
    | "business_onboarding_required"
    | "contractor_or_business_identity"
    | "identity_not_supported";
};

const ELIGIBLE_IDENTITY_KEYS = new Set([
  "mason",
  "painter",
  "carpenter",
  "plumber",
  "electrician",
  "welder",
  "tile_worker",
  "tile_mason",
  "bar_bender",
  "shuttering_worker",
  "machine_operator",
  "equipment_operator",
  "driver",
  "gardener",
  "helper",
  "repair_professional",
  "skilled_professional",
  "individual_skilled_professional",
]);

const ELIGIBLE_LABEL_TERMS = [
  "mason",
  "painter",
  "carpenter",
  "plumber",
  "electrician",
  "welder",
  "tile worker",
  "tile mason",
  "bar bender",
  "shuttering worker",
  "machine operator",
  "equipment operator",
  "driver",
  "gardener",
  "helper",
  "repair professional",
  "skilled professional",
];

const CONTRACTOR_OR_BUSINESS_TERMS = [
  "contractor",
  "builder",
  "developer",
  "agency",
  "company",
  "supplier",
  "vendor hub",
  "business operator",
  "labour supplier",
  "workforce supplier",
  "firm",
];

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function resolveIndividualProfessionalEligibility(
  input: IndividualProfessionalEligibilityInput
): IndividualProfessionalEligibility {
  if (input.operatingProfile !== "individual_professional") {
    return {
      eligible: false,
      reason: "not_individual_profile",
    };
  }

  if (input.requiresBusinessOnboarding) {
    return {
      eligible: false,
      reason: "business_onboarding_required",
    };
  }

  const identityKey = normalize(input.identityKey).replace(/\s+/g, "_");
  const searchableIdentity = normalize(
    `${input.identityKey} ${input.identityLabel || ""}`
  );

  if (
    CONTRACTOR_OR_BUSINESS_TERMS.some((term) =>
      searchableIdentity.includes(term)
    ) ||
    ["builder", "hub_vendor"].includes(
      normalize(input.legacyRole)
    )
  ) {
    return {
      eligible: false,
      reason: "contractor_or_business_identity",
    };
  }

  const supported =
    ELIGIBLE_IDENTITY_KEYS.has(identityKey) ||
    ELIGIBLE_LABEL_TERMS.some((term) =>
      searchableIdentity.includes(term)
    );

  if (!supported) {
    return {
      eligible: false,
      reason: "identity_not_supported",
    };
  }

  return {
    eligible: true,
    reason: "eligible_self_working_professional",
  };
}

export const INDIVIDUAL_PROFESSIONAL_CONSTITUTIONAL_RULES = {
  planKey: "lifetime_free_individual_professional",
  economicMode: "self_working_individual",
  requiresOriginalName: true,
  requiresVerifiedLiveSelfie: true,
  minimumLiveWorkPhotos: 2,
  contractorsEligible: false,
} as const;
