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

export class MobilePropertyBookingAgreementDraftFeedbackError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingAgreementDraftFeedbackError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function requiredUuid(value: unknown, label: string) {
  const normalized = clean(value);

  if (!UUID.test(normalized)) {
    throw new MobilePropertyBookingAgreementDraftFeedbackError(
      400,
      "Select a valid " + label + ".",
    );
  }

  return normalized;
}

function mapRpcError(message: string) {
  if (
    message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_FORBIDDEN") ||
    message.includes("AGREEMENT_DRAFT_SOURCE_INSPECTION_FORBIDDEN")
  ) {
    return new MobilePropertyBookingAgreementDraftFeedbackError(
      403,
      "Only the buyer or owner bound to this booking can leave feedback.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_NOT_FOUND")) {
    return new MobilePropertyBookingAgreementDraftFeedbackError(
      404,
      "The advisory draft was not found.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_SOURCE_STALE") ||
    message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_VERSION_CONFLICT") ||
    message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_BINDING_INVALID")
  ) {
    return new MobilePropertyBookingAgreementDraftFeedbackError(
      409,
      "Feedback can be left only on the current, source-verified draft version. Reload the workspace and check its source status.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_INPUT_INVALID")) {
    return new MobilePropertyBookingAgreementDraftFeedbackError(
      400,
      "Enter feedback of 1 to 2,000 characters for this draft version.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_PARTY_FEEDBACK_REPLY_INVALID")
  ) {
    return new MobilePropertyBookingAgreementDraftFeedbackError(
      409,
      "Replies must attach to a note on this same draft version.",
    );
  }

  return new MobilePropertyBookingAgreementDraftFeedbackError(
    500,
    "The party feedback could not be saved.",
  );
}

export async function recordMobilePropertyBookingAgreementDraftFeedback(input: {
  actorUserId: string;
  readinessId: string;
  draftId: string;
  draftContentSha256: string;
  noteText: string;
  replyToFeedbackId?: string | null;
}) {
  const actorUserId = requiredUuid(input.actorUserId, "account");
  const readinessId = requiredUuid(
    input.readinessId,
    "agreement-readiness workspace",
  );
  const draftId = requiredUuid(input.draftId, "advisory draft");
  const draftContentSha256 = clean(
    input.draftContentSha256,
  ).toLowerCase();
  const noteText = clean(input.noteText);
  const replyToFeedbackId = input.replyToFeedbackId
    ? requiredUuid(input.replyToFeedbackId, "feedback note")
    : null;

  if (!SHA256.test(draftContentSha256)) {
    throw new MobilePropertyBookingAgreementDraftFeedbackError(
      400,
      "The current draft fingerprint is invalid.",
    );
  }

  if (noteText.length < 1 || noteText.length > 2000) {
    throw new MobilePropertyBookingAgreementDraftFeedbackError(
      400,
      "Enter feedback of 1 to 2,000 characters for this draft version.",
    );
  }

  const result = await (getSupabaseAdmin() as unknown as AdminClient).rpc(
    "record_property_unit_booking_agreement_draft_party_feedback",
    {
      target_actor_user_id: actorUserId,
      target_readiness_id: readinessId,
      target_draft_id: draftId,
      target_draft_content_sha256: draftContentSha256,
      target_note_text: noteText,
      target_reply_to_feedback_id: replyToFeedbackId,
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
    throw new MobilePropertyBookingAgreementDraftFeedbackError(
      500,
      "The feedback authority returned an invalid result.",
    );
  }

  const row = result.data as Row;
  const actorRole = clean(row.actorRole);
  const feedbackId = clean(row.feedbackId);
  const returnedReplyToFeedbackId =
    row.replyToFeedbackId === null
      ? null
      : clean(row.replyToFeedbackId);
  const noteReturned = clean(row.noteText);
  const createdAt = clean(row.createdAt);

  if (
    !UUID.test(feedbackId) ||
    (returnedReplyToFeedbackId !== null &&
      !UUID.test(returnedReplyToFeedbackId)) ||
    (returnedReplyToFeedbackId?.toLowerCase() ?? null) !==
      (replyToFeedbackId?.toLowerCase() ?? null) ||
    clean(row.draftId).toLowerCase() !== draftId.toLowerCase() ||
    clean(row.readinessId).toLowerCase() !== readinessId.toLowerCase() ||
    clean(row.draftContentSha256).toLowerCase() !== draftContentSha256 ||
    (actorRole !== "buyer" && actorRole !== "owner") ||
    noteReturned !== noteText ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof row.created !== "boolean" ||
    row.legalApproval !== false ||
    row.draftChanged !== false
  ) {
    throw new MobilePropertyBookingAgreementDraftFeedbackError(
      500,
      "The feedback authority returned an invalid result.",
    );
  }

  return {
    readinessId,
    draftId,
    feedbackId,
    replyToFeedbackId: returnedReplyToFeedbackId,
    actorRole: actorRole as "buyer" | "owner",
    noteText: noteReturned,
    createdAt,
    created: row.created,
    legalApproval: false as const,
    draftChanged: false as const,
  };
}
