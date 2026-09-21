import type {
  MobilePropertyUnitHold,
  MobilePropertyUnitHoldAcquire,
  MobilePropertyUnitHoldEligibilityReason,
  MobilePropertyUnitHoldWorkspace,
} from "@/lib/mobile/contracts/v1";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildMobilePropertyLegalReviewWorkspace } from "./property-legal-review";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_PROPERTY_BOOKING_INTENT_VERSION =
  "property-unit-booking-intent-v1" as const;

type BookingHoldErrorCode =
  | "UNIT_ID_INVALID"
  | "HOLD_ID_INVALID"
  | "ACKNOWLEDGEMENT_INVALID"
  | "INTENT_VERSION_INVALID"
  | "UNIT_NOT_FOUND"
  | "UNIT_NOT_VERIFIED"
  | "UNIT_NOT_TRANSACTION_READY"
  | "UNIT_NOT_AVAILABLE"
  | "UNIT_ALREADY_HELD"
  | "SELF_HOLD_FORBIDDEN"
  | "LEGAL_REVIEW_REQUIRED"
  | "LEGAL_REVIEW_NOT_GRANTED"
  | "LEGAL_REVIEW_MISMATCH"
  | "HOLD_NOT_FOUND"
  | "HOLD_ACCESS_FORBIDDEN"
  | "HOLD_STATE_INVALID"
  | "HOLD_LOOKUP_FAILED"
  | "HOLD_ACQUIRE_FAILED"
  | "HOLD_CANCEL_FAILED"
  | "EXPIRY_RECONCILIATION_FAILED";

type Row = Record<string, any>;

export class MobilePropertyBookingHoldError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: BookingHoldErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingHoldError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validUuid(value: unknown) {
  const text = clean(value);
  return UUID.test(text) ? text : null;
}

function nullableText(value: unknown) {
  const text = clean(value);
  return text || null;
}

function mapHold(row: Row): MobilePropertyUnitHold {
  const expiresAt = clean(row.expires_at);
  const expiryMs = Date.parse(expiresAt);

  return {
    id: clean(row.id),
    unitId: clean(row.unit_id),
    projectId: clean(row.project_id),
    legalReviewRequestId: clean(row.legal_review_request_id),
    status: row.status,
    heldAt: clean(row.held_at),
    expiresAt,
    releasedAt: nullableText(row.released_at),
    remainingSeconds: Number.isFinite(expiryMs)
      ? Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
      : 0,
  };
}

function rpcMessage(error: unknown) {
  if (!error || typeof error !== "object") return "";
  return clean((error as { message?: unknown }).message).toUpperCase();
}

