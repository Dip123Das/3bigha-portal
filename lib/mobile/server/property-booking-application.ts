import type {
  MobilePropertyBookingApplication,
  MobilePropertyBookingApplicationDecision,
  MobilePropertyBookingApplicationWorkspace,
} from "@/lib/mobile/contracts/v1";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildMobilePropertyUnitHoldWorkspace } from "./property-booking-hold";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_PROPERTY_BOOKING_APPLICATION_INTENT_VERSION =
  "property-unit-booking-application-v1" as const;

type Row = Record<string, any>;

type BookingApplicationErrorCode =
  | "USER_ID_INVALID"
  | "UNIT_ID_INVALID"
  | "HOLD_ID_INVALID"
  | "APPLICATION_ID_INVALID"
  | "INTENT_VERSION_INVALID"
  | "ACKNOWLEDGEMENT_INVALID"
  | "BUYER_MESSAGE_INVALID"
  | "DECISION_INVALID"
  | "DECISION_NOTE_INVALID"
  | "CANCELLATION_REASON_INVALID"
  | "APPLICATION_NOT_FOUND"
  | "APPLICATION_ACCESS_FORBIDDEN"
  | "APPLICATION_NOT_ACTIVE"
  | "APPLICATION_NOT_PENDING"
  | "APPLICATION_ALREADY_ACTIVE"
  | "HOLD_NOT_FOUND"
  | "HOLD_NOT_ACTIVE"
  | "HOLD_EXPIRED"
  | "HOLD_ACCESS_FORBIDDEN"
  | "UNIT_NOT_RESERVED"
  | "APPLICATION_OPERATION_FAILED"
  | "APPLICATION_WORKSPACE_FAILED";

export class MobilePropertyBookingApplicationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: BookingApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingApplicationError";
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

function mapApplication(row: Row): MobilePropertyBookingApplication {
  return {
    id: clean(row.id),
    holdId: clean(row.hold_id),
    unitId: clean(row.unit_id),
    projectId: clean(row.project_id),
    legalReviewRequestId: clean(row.legal_review_request_id),
    status: row.status,
    buyerMessage: nullableText(row.buyer_message),
    submittedAt: clean(row.submitted_at),
    decisionDueAt: clean(row.decision_due_at),
    ownerDecidedAt: nullableText(row.owner_decided_at),
    ownerDecisionNote: nullableText(row.owner_decision_note),
    acceptedUntil: nullableText(row.accepted_until),
    endedAt: nullableText(row.ended_at),
    remainingDecisionSeconds:
      row.status === "submitted"
        ? remainingSeconds(row.decision_due_at)
        : 0,
    remainingAcceptedSeconds:
      row.status === "accepted"
        ? remainingSeconds(row.accepted_until)
        : 0,
  };
}

