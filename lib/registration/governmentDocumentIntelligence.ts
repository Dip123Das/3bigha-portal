export type GovernmentDocumentType =
  | "gst"
  | "trade_license"
  | "udyam"
  | "pan"
  | "fssai"
  | "shop_establishment"
  | "professional_registration"
  | "other";

export type VerificationField =
  | "document_type"
  | "registration_number"
  | "issuing_authority"
  | "issue_date"
  | "validity"
  | "business_name"
  | "business_address";

export type FieldConfidenceMap = Record<
  VerificationField,
  number
>;

export type FieldMatchMap = Record<
  VerificationField,
  boolean | null
>;

export type FieldReviewState =
  | "confirmed"
  | "mismatch"
  | "uncertain"
  | "not_available";

export type FieldReview = {
  field: VerificationField;
  confidence: number;
  matched: boolean | null;
  state: FieldReviewState;
  severity: "hard" | "soft";
};

const HARD_FIELDS = new Set<VerificationField>([
  "document_type",
  "registration_number",
  "validity",
]);

export function clampConfidence(
  value: unknown,
  fallback = 0
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

export function normalizeGovernmentDocumentType(
  value: unknown,
  fallback: GovernmentDocumentType = "other"
): GovernmentDocumentType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<
    string,
    GovernmentDocumentType
  > = {
    gst: "gst",
    gstin: "gst",
    gst_registration: "gst",

    trade_license: "trade_license",
    trade_licence: "trade_license",
    municipal_trade_license: "trade_license",
    municipal_trade_licence: "trade_license",

    udyam: "udyam",
    udyam_registration: "udyam",
    msme: "udyam",
    msme_registration: "udyam",

    pan: "pan",
    permanent_account_number: "pan",

    fssai: "fssai",
    food_license: "fssai",
    food_licence: "fssai",

    shop_establishment: "shop_establishment",
    shops_establishment: "shop_establishment",
    shop_and_establishment: "shop_establishment",

    professional_registration:
      "professional_registration",
    professional_certificate:
      "professional_registration",

    other: "other",
  };

  return aliases[normalized] || fallback;
}

export function createFieldConfidenceMap(
  value: unknown
): FieldConfidenceMap {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    document_type: clampConfidence(
      source.document_type ??
        source.documentType
    ),
    registration_number: clampConfidence(
      source.registration_number ??
        source.registrationNumber
    ),
    issuing_authority: clampConfidence(
      source.issuing_authority ??
        source.issuingAuthority
    ),
    issue_date: clampConfidence(
      source.issue_date ??
        source.issueDate
    ),
    validity: clampConfidence(
      source.validity
    ),
    business_name: clampConfidence(
      source.business_name ??
        source.businessName
    ),
    business_address: clampConfidence(
      source.business_address ??
        source.businessAddress
    ),
  };
}

export function buildFieldReviews(
  confidence: FieldConfidenceMap,
  matches: FieldMatchMap
): FieldReview[] {
  return (
    Object.keys(confidence) as VerificationField[]
  ).map((field) => {
    const fieldConfidence = confidence[field];
    const matched = matches[field];

    let state: FieldReviewState;

    if (matched === null) {
      state =
        fieldConfidence > 0
          ? "uncertain"
          : "not_available";
    } else if (
      matched === false &&
      fieldConfidence >= 80
    ) {
      state = "mismatch";
    } else if (
      matched === false ||
      fieldConfidence < 70
    ) {
      state = "uncertain";
    } else {
      state = "confirmed";
    }

    return {
      field,
      confidence: fieldConfidence,
      matched,
      state,
      severity: HARD_FIELDS.has(field)
        ? "hard"
        : "soft",
    };
  });
}

export function resolveDocumentDecision(
  reviews: FieldReview[],
  options: {
    readable: boolean;
    expired: boolean;
    overallConfidence: number;
  }
):
  | "verified_by_ai"
  | "document_mismatch"
  | "format_invalid"
  | "needs_manual_review" {
  if (options.expired) {
    return "format_invalid";
  }

  if (!options.readable) {
    return "needs_manual_review";
  }

  const hardMismatch = reviews.some(
    (review) =>
      review.severity === "hard" &&
      review.state === "mismatch"
  );

  if (hardMismatch) {
    return "document_mismatch";
  }

  const uncertain = reviews.some(
    (review) =>
      review.state === "uncertain" ||
      review.state === "not_available"
  );

  if (
    uncertain ||
    options.overallConfidence < 75
  ) {
    return "needs_manual_review";
  }

  return "verified_by_ai";
}

export function averageFieldConfidence(
  confidence: FieldConfidenceMap
) {
  const meaningful = Object.values(
    confidence
  ).filter((value) => value > 0);

  if (!meaningful.length) return 0;

  return Math.round(
    meaningful.reduce(
      (sum, value) => sum + value,
      0
    ) / meaningful.length
  );
}