function throwRpcError(
  operation: "acquire" | "cancel" | "expire",
  error: unknown,
): never {
  const message = rpcMessage(error);
  const known: Array<[string, number, BookingHoldErrorCode, string]> = [
    ["UNIT_ALREADY_HELD", 409, "UNIT_ALREADY_HELD", "This unit is already under an active hold."],
    ["UNIT_NOT_AVAILABLE", 409, "UNIT_NOT_AVAILABLE", "This unit is not currently available."],
    ["UNIT_NOT_TRANSACTION_READY", 409, "UNIT_NOT_TRANSACTION_READY", "This unit is not ready for booking intent."],
    ["UNIT_NOT_VERIFIED", 409, "UNIT_NOT_VERIFIED", "This unit has not completed verification."],
    ["SELF_HOLD_FORBIDDEN", 403, "SELF_HOLD_FORBIDDEN", "An owner cannot hold their own unit."],
    ["LEGAL_REVIEW_MISMATCH", 403, "LEGAL_REVIEW_MISMATCH", "The legal-review grant does not match this unit and buyer."],
    ["LEGAL_REVIEW_NOT_GRANTED", 403, "LEGAL_REVIEW_NOT_GRANTED", "A current granted legal review is required."],
    ["LEGAL_REVIEW_EXPIRED", 403, "LEGAL_REVIEW_NOT_GRANTED", "The legal-review grant has expired."],
    ["LEGAL_REVIEW_NOT_FOUND", 404, "LEGAL_REVIEW_REQUIRED", "A legal-review grant was not found."],
    ["HOLD_ACCESS_FORBIDDEN", 403, "HOLD_ACCESS_FORBIDDEN", "This hold does not belong to the authenticated buyer."],
    ["HOLD_NOT_FOUND", 404, "HOLD_NOT_FOUND", "The booking hold was not found."],
    ["CONVERTED_HOLD_CANNOT_BE_CANCELLED", 409, "HOLD_STATE_INVALID", "A converted hold cannot be cancelled."],
    ["ACKNOWLEDGEMENT_INVALID", 400, "ACKNOWLEDGEMENT_INVALID", "Confirm the booking intent again before holding this unit."],
    ["INTENT_VERSION_INVALID", 400, "INTENT_VERSION_INVALID", "The booking-intent acknowledgement is outdated."],
    ["UNIT_NOT_FOUND", 404, "UNIT_NOT_FOUND", "The property unit was not found."],
  ];

  for (const [token, status, code, publicMessage] of known) {
    if (message.includes(token)) {
      throw new MobilePropertyBookingHoldError(status, code, publicMessage);
    }
  }

  if (operation === "acquire") {
    throw new MobilePropertyBookingHoldError(500, "HOLD_ACQUIRE_FAILED", "The property-unit hold could not be acquired.");
  }
  if (operation === "cancel") {
    throw new MobilePropertyBookingHoldError(500, "HOLD_CANCEL_FAILED", "The property-unit hold could not be cancelled.");
  }
  throw new MobilePropertyBookingHoldError(500, "EXPIRY_RECONCILIATION_FAILED", "Expired property holds could not be reconciled.");
}

async function reconcileExpiredHolds() {
  const result = await getSupabaseAdmin().rpc(
    "expire_property_unit_booking_holds",
    { target_limit: 100 },
  );
  if (result.error) throwRpcError("expire", result.error);
}

async function loadActiveHold(unitId: string) {
  const result = await getSupabaseAdmin()
    .from("property_unit_booking_holds")
    .select("*")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();
  if (result.error) {
    throw new MobilePropertyBookingHoldError(500, "HOLD_LOOKUP_FAILED", "The property-unit hold could not be loaded.");
  }
  return result.data as Row | null;
}

async function transactionReady(unitId: string) {
  const result = await getSupabaseAdmin()
    .from("v_property_unit_transaction_readiness")
    .select("transaction_data_ready")
    .eq("unit_id", unitId)
    .maybeSingle();
  if (result.error) {
    throw new MobilePropertyBookingHoldError(500, "HOLD_LOOKUP_FAILED", "Property transaction readiness could not be verified.");
  }
  return result.data?.transaction_data_ready === true;
}

