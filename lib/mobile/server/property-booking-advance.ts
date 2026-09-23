import type {
  MobilePropertyBookingAdvance,
  MobilePropertyBookingAdvanceConfirmation,
  MobilePropertyBookingAdvanceProposal,
  MobilePropertyBookingAdvanceStatus,
  MobilePropertyBookingAdvanceWorkspace,
} from "@/lib/mobile/contracts/v1";
import {
  SBI_GATEWAY_PROVIDER,
  SBI_INTEGRATION_READY,
} from "@/lib/payments/sbi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildMobilePropertyBookingApplicationWorkspace } from "./property-booking-application";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION =
  "property-booking-advance-v1" as const;

type Row = Record<string, any>;

type PropertyBookingAdvanceErrorCode =
  | "USER_ID_INVALID"
  | "UNIT_ID_INVALID"
  | "APPLICATION_ID_INVALID"
  | "ADVANCE_REQUEST_ID_INVALID"
  | "ADVANCE_AMOUNT_INVALID"
  | "OWNER_TERMS_INVALID"
  | "CONSENT_REQUIRED"
  | "CONSENT_VERSION_INVALID"
  | "CANCELLATION_REASON_INVALID"
  | "ADVANCE_REQUEST_NOT_FOUND"
  | "APPLICATION_NOT_FOUND"
  | "UNIT_NOT_FOUND"
  | "APPLICATION_ACCESS_FORBIDDEN"
  | "ADVANCE_ACCESS_FORBIDDEN"
  | "SELF_PAYMENT_FORBIDDEN"
  | "APPLICATION_NOT_ACCEPTED"
  | "APPLICATION_ACCEPTANCE_EXPIRED"
  | "UNIT_NOT_RESERVED"
  | "PROPERTY_PRICE_UNAVAILABLE"
  | "PROPERTY_PRICE_CHANGED"
  | "ADVANCE_EXCEEDS_PROPERTY_PRICE"
  | "ADVANCE_REQUEST_ALREADY_EXISTS"
  | "ADVANCE_CONFIRMATION_CONFLICT"
  | "ADVANCE_CANCELLATION_CONFLICT"
  | "ADVANCE_RECONCILIATION_REQUIRED"
  | "ADVANCE_OPERATION_FAILED"
  | "ADVANCE_WORKSPACE_FAILED";

export class MobilePropertyBookingAdvanceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: PropertyBookingAdvanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingAdvanceError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function nullableText(value: unknown) {
  const text = clean(value);
  return text || null;
}

function validUuid(value: unknown) {
  const text = clean(value);
  return UUID.test(text) ? text : null;
}

function remainingSeconds(value: unknown) {
  const timestamp = Date.parse(clean(value));
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
    : 0;
}

function safePaise(value: unknown) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0
    ? amount
    : null;
}

function isAdvanceStatus(
  value: unknown,
): value is MobilePropertyBookingAdvanceStatus {
  return [
    "owner_proposed",
    "buyer_confirmed",
    "gateway_configuration_pending",
    "gateway_order_created",
    "payment_pending",
    "paid",
    "failed",
    "expired",
    "cancelled",
    "review_required",
  ].includes(clean(value));
}

