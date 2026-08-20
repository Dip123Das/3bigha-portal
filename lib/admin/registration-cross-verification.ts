import type { SupabaseClient } from "@supabase/supabase-js";

type ComparisonStatus =
  | "match"
  | "partial_match"
  | "mismatch"
  | "missing_declared"
  | "missing_extracted"
  | "not_applicable";

type FieldComparison = {
  field: string;
  label: string;
  declaredValue: string | string[];
  extractedValue: string | string[];
  status: ComparisonStatus;
  similarity: number;
  explanation: string;
};

type DuplicateIdentifier = {
  field: string;
  value: string;
  otherUserIds: string[];
};

export type RegistrationCrossVerificationResult = {
  id: string;
  userId: string;
  caseId: string | null;
  documentIntelligenceId: string;
  evidenceSha256: string;
  overallConsistency: number;
  identityConsistency: number;
  businessConsistency: number;
  geographicConsistency: number;
  identifierConsistency: number;
  fieldComparisons: FieldComparison[];
  matchedFields: string[];
  mismatchedFields: string[];
  missingFields: string[];
  duplicateIdentifiers: DuplicateIdentifier[];
  warnings: string[];
  recommendedAction:
    | "consistent"
    | "request_correction"
    | "manual_review";
  status: "completed" | "needs_manual_review";
  source: string;
  createdAt: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function clamp(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean)
    : [];
}

function normalizeText(value: unknown) {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIdentifier(value: unknown) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function tokens(value: unknown) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 1)
  );
}

function similarity(left: unknown, right: unknown) {
  const a = normalizeText(left);
  const b = normalizeText(right);

  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 90;

  const leftTokens = tokens(a);
  const rightTokens = tokens(b);
  const union = new Set([
    ...leftTokens,
    ...rightTokens,
  ]);
  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return union.size
    ? Math.round(
        (intersection / union.size) * 100
      )
    : 0;
}

function compareText(
  field: string,
  label: string,
  declaredValue: unknown,
  extractedValue: unknown,
  options?: {
    exactIdentifier?: boolean;
    partialThreshold?: number;
    matchThreshold?: number;
  }
): FieldComparison {
  const declared = clean(declaredValue);
  const extracted = clean(extractedValue);

  if (!declared && !extracted) {
    return {
      field,
      label,
      declaredValue: "",
      extractedValue: "",
      status: "not_applicable",
      similarity: 0,
      explanation:
        "Neither the registration nor the document contains this field.",
    };
  }

  if (!declared) {
    return {
      field,
      label,
      declaredValue: "",
      extractedValue: extracted,
      status: "missing_declared",
      similarity: 0,
      explanation:
        "The document contains a value, but the registration does not.",
    };
  }

  if (!extracted) {
    return {
      field,
      label,
      declaredValue: declared,
      extractedValue: "",
      status: "missing_extracted",
      similarity: 0,
      explanation:
        "The registration contains a value, but it was not extracted from the document.",
    };
  }

  const score = options?.exactIdentifier
    ? (
        normalizeIdentifier(declared) ===
        normalizeIdentifier(extracted)
          ? 100
          : 0
      )
    : similarity(declared, extracted);

  const matchThreshold =
    options?.matchThreshold ?? 85;
  const partialThreshold =
    options?.partialThreshold ?? 55;
  const status: ComparisonStatus =
    score >= matchThreshold
      ? "match"
      : score >= partialThreshold
        ? "partial_match"
        : "mismatch";

  return {
    field,
    label,
    declaredValue: declared,
    extractedValue: extracted,
    status,
    similarity: score,
    explanation:
      status === "match"
        ? "The declared and extracted values are consistent."
        : status === "partial_match"
          ? "The values are similar but require human confirmation."
          : "The declared and extracted values are inconsistent.",
  };
}