export async function buildMobilePropertyUnitHoldWorkspace(input: {
  userId: string;
  unitId: string;
}): Promise<MobilePropertyUnitHoldWorkspace> {
  const userId = validUuid(input.userId);
  const unitId = validUuid(input.unitId);
  if (!userId || !unitId) {
    throw new MobilePropertyBookingHoldError(400, "UNIT_ID_INVALID", "Choose a valid property unit.");
  }

  await reconcileExpiredHolds();
  const [legalWorkspace, activeHoldRow, isTransactionReady] =
    await Promise.all([
      buildMobilePropertyLegalReviewWorkspace({ userId, unitId }),
      loadActiveHold(unitId),
      transactionReady(unitId),
    ]);

  const actor = legalWorkspace.permissions.actor;
  const isBuyer = actor === "buyer";
  const ownsActiveHold = isBuyer && activeHoldRow?.buyer_user_id === userId;
  const ownerCanView = actor === "owner" && activeHoldRow?.owner_user_id === userId;
  const visibleHold =
    activeHoldRow && (ownsActiveHold || ownerCanView)
      ? mapHold(activeHoldRow)
      : null;
  const request = legalWorkspace.request;
  const grantedReview =
    isBuyer &&
    request?.status === "granted" &&
    request.revokedAt === null &&
    request.expiresAt !== null &&
    Date.parse(request.expiresAt) > Date.now();

  let reason: MobilePropertyUnitHoldEligibilityReason = "eligible";
  if (!isBuyer) reason = "self_hold_forbidden";
  else if (activeHoldRow) reason = "unit_already_held";
  else if (!request) reason = "legal_review_required";
  else if (!grantedReview) {
    reason =
      request.status === "expired" ||
      request.status === "revoked" ||
      (request.expiresAt !== null && Date.parse(request.expiresAt) <= Date.now())
        ? "legal_review_expired"
        : "legal_review_required";
  } else if (legalWorkspace.unit.trustStatus !== "verified") {
    reason = "unit_not_verified";
  } else if (!isTransactionReady) reason = "unit_not_transaction_ready";
  else if (legalWorkspace.unit.status !== "available") reason = "unit_not_available";

  const eligible = reason === "eligible";
  return {
    generatedAt: new Date().toISOString(),
    unit: legalWorkspace.unit,
    eligibility: {
      eligible,
      reason,
      legalReviewRequestId: isBuyer && request ? request.id : null,
    },
    hold: visibleHold,
    permissions: {
      actor,
      canAcquireHold: isBuyer && eligible,
      canCancelHold: ownsActiveHold && visibleHold?.status === "active",
      canViewHold: visibleHold !== null,
    },
    policy: {
      intentVersion: MOBILE_PROPERTY_BOOKING_INTENT_VERSION,
      holdDurationSeconds: 900,
      requiresGrantedLegalReview: true,
      createsPayment: false,
      createsAgreement: false,
      transfersOwnership: false,
    },
  };
}

export async function acquireMobilePropertyUnitHold(input: {
  buyerUserId: string;
  request: MobilePropertyUnitHoldAcquire;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const unitId = validUuid(input.request.unitId);
  const legalReviewRequestId = validUuid(input.request.legalReviewRequestId);
  if (!buyerUserId || !unitId || !legalReviewRequestId) {
    throw new MobilePropertyBookingHoldError(400, "UNIT_ID_INVALID", "The booking-intent request is invalid.");
  }

  const result = await getSupabaseAdmin().rpc(
    "acquire_property_unit_booking_hold",
    {
      target_buyer_user_id: buyerUserId,
      target_unit_id: unitId,
      target_legal_review_request_id: legalReviewRequestId,
      target_intent_version: input.request.intentVersion,
      target_acknowledged_at: input.request.acknowledgedAt,
    },
  );
  if (result.error) throwRpcError("acquire", result.error);
  return buildMobilePropertyUnitHoldWorkspace({ userId: buyerUserId, unitId });
}

export async function cancelMobilePropertyUnitHold(input: {
  buyerUserId: string;
  holdId: string;
  reason?: string | null;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const holdId = validUuid(input.holdId);
  if (!buyerUserId || !holdId) {
    throw new MobilePropertyBookingHoldError(400, "HOLD_ID_INVALID", "Choose a valid property-unit hold.");
  }

  const lookup = await getSupabaseAdmin()
    .from("property_unit_booking_holds")
    .select("unit_id,buyer_user_id")
    .eq("id", holdId)
    .maybeSingle();
  if (lookup.error) {
    throw new MobilePropertyBookingHoldError(500, "HOLD_LOOKUP_FAILED", "The property-unit hold could not be loaded.");
  }
  if (!lookup.data) {
    throw new MobilePropertyBookingHoldError(404, "HOLD_NOT_FOUND", "The property-unit hold was not found.");
  }
  if (lookup.data.buyer_user_id !== buyerUserId) {
    throw new MobilePropertyBookingHoldError(403, "HOLD_ACCESS_FORBIDDEN", "This hold does not belong to the authenticated buyer.");
  }

  const result = await getSupabaseAdmin().rpc(
    "cancel_property_unit_booking_hold",
    {
      target_buyer_user_id: buyerUserId,
      target_hold_id: holdId,
      target_reason: input.reason ?? null,
    },
  );
  if (result.error) throwRpcError("cancel", result.error);
  return buildMobilePropertyUnitHoldWorkspace({
    userId: buyerUserId,
    unitId: clean(lookup.data.unit_id),
  });
}