function operationError(error: unknown): MobilePropertyBookingApplicationError {
  const message = clean((error as { message?: unknown })?.message);

  const mappings: Array<
    [string, number, BookingApplicationErrorCode, string]
  > = [
    ["APPLICATION_ACCESS_FORBIDDEN", 403, "APPLICATION_ACCESS_FORBIDDEN", "This booking application does not belong to your account."],
    ["HOLD_ACCESS_FORBIDDEN", 403, "HOLD_ACCESS_FORBIDDEN", "This property-unit hold does not belong to your account."],
    ["APPLICATION_NOT_FOUND", 404, "APPLICATION_NOT_FOUND", "The booking application was not found."],
    ["HOLD_NOT_FOUND", 404, "HOLD_NOT_FOUND", "The property-unit hold was not found."],
    ["APPLICATION_ALREADY_ACTIVE", 409, "APPLICATION_ALREADY_ACTIVE", "This unit already has an active booking application."],
    ["APPLICATION_NOT_ACTIVE", 409, "APPLICATION_NOT_ACTIVE", "This booking application is no longer active."],
    ["APPLICATION_NOT_PENDING", 409, "APPLICATION_NOT_PENDING", "This booking application is no longer awaiting an owner decision."],
    ["HOLD_NOT_ACTIVE", 409, "HOLD_NOT_ACTIVE", "This temporary unit hold is no longer active."],
    ["HOLD_EXPIRED", 409, "HOLD_EXPIRED", "This temporary unit hold has expired."],
    ["UNIT_NOT_RESERVED", 409, "UNIT_NOT_RESERVED", "This unit is no longer reserved for the booking application."],
    ["INTENT_VERSION_INVALID", 400, "INTENT_VERSION_INVALID", "The booking-application acknowledgement is outdated."],
    ["ACKNOWLEDGEMENT_INVALID", 400, "ACKNOWLEDGEMENT_INVALID", "Confirm the booking-application acknowledgement again."],
    ["BUYER_MESSAGE_INVALID", 400, "BUYER_MESSAGE_INVALID", "The buyer message must not exceed 1000 characters."],
    ["DECISION_INVALID", 400, "DECISION_INVALID", "Select accept or decline."],
    ["DECISION_NOTE_INVALID", 400, "DECISION_NOTE_INVALID", "The owner decision note is invalid."],
    ["CANCELLATION_REASON_INVALID", 400, "CANCELLATION_REASON_INVALID", "The cancellation reason must not exceed 500 characters."],
  ];

  for (const [needle, status, code, publicMessage] of mappings) {
    if (message.includes(needle)) {
      return new MobilePropertyBookingApplicationError(
        status,
        code,
        publicMessage,
      );
    }
  }

  return new MobilePropertyBookingApplicationError(
    500,
    "APPLICATION_OPERATION_FAILED",
    "The property booking application could not be updated.",
  );
}

async function invokeApplicationRpc(
  name:
    | "submit_property_unit_booking_application"
    | "decide_property_unit_booking_application"
    | "cancel_property_unit_booking_application",
  params: Record<string, unknown>,
) {
  const result = await getSupabaseAdmin().rpc(name, params);

  if (result.error || !result.data) {
    throw operationError(result.error);
  }

  const row = result.data as Row;
  const unitId = validUuid(row.unitId);

  if (!unitId) {
    throw new MobilePropertyBookingApplicationError(
      500,
      "APPLICATION_OPERATION_FAILED",
      "The booking application returned an invalid unit reference.",
    );
  }

  return unitId;
}