function compareArray(
  field: string,
  label: string,
  declaredValue: unknown,
  extractedValue: unknown
): FieldComparison {
  const declared = list(declaredValue);
  const extracted = list(extractedValue);

  if (!declared.length && !extracted.length) {
    return {
      field,
      label,
      declaredValue: [],
      extractedValue: [],
      status: "not_applicable",
      similarity: 0,
      explanation:
        "Neither source contains this field.",
    };
  }

  if (!declared.length) {
    return {
      field,
      label,
      declaredValue: [],
      extractedValue: extracted,
      status: "missing_declared",
      similarity: 0,
      explanation:
        "The document contains activities that were not declared.",
    };
  }

  if (!extracted.length) {
    return {
      field,
      label,
      declaredValue: declared,
      extractedValue: [],
      status: "missing_extracted",
      similarity: 0,
      explanation:
        "Declared activities were not extracted from the document.",
    };
  }

  let best = 0;

  for (const left of declared) {
    for (const right of extracted) {
      best = Math.max(
        best,
        similarity(left, right)
      );
    }
  }

  const status: ComparisonStatus =
    best >= 85
      ? "match"
      : best >= 55
        ? "partial_match"
        : "mismatch";

  return {
    field,
    label,
    declaredValue: declared,
    extractedValue: extracted,
    status,
    similarity: best,
    explanation:
      status === "match"
        ? "At least one declared activity matches the document."
        : status === "partial_match"
          ? "The business activities are related but need confirmation."
          : "The declared business activity does not match the extracted activity.",
  };
}

function scoreGroup(
  comparisons: FieldComparison[],
  fields: string[]
) {
  const relevant = comparisons.filter(
    (item) =>
      fields.includes(item.field) &&
      item.status !== "not_applicable"
  );

  if (!relevant.length) return 0;

  const weighted = relevant.map((item) => {
    if (item.status === "match") {
      return item.similarity || 100;
    }

    if (item.status === "partial_match") {
      return item.similarity || 60;
    }

    if (
      item.status === "missing_declared" ||
      item.status === "missing_extracted"
    ) {
      return 35;
    }

    return 0;
  });

  return Math.round(
    weighted.reduce(
      (total, value) => total + value,
      0
    ) / weighted.length
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean)
    : [];
}

function objectValue(
  source: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source[key];

    if (
      value !== null &&
      value !== undefined &&
      clean(value)
    ) {
      return value;
    }
  }

  return "";
}

async function findDuplicateIdentifiers(
  admin: SupabaseClient,
  userId: string,
  fields: Record<string, unknown>
): Promise<DuplicateIdentifier[]> {
  const identifiers = [
    {
      field: "gstin",
      value: normalizeIdentifier(fields.gstin),
    },
    {
      field: "pan",
      value: normalizeIdentifier(fields.pan),
    },
    {
      field: "registrationNumber",
      value: normalizeIdentifier(
        fields.registrationNumber
      ),
    },
  ].filter((item) => item.value);

  if (!identifiers.length) return [];

  const { data, error } = await admin
    .from("registration_document_intelligence")
    .select("user_id,extracted_fields")
    .neq("user_id", userId)
    .limit(5000);

  if (error) {
    return [];
  }

  const duplicates =
    new Map<string, Set<string>>();

  for (const row of data || []) {
    const record =
      row as unknown as Record<string, unknown>;
    const extracted =
      record.extracted_fields &&
      typeof record.extracted_fields ===
        "object"
        ? record.extracted_fields as Record<
            string,
            unknown
          >
        : {};

    for (const identifier of identifiers) {
      const other = normalizeIdentifier(
        objectValue(
          extracted,
          identifier.field,
          identifier.field ===
            "registrationNumber"
            ? "registration_number"
            : identifier.field
        )
      );

      if (other === identifier.value) {
        const key =
          `${identifier.field}:${identifier.value}`;
        const users =
          duplicates.get(key) ||
          new Set<string>();
        users.add(clean(record.user_id));
        duplicates.set(key, users);
      }
    }
  }

  return [...duplicates.entries()].map(
    ([key, users]) => {
      const separator = key.indexOf(":");

      return {
        field: key.slice(0, separator),
        value: key.slice(separator + 1),
        otherUserIds: [...users].filter(Boolean),
      };
    }
  );
}