function mapAdvance(row: Row): MobilePropertyBookingAdvance {
  const quotedPropertyPricePaise = safePaise(
    row.quoted_property_price_paise,
  );
  const advanceAmountPaise = safePaise(row.advance_amount_paise);
  const status = clean(row.status);

  if (
    !quotedPropertyPricePaise ||
    !advanceAmountPaise ||
    advanceAmountPaise > quotedPropertyPricePaise ||
    !isAdvanceStatus(status)
  ) {
    throw new MobilePropertyBookingAdvanceError(
      500,
      "ADVANCE_WORKSPACE_FAILED",
      "The property-advance record is invalid.",
    );
  }

  return {
    id: clean(row.id),
    applicationId: clean(row.application_id),
    holdId: clean(row.hold_id),
    unitId: clean(row.unit_id),
    projectId: clean(row.project_id),
    quotedPropertyPricePaise,
    advanceAmountPaise,
    currency: "INR",
    provider: SBI_GATEWAY_PROVIDER,
    pricingSource: "builder_inventory_pricing",
    pricingSnapshotAt: clean(row.pricing_snapshot_at),
    ownerTermsNote: nullableText(row.owner_terms_note),
    ownerProposedAt: clean(row.owner_proposed_at),
    buyerConsentVersion: nullableText(row.buyer_consent_version),
    buyerConsentedAt: nullableText(row.buyer_consented_at),
    status,
    expiresAt: clean(row.expires_at),
    cancelledAt: nullableText(row.cancelled_at),
    remainingSeconds:
      status === "owner_proposed" ||
      status === "buyer_confirmed" ||
      status === "gateway_configuration_pending"
        ? remainingSeconds(row.expires_at)
        : 0,
  };
}

function operationError(
  error: unknown,
): MobilePropertyBookingAdvanceError {
  const message = clean((error as { message?: unknown })?.message);

  const mappings: Array<
    [
      string,
      number,
      PropertyBookingAdvanceErrorCode,
      string,
    ]
  > = [
    ["ADVANCE_ACCESS_FORBIDDEN", 403, "ADVANCE_ACCESS_FORBIDDEN", "This private advance request does not belong to your account."],
    ["APPLICATION_ACCESS_FORBIDDEN", 403, "APPLICATION_ACCESS_FORBIDDEN", "This booking application does not belong to your account."],
    ["SELF_PAYMENT_FORBIDDEN", 403, "SELF_PAYMENT_FORBIDDEN", "An owner cannot make an advance payment to their own property."],
    ["ADVANCE_REQUEST_NOT_FOUND", 404, "ADVANCE_REQUEST_NOT_FOUND", "The private advance request was not found."],
    ["APPLICATION_NOT_FOUND", 404, "APPLICATION_NOT_FOUND", "The accepted booking application was not found."],
    ["UNIT_NOT_FOUND", 404, "UNIT_NOT_FOUND", "The property unit was not found."],
    ["APPLICATION_NOT_ACCEPTED", 409, "APPLICATION_NOT_ACCEPTED", "The booking application is not accepted."],
    ["APPLICATION_ACCEPTANCE_EXPIRED", 409, "APPLICATION_ACCEPTANCE_EXPIRED", "The accepted booking-application window has expired."],
    ["ADVANCE_REQUEST_EXPIRED", 409, "APPLICATION_ACCEPTANCE_EXPIRED", "The private advance proposal has expired."],
    ["UNIT_NOT_RESERVED", 409, "UNIT_NOT_RESERVED", "The property unit is no longer reserved."],
    ["PROPERTY_PRICE_CHANGED", 409, "PROPERTY_PRICE_CHANGED", "The canonical property price changed. Ask the owner to review the advance proposal."],
    ["ADVANCE_REQUEST_ALREADY_EXISTS", 409, "ADVANCE_REQUEST_ALREADY_EXISTS", "An advance request already exists for this booking application."],
    ["ADVANCE_CONFIRMATION_CONFLICT", 409, "ADVANCE_CONFIRMATION_CONFLICT", "The advance proposal can no longer be confirmed."],
    ["ADVANCE_CANCELLATION_CONFLICT", 409, "ADVANCE_CANCELLATION_CONFLICT", "The advance request can no longer be cancelled here."],
    ["ADVANCE_RECONCILIATION_REQUIRED", 409, "ADVANCE_RECONCILIATION_REQUIRED", "This advance request requires protected payment reconciliation."],
    ["PROPERTY_PRICE_UNAVAILABLE", 409, "PROPERTY_PRICE_UNAVAILABLE", "The canonical property price is unavailable."],
    ["ADVANCE_EXCEEDS_PROPERTY_PRICE", 400, "ADVANCE_EXCEEDS_PROPERTY_PRICE", "The advance amount cannot exceed the canonical property price."],
    ["ADVANCE_AMOUNT_INVALID", 400, "ADVANCE_AMOUNT_INVALID", "Enter a valid advance amount in paise."],
    ["OWNER_TERMS_INVALID", 400, "OWNER_TERMS_INVALID", "The owner terms must not exceed 1000 characters."],
    ["BUYER_CONSENT_VERSION_INVALID", 400, "CONSENT_VERSION_INVALID", "The advance-consent version is outdated."],
    ["CANCELLATION_REASON_INVALID", 400, "CANCELLATION_REASON_INVALID", "The cancellation reason must not exceed 500 characters."],
  ];

  for (const [needle, status, code, publicMessage] of mappings) {
    if (message.includes(needle)) {
      return new MobilePropertyBookingAdvanceError(
        status,
        code,
        publicMessage,
      );
    }
  }

  return new MobilePropertyBookingAdvanceError(
    500,
    "ADVANCE_OPERATION_FAILED",
    "The private property-advance request could not be updated.",
  );
}

