import type {
  RegistrationIntelligenceSnapshot,
} from "@/lib/registration/intelligence/resolve-registration-intelligence";

export type PersistedRegistrationIntelligenceSnapshot = {
  id: string;
  userId: string;
  businessId: string;
  version: string;
  source: string;
  trustScore: number;
  trustConfidence: number;
  requiresHumanReview: boolean;
  createdAt: string;
};

type PersistenceError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type PersistenceResult = {
  data: Record<string, unknown> | null;
  error: PersistenceError | null;
};

export type RegistrationIntelligencePersistenceClient = {
  from(table: "registration_intelligence_snapshots"): {
    insert(values: Record<string, unknown>): {
      select(columns: string): {
        single(): PromiseLike<PersistenceResult>;
      };
    };
  };
};

function requiredString(
  value: unknown,
  field: string
) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(
      `Registration intelligence persistence returned no ${field}.`
    );
  }

  return normalized;
}

function requiredNumber(
  value: unknown,
  field: string
) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error(
      `Registration intelligence persistence returned invalid ${field}.`
    );
  }

  return normalized;
}

export async function persistRegistrationIntelligenceSnapshot(
  client: RegistrationIntelligencePersistenceClient,
  input: {
    userId: string;
    snapshot: RegistrationIntelligenceSnapshot;
    source?: string;
  }
): Promise<PersistedRegistrationIntelligenceSnapshot> {
  if (input.userId !== input.snapshot.businessId) {
    throw new Error(
      "Authenticated registration owner must match the intelligence business."
    );
  }

  const source =
    input.source?.trim() || "registration_completion";

  const { data, error } = await client
    .from("registration_intelligence_snapshots")
    .insert({
      user_id: input.userId,
      business_id: input.snapshot.businessId,
      version: input.snapshot.version,
      source,
      trust_score: input.snapshot.trust.score,
      trust_confidence: input.snapshot.trust.confidence,
      requires_human_review:
        input.snapshot.trust.requiresHumanReview,
      snapshot: input.snapshot,
    })
    .select(
      [
        "id",
        "user_id",
        "business_id",
        "version",
        "source",
        "trust_score",
        "trust_confidence",
        "requires_human_review",
        "created_at",
      ].join(",")
    )
    .single();

  if (error) {
    const detail = [
      error.code,
      error.message,
      error.details,
      error.hint,
    ]
      .filter(Boolean)
      .join(" | ");

    throw new Error(
      detail
        ? `Registration intelligence persistence failed: ${detail}`
        : "Registration intelligence persistence failed."
    );
  }

  if (!data) {
    throw new Error(
      "Registration intelligence persistence returned no record."
    );
  }

  return {
    id: requiredString(data.id, "snapshot id"),
    userId: requiredString(data.user_id, "user id"),
    businessId: requiredString(
      data.business_id,
      "business id"
    ),
    version: requiredString(data.version, "version"),
    source: requiredString(data.source, "source"),
    trustScore: requiredNumber(
      data.trust_score,
      "trust score"
    ),
    trustConfidence: requiredNumber(
      data.trust_confidence,
      "trust confidence"
    ),
    requiresHumanReview:
      data.requires_human_review === true,
    createdAt: requiredString(
      data.created_at,
      "creation time"
    ),
  };
}