function mapRow(
  row: Record<string, unknown>
): RegistrationCrossVerificationResult {
  return {
    id: clean(row.id),
    userId: clean(row.user_id),
    caseId: clean(row.case_id) || null,
    documentIntelligenceId: clean(
      row.document_intelligence_id
    ),
    evidenceSha256: clean(
      row.evidence_sha256
    ),
    overallConsistency: clamp(
      row.overall_consistency
    ),
    identityConsistency: clamp(
      row.identity_consistency
    ),
    businessConsistency: clamp(
      row.business_consistency
    ),
    geographicConsistency: clamp(
      row.geographic_consistency
    ),
    identifierConsistency: clamp(
      row.identifier_consistency
    ),
    fieldComparisons: Array.isArray(
      row.field_comparisons
    )
      ? row.field_comparisons as FieldComparison[]
      : [],
    matchedFields: stringArray(
      row.matched_fields
    ),
    mismatchedFields: stringArray(
      row.mismatched_fields
    ),
    missingFields: stringArray(
      row.missing_fields
    ),
    duplicateIdentifiers: Array.isArray(
      row.duplicate_identifiers
    )
      ? row.duplicate_identifiers as DuplicateIdentifier[]
      : [],
    warnings: stringArray(row.warnings),
    recommendedAction:
      row.recommended_action === "consistent"
        ? "consistent"
        : row.recommended_action ===
            "request_correction"
          ? "request_correction"
          : "manual_review",
    status:
      row.status === "completed"
        ? "completed"
        : "needs_manual_review",
    source: clean(row.source),
    createdAt: clean(row.created_at),
  };
}