export async function buildMobilePropertyBookingApplicationWorkspace(input: {
  userId: string;
  unitId: string;
}): Promise<MobilePropertyBookingApplicationWorkspace> {
  const userId = validUuid(input.userId);
  const unitId = validUuid(input.unitId);

  if (!userId) {
    throw new MobilePropertyBookingApplicationError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!unitId) {
    throw new MobilePropertyBookingApplicationError(
      400,
      "UNIT_ID_INVALID",
      "Select a valid property unit.",
    );
  }

  const admin = getSupabaseAdmin();
  const expiry = await admin.rpc(
    "expire_property_unit_booking_applications",
    { target_limit: 100 },
  );

  if (expiry.error) {
    throw new MobilePropertyBookingApplicationError(
      500,
      "APPLICATION_WORKSPACE_FAILED",
      "The booking-application expiry authority is unavailable.",
    );
  }

  const holdWorkspace = await buildMobilePropertyUnitHoldWorkspace({
    userId,
    unitId,
  });

  const result = await admin
    .from("property_unit_booking_applications")
    .select("*")
    .eq("unit_id", unitId)
    .or(`buyer_user_id.eq.${userId},owner_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new MobilePropertyBookingApplicationError(
      500,
      "APPLICATION_WORKSPACE_FAILED",
      "The private booking application could not be loaded.",
    );
  }

  const privateRow = result.data as Row | null;
  const application = privateRow ? mapApplication(privateRow) : null;
  const actor =
    privateRow?.owner_user_id === userId
      ? "owner"
      : privateRow?.buyer_user_id === userId
        ? "buyer"
        : holdWorkspace.permissions.actor;
  const active =
    application?.status === "submitted" ||
    application?.status === "accepted";
  const ownsApplication =
    privateRow?.buyer_user_id === userId;
  const ownsHold =
    holdWorkspace.permissions.actor === "buyer" &&
    holdWorkspace.permissions.canCancelHold &&
    holdWorkspace.hold?.status === "active";

  return {
    generatedAt: new Date().toISOString(),
    unit: holdWorkspace.unit,
    hold: holdWorkspace.hold,
    application,
    permissions: {
      actor,
      canSubmitApplication:
        actor === "buyer" &&
        ownsHold &&
        !active,
      canCancelApplication:
        ownsApplication &&
        active,
      canAcceptApplication:
        actor === "owner" &&
        application?.status === "submitted",
      canDeclineApplication:
        actor === "owner" &&
        application?.status === "submitted",
      canViewApplication: application !== null,
    },
    policy: {
      intentVersion:
        MOBILE_PROPERTY_BOOKING_APPLICATION_INTENT_VERSION,
      ownerDecisionWindowSeconds: 172800,
      acceptedNextStepWindowSeconds: 172800,
      requiresActiveBuyerHold: true,
      keepsInventoryReserved: true,
      createsPayment: false,
      createsAgreement: false,
      marksInventorySold: false,
      transfersOwnership: false,
    },
  };
}

export async function submitMobilePropertyBookingApplication(input: {
  buyerUserId: string;
  holdId: string;
  intentVersion: string;
  acknowledgedAt: string;
  buyerMessage?: string | null;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const holdId = validUuid(input.holdId);

  if (!buyerUserId || !holdId) {
    throw new MobilePropertyBookingApplicationError(
      400,
      "HOLD_ID_INVALID",
      "Select a valid active property-unit hold.",
    );
  }

  const unitId = await invokeApplicationRpc(
    "submit_property_unit_booking_application",
    {
      target_buyer_user_id: buyerUserId,
      target_hold_id: holdId,
      target_intent_version: clean(input.intentVersion),
      target_acknowledged_at: clean(input.acknowledgedAt),
      target_buyer_message: nullableText(input.buyerMessage),
    },
  );

  return buildMobilePropertyBookingApplicationWorkspace({
    userId: buyerUserId,
    unitId,
  });
}

export async function decideMobilePropertyBookingApplication(input: {
  ownerUserId: string;
  applicationId: string;
  decision: MobilePropertyBookingApplicationDecision["decision"];
  decisionNote?: string | null;
}) {
  const ownerUserId = validUuid(input.ownerUserId);
  const applicationId = validUuid(input.applicationId);

  if (!ownerUserId || !applicationId) {
    throw new MobilePropertyBookingApplicationError(
      400,
      "APPLICATION_ID_INVALID",
      "Select a valid booking application.",
    );
  }

  const unitId = await invokeApplicationRpc(
    "decide_property_unit_booking_application",
    {
      target_owner_user_id: ownerUserId,
      target_application_id: applicationId,
      target_decision: input.decision,
      target_decision_note: nullableText(input.decisionNote),
    },
  );

  return buildMobilePropertyBookingApplicationWorkspace({
    userId: ownerUserId,
    unitId,
  });
}

export async function cancelMobilePropertyBookingApplication(input: {
  buyerUserId: string;
  applicationId: string;
  reason?: string | null;
}) {
  const buyerUserId = validUuid(input.buyerUserId);
  const applicationId = validUuid(input.applicationId);

  if (!buyerUserId || !applicationId) {
    throw new MobilePropertyBookingApplicationError(
      400,
      "APPLICATION_ID_INVALID",
      "Select a valid booking application.",
    );
  }

  const unitId = await invokeApplicationRpc(
    "cancel_property_unit_booking_application",
    {
      target_buyer_user_id: buyerUserId,
      target_application_id: applicationId,
      target_reason: nullableText(input.reason),
    },
  );

  return buildMobilePropertyBookingApplicationWorkspace({
    userId: buyerUserId,
    unitId,
  });
}
