export type ReviewTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type ReviewFieldState =
  | "confirmed"
  | "mismatch"
  | "uncertain"
  | "not_available";

export type ReviewFieldRow = {
  field: string;
  label: string;
  enteredValue: string;
  extractedValue: string;
  confidence: number;
  state: ReviewFieldState;
  severity: "hard" | "soft";
};

const FIELD_LABELS: Record<string, string> = {
  document_type: "Document type",
  registration_number: "Registration number",
  issuing_authority: "Issuing authority",
  issue_date: "Issue date",
  validity: "Validity",
  business_name: "Business name",
  business_address: "Business address",
};

export function safeReviewText(
  value: unknown,
  fallback = "Not available"
) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function reviewStatusLabel(
  status: unknown
) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  const labels: Record<string, string> = {
    verified_by_ai: "Verified by AI",
    needs_manual_review: "Manual review required",
    needs_document: "Document required",
    document_mismatch: "Document mismatch",
    format_valid_document_mismatch:
      "Document mismatch",
    format_valid_needs_manual_review:
      "Manual review required",
    format_invalid: "Document information invalid",
  };

  return (
    labels[normalized] ||
    normalized.replaceAll("_", " ") ||
    "Unknown"
  );
}

export function reviewStatusTone(
  status: unknown
): ReviewTone {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (normalized === "verified_by_ai") {
    return "success";
  }

  if (
    normalized === "document_mismatch" ||
    normalized ===
      "format_valid_document_mismatch" ||
    normalized === "format_invalid"
  ) {
    return "danger";
  }

  if (
    normalized === "needs_manual_review" ||
    normalized ===
      "format_valid_needs_manual_review"
  ) {
    return "warning";
  }

  return "neutral";
}

export function reviewToneStyle(
  tone: ReviewTone
) {
  if (tone === "success") {
    return {
      background: "#ecfdf5",
      borderColor: "#a7f3d0",
      color: "#065f46",
    };
  }

  if (tone === "warning") {
    return {
      background: "#fffbeb",
      borderColor: "#fde68a",
      color: "#92400e",
    };
  }

  if (tone === "danger") {
    return {
      background: "#fef2f2",
      borderColor: "#fecaca",
      color: "#991b1b",
    };
  }

  return {
    background: "#f8fafc",
    borderColor: "#e2e8f0",
    color: "#334155",
  };
}

function validityText(
  document: Record<string, any>,
  prefix: "entered" | "extracted"
) {
  const type = String(
    document[
      `${prefix}ValidityType`
    ] || ""
  );

  if (type === "no_expiry") {
    return "No expiry stated";
  }

  if (type === "financial_period") {
    const start =
      document[
        `${prefix}PeriodStartYear`
      ];
    const end =
      document[
        `${prefix}PeriodEndYear`
      ];

    return start && end
      ? `${start}–${end}`
      : "Financial period not readable";
  }

  return safeReviewText(
    document[
      `${prefix}ValidUntil`
    ]
  );
}

export function buildReviewFieldRows(
  document: Record<string, any>
): ReviewFieldRow[] {
  const confidence =
    document.fieldConfidence &&
    typeof document.fieldConfidence === "object"
      ? document.fieldConfidence
      : {};

  const reviews = Array.isArray(
    document.fieldReviews
  )
    ? document.fieldReviews
    : [];

  const reviewByField = new Map(
    reviews.map((review: any) => [
      String(review?.field || ""),
      review,
    ])
  );

  const fields = [
    {
      field: "document_type",
      enteredValue:
        document.documentType,
      extractedValue:
        document.classifiedDocumentType,
    },
    {
      field: "registration_number",
      enteredValue:
        document.enteredNumber,
      extractedValue:
        document.extractedNumber,
    },
    {
      field: "issuing_authority",
      enteredValue:
        document.enteredIssuingAuthority,
      extractedValue:
        document.extractedIssuingAuthority,
    },
    {
      field: "issue_date",
      enteredValue:
        document.enteredIssueDate,
      extractedValue:
        document.extractedIssueDate,
    },
    {
      field: "validity",
      enteredValue: validityText(
        document,
        "entered"
      ),
      extractedValue: validityText(
        document,
        "extracted"
      ),
    },
    {
      field: "business_name",
      enteredValue:
        document.enteredBusinessName,
      extractedValue:
        document.extractedBusinessName,
    },
    {
      field: "business_address",
      enteredValue:
        document.enteredAddress,
      extractedValue:
        document.extractedAddress,
    },
  ];

  return fields.map((item) => {
    const review: any =
      reviewByField.get(item.field) || {};

    const state =
      review.state === "confirmed" ||
      review.state === "mismatch" ||
      review.state === "uncertain" ||
      review.state === "not_available"
        ? review.state
        : "not_available";

    return {
      field: item.field,
      label:
        FIELD_LABELS[item.field] ||
        item.field.replaceAll("_", " "),
      enteredValue: safeReviewText(
        item.enteredValue
      ),
      extractedValue: safeReviewText(
        item.extractedValue
      ),
      confidence: Math.max(
        0,
        Math.min(
          100,
          Math.round(
            Number(
              confidence[item.field] ??
                review.confidence ??
                0
            )
          )
        )
      ),
      state,
      severity:
        review.severity === "hard"
          ? "hard"
          : "soft",
    };
  });
}