export async function generateRegistrationCrossVerification(
  admin: SupabaseClient,
  input: {
    reviewerId: string;
    userId: string;
    caseId?: string | null;
    documentIntelligenceId: string;
  }
): Promise<RegistrationCrossVerificationResult> {
  const { data: existing } = await admin
    .from("registration_cross_verification")
    .select("*")
    .eq(
      "document_intelligence_id",
      input.documentIntelligenceId
    )
    .maybeSingle();

  if (existing) {
    return mapRow(
      existing as unknown as Record<
        string,
        unknown
      >
    );
  }

  const [
    profileRes,
    businessRes,
    documentRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id,full_name,registration_verification_status"
      )
      .eq("id", input.userId)
      .maybeSingle(),
    admin
      .from("business_profiles")
      .select(
        [
          "user_id",
          "business_name",
          "business_type",
          "nature_of_business",
          "state",
          "district",
          "pincode",
        ].join(",")
      )
      .eq("user_id", input.userId)
      .maybeSingle(),
    admin
      .from(
        "registration_document_intelligence"
      )
      .select("*")
      .eq("id", input.documentIntelligenceId)
      .eq("user_id", input.userId)
      .maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error(
      "Registration profile could not be loaded."
    );
  }

  if (businessRes.error || !businessRes.data) {
    throw new Error(
      "Business profile could not be loaded."
    );
  }

  if (documentRes.error || !documentRes.data) {
    throw new Error(
      "Document intelligence could not be loaded."
    );
  }

  const profile =
    profileRes.data as unknown as Record<
      string,
      unknown
    >;
  const business =
    businessRes.data as unknown as Record<
      string,
      unknown
    >;
  const document =
    documentRes.data as unknown as Record<
      string,
      unknown
    >;
  const extracted =
    document.extracted_fields &&
    typeof document.extracted_fields ===
      "object"
      ? document.extracted_fields as Record<
          string,
          unknown
        >
      : {};

  const comparisons: FieldComparison[] = [
    compareText(
      "businessName",
      "Business name",
      business.business_name,
      objectValue(
        extracted,
        "businessName",
        "business_name",
        "tradeName",
        "legalName"
      )
    ),
    compareText(
      "proprietorName",
      "Proprietor or owner name",
      profile.full_name,
      objectValue(
        extracted,
        "proprietorName",
        "ownerName",
        "proprietor_name"
      )
    ),
    compareText(
      "businessType",
      "Business constitution or type",
      business.business_type,
      objectValue(
        extracted,
        "constitution",
        "businessType",
        "business_type"
      ),
      {
        partialThreshold: 45,
        matchThreshold: 75,
      }
    ),
    compareArray(
      "activity",
      "Business activity",
      business.nature_of_business,
      Array.isArray(extracted.activity)
        ? extracted.activity
        : clean(extracted.activity)
          ? [clean(extracted.activity)]
          : []
    ),
    compareText(
      "state",
      "State",
      business.state,
      objectValue(extracted, "state")
    ),
    compareText(
      "district",
      "District",
      business.district,
      objectValue(extracted, "district")
    ),
    compareText(
      "pincode",
      "PIN code",
      business.pincode,
      objectValue(
        extracted,
        "pincode",
        "postalCode",
        "pin"
      ),
      { exactIdentifier: true }
    ),
  ];

  for (const identifier of [
    {
      field: "gstin",
      label: "GSTIN",
      value: objectValue(
        extracted,
        "gstin",
        "gstNumber"
      ),
    },
    {
      field: "pan",
      label: "PAN",
      value: objectValue(extracted, "pan"),
    },
    {
      field: "registrationNumber",
      label: "Registration number",
      value: objectValue(
        extracted,
        "registrationNumber",
        "registration_number",
        "licenceNumber",
        "licenseNumber"
      ),
    },
  ]) {
    if (clean(identifier.value)) {
      comparisons.push({
        field: identifier.field,
        label: identifier.label,
        declaredValue: "",
        extractedValue: clean(
          identifier.value
        ),
        status: "missing_declared",
        similarity: 0,
        explanation:
          "The identifier was extracted from the document and will be checked for reuse across other registrations.",
      });
    }
  }

  const duplicates =
    await findDuplicateIdentifiers(
      admin,
      input.userId,
      extracted
    );

  const identityConsistency = scoreGroup(
    comparisons,
    ["proprietorName"]
  );
  const businessConsistency = scoreGroup(
    comparisons,
    [
      "businessName",
      "businessType",
      "activity",
    ]
  );
  const geographicConsistency = scoreGroup(
    comparisons,
    ["state", "district", "pincode"]
  );

  const identifierComparisons =
    comparisons.filter((item) =>
      [
        "gstin",
        "pan",
        "registrationNumber",
      ].includes(item.field)
    );
  const identifierConsistency =
    duplicates.length
      ? 0
      : identifierComparisons.length
        ? 70
        : 0;

  const scored = [
    identityConsistency,
    businessConsistency,
    geographicConsistency,
    identifierConsistency,
  ].filter((score) => score > 0);

  const overallConsistency = scored.length
    ? Math.round(
        scored.reduce(
          (total, score) => total + score,
          0
        ) / scored.length
      )
    : 0;

  const matchedFields = comparisons
    .filter((item) => item.status === "match")
    .map((item) => item.field);
  const mismatchedFields = comparisons
    .filter(
      (item) =>
        item.status === "mismatch" ||
        item.status === "partial_match"
    )
    .map((item) => item.field);
  const missingFields = comparisons
    .filter(
      (item) =>
        item.status === "missing_declared" ||
        item.status === "missing_extracted"
    )
    .map((item) => item.field);

  const warnings: string[] = [];

  if (duplicates.length) {
    warnings.push(
      "One or more extracted identifiers are already present on another registration."
    );
  }

  if (
    clamp(document.extraction_confidence) <
    70
  ) {
    warnings.push(
      "Document extraction confidence is below 70%."
    );
  }

  if (
    document.status ===
    "needs_manual_review"
  ) {
    warnings.push(
      "The source document intelligence requires manual review."
    );
  }

  const recommendedAction =
    duplicates.length ||
    mismatchedFields.length >= 2 ||
    overallConsistency < 55
      ? "manual_review"
      : missingFields.length ||
          mismatchedFields.length
        ? "request_correction"
        : "consistent";
  const status =
    recommendedAction === "consistent"
      ? "completed"
      : "needs_manual_review";

  const { data: inserted, error } =
    await admin
      .from(
        "registration_cross_verification"
      )
      .insert({
        user_id: input.userId,
        case_id:
          input.caseId ||
          clean(document.case_id) ||
          null,
        document_intelligence_id:
          input.documentIntelligenceId,
        evidence_sha256:
          clean(document.evidence_sha256),
        overall_consistency:
          overallConsistency,
        identity_consistency:
          identityConsistency,
        business_consistency:
          businessConsistency,
        geographic_consistency:
          geographicConsistency,
        identifier_consistency:
          identifierConsistency,
        field_comparisons: comparisons,
        matched_fields: matchedFields,
        mismatched_fields:
          mismatchedFields,
        missing_fields: missingFields,
        duplicate_identifiers: duplicates,
        warnings,
        recommended_action:
          recommendedAction,
        status,
        source:
          "registration_cross_verification_v1",
        created_by: input.reviewerId,
        updated_at:
          new Date().toISOString(),
      })
      .select("*")
      .single();

  if (error || !inserted) {
    throw new Error(
      "Cross-verification result could not be stored."
    );
  }

  return mapRow(
    inserted as unknown as Record<
      string,
      unknown
    >
  );
}