async function invokeAdvanceRpc(
  name:
    | "propose_property_unit_booking_advance"
    | "confirm_property_unit_booking_advance"
    | "cancel_property_unit_booking_advance",
  params: Record<string, unknown>,
) {
  const result = await getSupabaseAdmin().rpc(name, params);

  if (result.error || !result.data) {
    throw operationError(result.error);
  }

  const row = result.data as Row;
  const unitId = validUuid(row.unitId);

  if (!unitId) {
    throw new MobilePropertyBookingAdvanceError(
      500,
      "ADVANCE_OPERATION_FAILED",
      "The property-advance authority returned an invalid unit.",
    );
  }

  return unitId;
}

export async function buildMobilePropertyBookingAdvanceWorkspace(input: {
  userId: string;
  unitId: string;
}): Promise<MobilePropertyBookingAdvanceWorkspace> {
  const userId = validUuid(input.userId);
  const unitId = validUuid(input.unitId);

  if (!userId) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!unitId) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "UNIT_ID_INVALID",
      "Select a valid property unit.",
    );
  }

  const admin = getSupabaseAdmin();
  const expiry = await admin.rpc(
    "expire_property_unit_booking_advances",
    { target_limit: 100 },
  );

  if (expiry.error) {
    throw new MobilePropertyBookingAdvanceError(
      500,
      "ADVANCE_WORKSPACE_FAILED",
      "The property-advance expiry authority is unavailable.",
    );
  }

  const applicationWorkspace =
    await buildMobilePropertyBookingApplicationWorkspace({
      userId,
      unitId,
    });

  const result = await admin
    .from("property_unit_booking_advance_requests")
    .select("*")
    .eq("unit_id", unitId)
    .or(
  "buyer_user_id.eq." +
    userId +
    ",owner_user_id.eq." +
    userId,
)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new MobilePropertyBookingAdvanceError(
      500,
      "ADVANCE_WORKSPACE_FAILED",
      "The private property-advance request could not be loaded.",
    );
  }

  const privateRow = result.data as Row | null;
  const advance = privateRow ? mapAdvance(privateRow) : null;
  const application = applicationWorkspace.application;
  const actor =
    privateRow?.owner_user_id === userId
      ? "owner"
      : privateRow?.buyer_user_id === userId
        ? "buyer"
        : applicationWorkspace.permissions.actor;
  const acceptedApplication =
    application?.status === "accepted" &&
    application.acceptedUntil !== null &&
    Date.parse(application.acceptedUntil) > Date.now();
  const ownsAdvance =
    privateRow?.buyer_user_id === userId;
  const beforeGateway =
    advance?.status === "owner_proposed" ||
    advance?.status === "buyer_confirmed" ||
    advance?.status === "gateway_configuration_pending";

  return {
    generatedAt: new Date().toISOString(),
    unit: applicationWorkspace.unit,
    application,
    advance,
    permissions: {
      actor,
      canProposeAdvance:
        actor === "owner" &&
        acceptedApplication &&
        advance === null,
      canConfirmAdvance:
        actor === "buyer" &&
        acceptedApplication &&
        advance?.status === "owner_proposed" &&
        advance.remainingSeconds > 0,
      canCancelAdvance:
        ownsAdvance &&
        beforeGateway &&
        (advance?.remainingSeconds ?? 0) > 0,
      canViewAdvance: advance !== null,
      canCreateGatewayOrder: false,
    },
    gateway: {
      provider: SBI_GATEWAY_PROVIDER,
      readiness: SBI_INTEGRATION_READY
        ? "ready"
        : "configuration_pending",
      configured: SBI_INTEGRATION_READY,
    },
    policy: {
      consentVersion:
        MOBILE_PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION,
      requiresAcceptedApplication: true,
      requiresReservedInventory: true,
      usesServerOwnedPropertyPrice: true,
      createsGatewayOrder: false,
      collectsMoney: false,
      createsAgreement: false,
      marksInventorySold: false,
      transfersTitle: false,
      transfersOwnership: false,
    },
  };
}

