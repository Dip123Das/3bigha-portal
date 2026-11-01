import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export class MobilePropertyBookingAgreementDraftReconcileError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingAgreementDraftReconcileError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function requiredUuid(value: unknown, label: string) {
  const normalized = clean(value);

  if (!UUID.test(normalized)) {
    throw new MobilePropertyBookingAgreementDraftReconcileError(
      400,
      "Select a valid " + label + ".",
    );
  }

  return normalized;
}

function mapRpcError(message: string) {
  if (
    message.includes("AGREEMENT_DRAFT_SOURCE_INSPECTION_FORBIDDEN") ||
    message.includes("AGREEMENT_DRAFT_SOURCE_RECONCILIATION_FORBIDDEN")
  ) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      403,
      "Only the buyer or owner bound to this booking can prepare a replacement draft.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_NOT_FOUND")) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      404,
      "The advisory draft was not found.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_SOURCE_STILL_CURRENT") ||
    message.includes("AGREEMENT_DRAFT_SOURCE_RECONCILIATION_UNAVAILABLE")
  ) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      409,
      "This draft cannot be replaced from its current source status. Reload the workspace and review the source check.",
    );
  }

  if (
    message.includes("AGREEMENT_NOT_READY_FOR_DRAFT") ||
    message.includes("AGREEMENT_BUYER_DETAILS_NOT_CONFIRMED") ||
    message.includes("AGREEMENT_OWNER_DETAILS_NOT_CONFIRMED") ||
    message.includes("AGREEMENT_READINESS_CANCELLED") ||
    message.includes("AGREEMENT_READINESS_EXPIRED") ||
    message.includes("APPLICATION_NOT_ACCEPTED") ||
    message.includes("UNIT_NOT_RESERVED")
  ) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      409,
      "Reconfirm the booking schedule and both parties’ details before preparing a replacement draft.",
    );
  }

  if (
    message.includes("AGREEMENT_DRAFT_SOURCE_RECONCILIATION_CONFLICT") ||
    message.includes("AGREEMENT_DRAFT_SOURCE_CHANGED")
  ) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      409,
      "The draft or its sources changed during reconciliation. Reload the workspace and try again.",
    );
  }

  if (message.includes("AGREEMENT_DRAFT_REPLACEMENT_INVALID")) {
    return new MobilePropertyBookingAgreementDraftReconcileError(
      500,
      "The replacement draft authority returned an invalid result.",
    );
  }

  return new MobilePropertyBookingAgreementDraftReconcileError(
    500,
    "The changed-source draft could not be reconciled.",
  );
}

export async function reconcileMobilePropertyBookingAgreementDraft(input: {
  actorUserId: string;
  readinessId: string;
  draftId: string;
}) {
  const actorUserId = requiredUuid(input.actorUserId, "account");
  const readinessId = requiredUuid(
    input.readinessId,
    "agreement-readiness workspace",
  );
  const draftId = requiredUuid(input.draftId, "advisory draft");

  const result = await (getSupabaseAdmin() as unknown as AdminClient).rpc(
    "reconcile_property_unit_booking_agreement_draft",
    {
      target_actor_user_id: actorUserId,
      target_readiness_id: readinessId,
      target_draft_id: draftId,
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
    throw new MobilePropertyBookingAgreementDraftReconcileError(
      500,
      "The replacement draft authority returned an invalid result.",
    );
  }

  const row = result.data as Row;
  const replacementId = clean(row.draftId);
  const oldDraftId = clean(row.oldDraftId);
  const responseReadinessId = clean(row.readinessId);
  const status = clean(row.status);
  const version = Number(row.version);
  const supersededAt = clean(row.supersededAt);

  if (
    !UUID.test(replacementId) ||
    replacementId.toLowerCase() === draftId.toLowerCase() ||
    oldDraftId.toLowerCase() !== draftId.toLowerCase() ||
    responseReadinessId.toLowerCase() !== readinessId.toLowerCase() ||
    ![
      "generation_pending",
      "generated",
      "lawyer_review_pending",
      "lawyer_changes_requested",
      "superseded",
      "cancelled",
      "generation_failed",
    ].includes(status) ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    !Number.isFinite(Date.parse(supersededAt)) ||
    row.advisoryOnly !== true ||
    row.lawyerReviewRequired !== true ||
    row.legalEffectCreated !== false ||
    row.signingAllowed !== false ||
    row.registrationAllowed !== false ||
    row.executionAllowed !== false ||
    row.createsPayment !== false ||
    row.marksInventorySold !== false ||
    row.transfersTitle !== false ||
    row.transfersOwnership !== false
  ) {
    throw new MobilePropertyBookingAgreementDraftReconcileError(
      500,
      "The replacement draft authority returned an invalid result.",
    );
  }

  return {
    oldDraftId,
    draftId: replacementId,
    readinessId,
    status,
    version,
    supersededAt,
    advisoryOnly: true as const,
    lawyerReviewRequired: true as const,
    legalEffectCreated: false as const,
    signingAllowed: false as const,
    registrationAllowed: false as const,
    executionAllowed: false as const,
    createsPayment: false as const,
    marksInventorySold: false as const,
    transfersTitle: false as const,
    transfersOwnership: false as const,
  };
}
