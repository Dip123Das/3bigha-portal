import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

type Row = Record<string, unknown>;

type RpcResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

type AdminClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): Promise<RpcResult>;
};

export class MobilePropertyBookingAgreementDraftReviewError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingAgreementDraftReviewError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function requiredUuid(value: unknown, label: string) {
  const normalized = clean(value);

  if (!UUID.test(normalized)) {
    throw new MobilePropertyBookingAgreementDraftReviewError(
      400,
      "Select a valid " + label + ".",
    );
  }

  return normalized;
}

function mapRpcError(message: string) {
  if (message.includes("AGREEMENT_DRAFT_PARTY_REVIEW_FORBIDDEN")) {
    return new MobilePropertyBookingAgreementDraftReviewError(
      403,
      "Only the buyer or owner bound to this booking can record a review.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_NOT_FOUND")) {
    return new MobilePropertyBookingAgreementDraftReviewError(
      404,
      "The advisory draft was not found.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_PARTY_REVIEW_VERSION_CONFLICT") ||
    message.includes("AGREEMENT_GENERATION_CLAIM_REQUIRED")
  ) {
    return new MobilePropertyBookingAgreementDraftReviewError(
      409,
      "This review applies only to the current generated draft version. Reload the draft and try again.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_PARTY_REVIEW_BINDING_INVALID")
  ) {
    return new MobilePropertyBookingAgreementDraftReviewError(
      409,
      "The draft no longer matches this agreement-readiness workspace.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_PARTY_REVIEW_INPUT_INVALID")) {
    return new MobilePropertyBookingAgreementDraftReviewError(
      400,
      "Submit the current draft version to record your review.",
    );
  }

  return new MobilePropertyBookingAgreementDraftReviewError(
    500,
    "The draft review acknowledgement could not be saved.",
  );
}

export async function recordMobilePropertyBookingAgreementDraftReview(input: {
  actorUserId: string;
  readinessId: string;
  draftId: string;
  draftContentSha256: string;
}) {
  const actorUserId = requiredUuid(input.actorUserId, "account");
  const readinessId = requiredUuid(
    input.readinessId,
    "agreement-readiness workspace",
  );
  const draftId = requiredUuid(input.draftId, "advisory draft");
  const draftContentSha256 = clean(input.draftContentSha256).toLowerCase();

  if (!SHA256.test(draftContentSha256)) {
    throw new MobilePropertyBookingAgreementDraftReviewError(
      400,
      "The current advisory draft fingerprint is invalid.",
    );
  }

  const result = await (getSupabaseAdmin() as unknown as AdminClient).rpc(
    "record_property_unit_booking_agreement_draft_party_review",
    {
      target_actor_user_id: actorUserId,
      target_draft_id: draftId,
      target_readiness_id: readinessId,
      target_draft_content_sha256: draftContentSha256,
    },
  );

  if (result.error) {
    throw mapRpcError(
      clean(result.error.code) + " " + clean(result.error.message),
    );
  }

  if (
    !result.data ||
    typeof result.data !== "object" ||
    Array.isArray(result.data)
  ) {
    throw new MobilePropertyBookingAgreementDraftReviewError(
      500,
      "The draft review authority returned an invalid result.",
    );
  }

  const row = result.data as Row;
  const reviewedAt = clean(row.reviewedAt);
  const actorRole = clean(row.actorRole);

  if (
    clean(row.draftId).toLowerCase() !== draftId.toLowerCase() ||
    clean(row.readinessId).toLowerCase() !== readinessId.toLowerCase() ||
    clean(row.draftContentSha256).toLowerCase() !== draftContentSha256 ||
    (actorRole !== "buyer" && actorRole !== "owner") ||
    !Number.isFinite(Date.parse(reviewedAt))
  ) {
    throw new MobilePropertyBookingAgreementDraftReviewError(
      500,
      "The draft review authority returned an invalid result.",
    );
  }

  return {
    readinessId,
    draftId,
    actorRole,
    draftContentSha256,
    reviewedAt,
    created: row.created === true,
    legalApproval: false as const,
    signingConsent: false as const,
    executionAllowed: false as const,
  };
}