export async function proposeMobilePropertyBookingAdvance(input: {
  ownerUserId: string;
  proposal: MobilePropertyBookingAdvanceProposal;
}) {
  const ownerUserId = validUuid(input.ownerUserId);
  const applicationId = validUuid(input.proposal.applicationId);
  const advanceAmountPaise = Number(
    input.proposal.advanceAmountPaise,
  );

  if (!ownerUserId || !applicationId) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "APPLICATION_ID_INVALID",
      "Select a valid accepted booking application.",
    );
  }

  if (
    !Number.isSafeInteger(advanceAmountPaise) ||
    advanceAmountPaise < 1
  ) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "ADVANCE_AMOUNT_INVALID",
      "Enter a valid advance amount.",
    );
  }

  const unitId = await invokeAdvanceRpc(
    "propose_property_unit_booking_advance",
    {
      target_owner_user_id: ownerUserId,
      target_application_id: applicationId,
      target_advance_amount_paise: advanceAmountPaise,
      target_terms_note: nullableText(
        input.proposal.ownerTermsNote,
      ),
    },
  );

  return buildMobilePropertyBookingAdvanceWorkspace({
    userId: ownerUserId,
    unitId,
  });
}

export async function confirmMobilePropertyBookingAdvance(input: {
  buyerUserId: string;
  confirmation: MobilePropertyBookingAdvanceConfirmation;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const advanceRequestId = validUuid(
    input.confirmation.advanceRequestId,
  );

  if (!buyerUserId || !advanceRequestId) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "ADVANCE_REQUEST_ID_INVALID",
      "Select a valid private advance proposal.",
    );
  }

  if (
    input.confirmation.consentAccepted !== true ||
    input.confirmation.consentVersion !==
      MOBILE_PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION
  ) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "CONSENT_REQUIRED",
      "Confirm the property-advance acknowledgement.",
    );
  }

  const unitId = await invokeAdvanceRpc(
    "confirm_property_unit_booking_advance",
    {
      target_buyer_user_id: buyerUserId,
      target_advance_request_id: advanceRequestId,
      target_buyer_consent_version:
        MOBILE_PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION,
    },
  );

  return buildMobilePropertyBookingAdvanceWorkspace({
    userId: buyerUserId,
    unitId,
  });
}

export async function cancelMobilePropertyBookingAdvance(input: {
  buyerUserId: string;
  advanceRequestId: string;
  reason?: string | null;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const advanceRequestId = validUuid(input.advanceRequestId);

  if (!buyerUserId || !advanceRequestId) {
    throw new MobilePropertyBookingAdvanceError(
      400,
      "ADVANCE_REQUEST_ID_INVALID",
      "Select a valid private advance request.",
    );
  }

  const unitId = await invokeAdvanceRpc(
    "cancel_property_unit_booking_advance",
    {
      target_buyer_user_id: buyerUserId,
      target_advance_request_id: advanceRequestId,
      target_reason: nullableText(input.reason),
    },
  );

  return buildMobilePropertyBookingAdvanceWorkspace({
    userId: buyerUserId,
    unitId,
  });
}
