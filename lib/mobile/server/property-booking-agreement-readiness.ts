import type {
  MobilePropertyBookingAgreementCancellation,
  MobilePropertyBookingAgreementPartyConfirmation,
  MobilePropertyBookingAgreementPartyInput,
  MobilePropertyBookingAgreementPartyRole,
  MobilePropertyBookingAgreementPartyStatus,
  MobilePropertyBookingAgreementPartySubmission,
  MobilePropertyBookingAgreementPrintPageSize,
  MobilePropertyBookingAgreementReadiness,
  MobilePropertyBookingAgreementReadinessCreate,
  MobilePropertyBookingAgreementReadinessStatus,
  MobilePropertyBookingAgreementSchedule,
  MobilePropertyBookingAgreementScheduleConfirmation,
  MobilePropertyBookingAgreementWorkspace,
} from "@/lib/mobile/contracts/v1";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildMobilePropertyBookingApplicationWorkspace } from "./property-booking-application";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_PROPERTY_AGREEMENT_READINESS_VERSION =
  "property-agreement-readiness-v1" as const;

export const MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION =
  "property-agreement-party-input-v1" as const;

type Row = Record<string, any>;

type AgreementReadinessErrorCode =
  | "USER_ID_INVALID"
  | "UNIT_ID_INVALID"
  | "APPLICATION_ID_INVALID"
  | "READINESS_ID_INVALID"
  | "PARTY_INPUT_INVALID"
  | "PARTY_INPUT_VERSION_INVALID"
  | "PARTY_CONSENT_REQUIRED"
  | "CANCELLATION_REASON_INVALID"
  | "APPLICATION_NOT_FOUND"
  | "HOLD_NOT_FOUND"
  | "UNIT_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "READINESS_NOT_FOUND"
  | "PARTY_INPUT_NOT_FOUND"
  | "AGREEMENT_ACCESS_FORBIDDEN"
  | "AGREEMENT_OWNER_ACCESS_FORBIDDEN"
  | "APPLICATION_NOT_ACCEPTED"
  | "APPLICATION_ACCEPTANCE_EXPIRED"
  | "UNIT_NOT_RESERVED"
  | "PROPERTY_PRICE_UNAVAILABLE"
  | "PROPERTY_BOUNDARIES_INCOMPLETE"
  | "PROPERTY_SCHEDULE_INCOMPLETE"
  | "PROPERTY_SCHEDULE_CHANGED"
  | "READINESS_BINDING_INVALID"
  | "PARTY_BINDING_INVALID"
  | "SCHEDULE_BINDING_INVALID"
  | "PARTY_SUBMISSION_CONFLICT"
  | "PARTY_CONFIRMATION_CONFLICT"
  | "PARTY_ALREADY_CONFIRMED"
  | "PARTY_NOT_SUBMITTED"
  | "PARTY_DETAILS_INCOMPLETE"
  | "PARTIES_NOT_CONFIRMED"
  | "SCHEDULE_CONFIRMATION_CONFLICT"
  | "READINESS_UPDATE_CONFLICT"
  | "READINESS_CANCELLATION_CONFLICT"
  | "READINESS_EXPIRED"
  | "AGREEMENT_OPERATION_FAILED"
  | "AGREEMENT_WORKSPACE_FAILED";

export class MobilePropertyBookingAgreementReadinessError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: AgreementReadinessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyBookingAgreementReadinessError";
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

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safePaise(value: unknown) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0
    ? amount
    : null;
}

function nullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => clean(item))
    .filter(Boolean);
}

function remainingSeconds(value: unknown) {
  const timestamp = Date.parse(clean(value));
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
    : 0;
}

function isReadinessStatus(
  value: unknown,
): value is MobilePropertyBookingAgreementReadinessStatus {
  return [
    "collecting_details",
    "ready_for_draft",
    "draft_generated",
    "parties_reviewing",
    "changes_requested",
    "approved_for_execution",
    "cancelled",
    "expired",
  ].includes(clean(value));
}

function isPartyRole(
  value: unknown,
): value is MobilePropertyBookingAgreementPartyRole {
  return value === "buyer" || value === "owner";
}

function isPartyStatus(
  value: unknown,
): value is MobilePropertyBookingAgreementPartyStatus {
  return [
    "incomplete",
    "submitted",
    "confirmed",
    "changes_requested",
  ].includes(clean(value));
}

function isPrintPageSize(
  value: unknown,
): value is MobilePropertyBookingAgreementPrintPageSize {
  return [
    "A4",
    "LEGAL",
    "CUSTOM_STAMP_PAPER",
  ].includes(clean(value));
}

function mapReadiness(
  row: Row,
): MobilePropertyBookingAgreementReadiness {
  const status = clean(row.status);
  const readinessVersion = clean(row.readiness_version);

  if (
    !isReadinessStatus(status) ||
    readinessVersion !== MOBILE_PROPERTY_AGREEMENT_READINESS_VERSION
  ) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_WORKSPACE_FAILED",
      "The agreement-readiness record is invalid.",
    );
  }

  return {
    id: clean(row.id),
    applicationId: clean(row.application_id),
    holdId: clean(row.hold_id),
    unitId: clean(row.unit_id),
    projectId: clean(row.project_id),
    advanceRequestId: nullableText(row.advance_request_id),
    status,
    readinessVersion:
      MOBILE_PROPERTY_AGREEMENT_READINESS_VERSION,
    buyerDetailsConfirmedAt:
      nullableText(row.buyer_details_confirmed_at),
    ownerDetailsConfirmedAt:
      nullableText(row.owner_details_confirmed_at),
    propertyScheduleConfirmedAt:
      nullableText(row.property_schedule_confirmed_at),
    readyForDraftAt:
      nullableText(row.ready_for_draft_at),
    cancelledAt: nullableText(row.cancelled_at),
    expiresAt: nullableText(row.expires_at),
    remainingSeconds:
      status === "collecting_details" ||
      status === "ready_for_draft"
        ? remainingSeconds(row.expires_at)
        : 0,
    createdAt: clean(row.created_at),
    updatedAt: clean(row.updated_at),
  };
}

function mapSchedule(
  row: Row,
): MobilePropertyBookingAgreementSchedule {
  const quotedPropertyPricePaise = safePaise(
    row.quoted_property_price_paise,
  );
  const pageSize = clean(row.print_page_size);
  const boundaryNorth = clean(row.boundary_north);
  const boundarySouth = clean(row.boundary_south);
  const boundaryEast = clean(row.boundary_east);
  const boundaryWest = clean(row.boundary_west);

  if (
    !quotedPropertyPricePaise ||
    !isPrintPageSize(pageSize) ||
    clean(row.print_orientation) !== "portrait" ||
    !clean(row.unit_code_snapshot) ||
    !clean(row.unit_kind_snapshot) ||
    !boundaryNorth ||
    !boundarySouth ||
    !boundaryEast ||
    !boundaryWest
  ) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_WORKSPACE_FAILED",
      "The protected property schedule is invalid.",
    );
  }

  return {
    unitCode: clean(row.unit_code_snapshot),
    unitTitle: nullableText(row.unit_title_snapshot),
    unitKind: clean(row.unit_kind_snapshot),
    projectName: nullableText(row.project_name_snapshot),
    quotedPropertyPricePaise,
    currency: "INR",
    plotAreaSqft: nullableNumber(row.plot_area_sqft),
    builtUpSqft: nullableNumber(row.built_up_sqft),
    carpetSqft: nullableNumber(row.carpet_sqft),
    superBuiltUpSqft:
      nullableNumber(row.super_built_up_sqft),
    dimensionLengthFt:
      nullableNumber(row.dimension_length_ft),
    dimensionWidthFt:
      nullableNumber(row.dimension_width_ft),
    floorNumber: nullableInteger(row.floor_number),
    unitNumber: nullableText(row.unit_number),
    facing: nullableText(row.facing),
    boundaryNorth,
    boundarySouth,
    boundaryEast,
    boundaryWest,
    boundaryDemarcation:
      nullableText(row.boundary_demarcation),
    plotNumbers: stringArray(row.plot_numbers_snapshot),
    deedNumbers: stringArray(row.deed_numbers_snapshot),
    mutationNumbers:
      stringArray(row.mutation_numbers_snapshot),
    khatianNumbers:
      stringArray(row.khatian_numbers_snapshot),
    propertyAddress:
      nullableText(row.property_address_snapshot),
    printLayout: {
      pageSize,
      orientation: "portrait",
      marginTopMm:
        nullableNumber(row.print_margin_top_mm) ?? 25,
      marginRightMm:
        nullableNumber(row.print_margin_right_mm) ?? 20,
      marginBottomMm:
        nullableNumber(row.print_margin_bottom_mm) ?? 25,
      marginLeftMm:
        nullableNumber(row.print_margin_left_mm) ?? 20,
      customPageWidthMm:
        nullableNumber(row.custom_page_width_mm),
      customPageHeightMm:
        nullableNumber(row.custom_page_height_mm),
    },
  };
}

function mapOwnPartyInput(
  row: Row,
): MobilePropertyBookingAgreementPartyInput {
  const role = clean(row.party_role);
  const status = clean(row.status);

  if (
    !isPartyRole(role) ||
    !isPartyStatus(status) ||
    clean(row.input_version) !==
      MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION
  ) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_WORKSPACE_FAILED",
      "Your protected agreement particulars are invalid.",
    );
  }

  return {
    role,
    status,
    legalName: nullableText(row.legal_name),
    relationType: row.relation_type ?? null,
    relationName: nullableText(row.relation_name),
    addressLine1: nullableText(row.address_line_1),
    addressLine2: nullableText(row.address_line_2),
    villageOrLocality:
      nullableText(row.village_or_locality),
    postOffice: nullableText(row.post_office),
    policeStation: nullableText(row.police_station),
    blockOrMunicipality:
      nullableText(row.block_or_municipality),
    district: nullableText(row.district),
    state: nullableText(row.state),
    pincode: nullableText(row.pincode),
    identityDocumentType:
      row.identity_document_type ?? null,
    identityMaskedReference:
      nullableText(row.identity_masked_reference),
    authorityCapacity:
      nullableText(row.authority_capacity),
    inputVersion:
      MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION,
    consentAccepted: row.consent_accepted === true,
    consentAcceptedAt:
      nullableText(row.consent_accepted_at),
    submittedAt: nullableText(row.submitted_at),
    confirmedAt: nullableText(row.confirmed_at),
  };
}

function operationError(
  error: unknown,
): MobilePropertyBookingAgreementReadinessError {
  const message = clean(
    (error as { message?: unknown })?.message,
  );

  const mappings: Array<
    [string, number, AgreementReadinessErrorCode, string]
  > = [
    ["AGREEMENT_OWNER_ACCESS_FORBIDDEN", 403, "AGREEMENT_OWNER_ACCESS_FORBIDDEN", "Only the canonical property owner may confirm the property schedule."],
    ["AGREEMENT_ACCESS_FORBIDDEN", 403, "AGREEMENT_ACCESS_FORBIDDEN", "This private agreement-readiness workspace does not belong to your account."],
    ["AGREEMENT_READINESS_NOT_FOUND", 404, "READINESS_NOT_FOUND", "The agreement-readiness workspace was not found."],
    ["AGREEMENT_PARTY_INPUT_NOT_FOUND", 404, "PARTY_INPUT_NOT_FOUND", "Your private agreement particulars were not found."],
    ["APPLICATION_NOT_FOUND", 404, "APPLICATION_NOT_FOUND", "The accepted booking application was not found."],
    ["HOLD_NOT_FOUND", 404, "HOLD_NOT_FOUND", "The converted property-unit hold was not found."],
    ["UNIT_NOT_FOUND", 404, "UNIT_NOT_FOUND", "The property unit was not found."],
    ["PROJECT_NOT_FOUND", 404, "PROJECT_NOT_FOUND", "The property project was not found."],
    ["APPLICATION_NOT_ACCEPTED", 409, "APPLICATION_NOT_ACCEPTED", "The booking application is not accepted."],
    ["APPLICATION_ACCEPTANCE_EXPIRED", 409, "APPLICATION_ACCEPTANCE_EXPIRED", "The accepted booking-application window has expired."],
    ["UNIT_NOT_RESERVED", 409, "UNIT_NOT_RESERVED", "The property unit is no longer reserved."],
    ["PROPERTY_PRICE_UNAVAILABLE", 409, "PROPERTY_PRICE_UNAVAILABLE", "The canonical property price is unavailable."],
    ["PROPERTY_BOUNDARIES_INCOMPLETE", 409, "PROPERTY_BOUNDARIES_INCOMPLETE", "All four canonical property boundaries must be completed first."],
    ["PROPERTY_SCHEDULE_INCOMPLETE", 409, "PROPERTY_SCHEDULE_INCOMPLETE", "The canonical property schedule is incomplete."],
    ["PROPERTY_SCHEDULE_CHANGED", 409, "PROPERTY_SCHEDULE_CHANGED", "The canonical property schedule changed and must be reviewed again."],
    ["AGREEMENT_READINESS_BINDING_CONFLICT", 409, "READINESS_BINDING_INVALID", "The agreement-readiness workspace no longer matches this booking."],
    ["AGREEMENT_READINESS_BINDING_INVALID", 409, "READINESS_BINDING_INVALID", "The agreement-readiness workspace no longer matches this booking."],
    ["AGREEMENT_BINDING_INVALID", 409, "READINESS_BINDING_INVALID", "The agreement-readiness workspace has an invalid booking binding."],
    ["HOLD_APPLICATION_BINDING_INVALID", 409, "READINESS_BINDING_INVALID", "The converted hold no longer matches the booking application."],
    ["AGREEMENT_PARTY_BINDING_INVALID", 409, "PARTY_BINDING_INVALID", "Your private agreement particulars have an invalid binding."],
    ["AGREEMENT_SCHEDULE_BINDING_INVALID", 409, "SCHEDULE_BINDING_INVALID", "The protected property schedule has an invalid binding."],
    ["AGREEMENT_PARTY_SUBMISSION_CONFLICT", 409, "PARTY_SUBMISSION_CONFLICT", "Your particulars can no longer be submitted in this workspace."],
    ["AGREEMENT_PARTY_CONFIRMATION_CONFLICT", 409, "PARTY_CONFIRMATION_CONFLICT", "Your particulars can no longer be confirmed in this workspace."],
    ["AGREEMENT_PARTY_ALREADY_CONFIRMED", 409, "PARTY_ALREADY_CONFIRMED", "Your confirmed particulars cannot be replaced here."],
    ["AGREEMENT_PARTY_NOT_SUBMITTED", 409, "PARTY_NOT_SUBMITTED", "Submit your particulars before confirming them."],
    ["AGREEMENT_PARTY_DETAILS_INCOMPLETE", 409, "PARTY_DETAILS_INCOMPLETE", "Complete your required particulars before confirmation."],
    ["AGREEMENT_PARTIES_NOT_CONFIRMED", 409, "PARTIES_NOT_CONFIRMED", "Both parties must confirm their own particulars first."],
    ["AGREEMENT_SCHEDULE_CONFIRMATION_CONFLICT", 409, "SCHEDULE_CONFIRMATION_CONFLICT", "The property schedule can no longer be confirmed here."],
    ["AGREEMENT_READINESS_UPDATE_CONFLICT", 409, "READINESS_UPDATE_CONFLICT", "The agreement-readiness workspace changed. Reload and try again."],
    ["AGREEMENT_CANCELLATION_CONFLICT", 409, "READINESS_CANCELLATION_CONFLICT", "The agreement-readiness workspace can no longer be cancelled here."],
    ["AGREEMENT_READINESS_EXPIRED", 409, "READINESS_EXPIRED", "The agreement-readiness workspace has expired."],
    ["AGREEMENT_PARTY_INPUT_VERSION_INVALID", 400, "PARTY_INPUT_VERSION_INVALID", "The agreement-particulars version is outdated."],
    ["AGREEMENT_PARTY_CONSENT_REQUIRED", 400, "PARTY_CONSENT_REQUIRED", "Confirm the agreement-readiness acknowledgement."],
    ["AGREEMENT_CANCELLATION_REASON_INVALID", 400, "CANCELLATION_REASON_INVALID", "The cancellation reason must not exceed 500 characters."],
    ["AGREEMENT_PARTY_INPUT_INVALID", 400, "PARTY_INPUT_INVALID", "Submit valid structured agreement particulars."],
    ["AGREEMENT_PARTY_INPUT_FIELD_INVALID", 400, "PARTY_INPUT_INVALID", "The submitted agreement particulars contain an unsupported field."],
    ["AGREEMENT_LEGAL_NAME_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid legal name."],
    ["AGREEMENT_RELATION_TYPE_INVALID", 400, "PARTY_INPUT_INVALID", "Select a valid relation type."],
    ["AGREEMENT_RELATION_TYPE_REQUIRED", 400, "PARTY_INPUT_INVALID", "Select the applicable relation type."],
    ["AGREEMENT_RELATION_NAME_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid relation name."],
    ["AGREEMENT_RELATION_NAME_REQUIRED", 400, "PARTY_INPUT_INVALID", "Enter the applicable relation name."],
    ["AGREEMENT_ADDRESS_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid address."],
    ["AGREEMENT_LOCALITY_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid village or locality."],
    ["AGREEMENT_POST_OFFICE_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid post office."],
    ["AGREEMENT_POLICE_STATION_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid police station."],
    ["AGREEMENT_BLOCK_OR_MUNICIPALITY_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid block or municipality."],
    ["AGREEMENT_DISTRICT_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid district."],
    ["AGREEMENT_STATE_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid state."],
    ["AGREEMENT_PINCODE_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid six-digit PIN code."],
    ["AGREEMENT_IDENTITY_TYPE_INVALID", 400, "PARTY_INPUT_INVALID", "Select a valid identity-document type."],
    ["AGREEMENT_IDENTITY_REFERENCE_NOT_MASKED", 400, "PARTY_INPUT_INVALID", "Enter only a visibly masked identity reference."],
    ["AGREEMENT_AUTHORITY_CAPACITY_INVALID", 400, "PARTY_INPUT_INVALID", "Enter a valid authority capacity."],
  ];

  for (const [needle, status, code, publicMessage] of mappings) {
    if (message.includes(needle)) {
      return new MobilePropertyBookingAgreementReadinessError(
        status,
        code,
        publicMessage,
      );
    }
  }

  return new MobilePropertyBookingAgreementReadinessError(
    500,
    "AGREEMENT_OPERATION_FAILED",
    "The private agreement-readiness workspace could not be updated.",
  );
}

async function invokeAgreementRpc(
  name:
    | "create_property_unit_booking_agreement_readiness"
    | "submit_property_unit_booking_agreement_party_input"
    | "confirm_property_unit_booking_agreement_party_input"
    | "confirm_property_unit_booking_agreement_schedule"
    | "cancel_property_unit_booking_agreement_readiness",
  params: Record<string, unknown>,
) {
  const result = await getSupabaseAdmin().rpc(name, params);

  if (result.error || !result.data) {
    throw operationError(result.error);
  }

  const row = result.data as Row;
  const unitId = validUuid(row.unitId);

  if (!unitId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_OPERATION_FAILED",
      "The agreement-readiness authority returned an invalid unit.",
    );
  }

  return unitId;
}

export async function buildMobilePropertyBookingAgreementWorkspace(input: {
  userId: string;
  unitId: string;
}): Promise<MobilePropertyBookingAgreementWorkspace> {
  const userId = validUuid(input.userId);
  const unitId = validUuid(input.unitId);

  if (!userId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!unitId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "UNIT_ID_INVALID",
      "Select a valid property unit.",
    );
  }

  const admin = getSupabaseAdmin();
  const expiry = await admin.rpc(
    "expire_property_unit_booking_agreement_readiness",
    { target_limit: 100 },
  );

  if (expiry.error) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_WORKSPACE_FAILED",
      "The agreement-readiness expiry authority is unavailable.",
    );
  }

  const applicationWorkspace =
    await buildMobilePropertyBookingApplicationWorkspace({
      userId,
      unitId,
    });

  const readinessResult = await admin
    .from("property_unit_booking_agreement_readiness")
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

  if (readinessResult.error) {
    throw new MobilePropertyBookingAgreementReadinessError(
      500,
      "AGREEMENT_WORKSPACE_FAILED",
      "The private agreement-readiness workspace could not be loaded.",
    );
  }

  const privateRow = readinessResult.data as Row | null;
  const readiness = privateRow
    ? mapReadiness(privateRow)
    : null;
  const schedule = privateRow
    ? mapSchedule(privateRow)
    : null;

  const actor =
    privateRow?.owner_user_id === userId
      ? "owner"
      : privateRow?.buyer_user_id === userId
        ? "buyer"
        : applicationWorkspace.permissions.actor;

  let myPartyInput: MobilePropertyBookingAgreementPartyInput | null =
    null;
  let progressRows: Row[] = [];

  if (readiness) {
    const ownInputResult = await admin
      .from("property_unit_booking_agreement_party_inputs")
      .select("*")
      .eq("readiness_id", readiness.id)
      .eq("party_user_id", userId)
      .eq("party_role", actor)
      .maybeSingle();

    if (ownInputResult.error) {
      throw new MobilePropertyBookingAgreementReadinessError(
        500,
        "AGREEMENT_WORKSPACE_FAILED",
        "Your private agreement particulars could not be loaded.",
      );
    }

    if (ownInputResult.data) {
      myPartyInput = mapOwnPartyInput(
        ownInputResult.data as Row,
      );
    }

    const progressResult = await admin
      .from("property_unit_booking_agreement_party_inputs")
      .select("party_role,status,submitted_at,confirmed_at")
      .eq("readiness_id", readiness.id);

    if (progressResult.error) {
      throw new MobilePropertyBookingAgreementReadinessError(
        500,
        "AGREEMENT_WORKSPACE_FAILED",
        "Agreement-readiness progress could not be loaded.",
      );
    }

    progressRows = (progressResult.data ?? []) as Row[];
  }

  const buyerProgress = progressRows.find(
    (row) => row.party_role === "buyer",
  );
  const ownerProgress = progressRows.find(
    (row) => row.party_role === "owner",
  );

  const buyerDetailsSubmitted =
    buyerProgress?.status === "submitted" ||
    buyerProgress?.status === "confirmed";
  const ownerDetailsSubmitted =
    ownerProgress?.status === "submitted" ||
    ownerProgress?.status === "confirmed";
  const buyerDetailsConfirmed =
    buyerProgress?.status === "confirmed" &&
    Boolean(buyerProgress.confirmed_at);
  const ownerDetailsConfirmed =
    ownerProgress?.status === "confirmed" &&
    Boolean(ownerProgress.confirmed_at);

  const application = applicationWorkspace.application;
  const acceptedApplication =
    application?.status === "accepted" &&
    application.acceptedUntil !== null &&
    Date.parse(application.acceptedUntil) > Date.now();

  const activeReadiness =
    readiness?.status === "collecting_details" &&
    (readiness.remainingSeconds > 0 ||
      readiness.expiresAt === null);

  const ownSubmitted =
    myPartyInput?.status === "submitted";
  const ownConfirmed =
    myPartyInput?.status === "confirmed";

  return {
    generatedAt: new Date().toISOString(),
    unit: applicationWorkspace.unit,
    application,
    readiness,
    schedule,
    myPartyInput,
    progress: {
      buyerDetailsSubmitted,
      buyerDetailsConfirmed,
      ownerDetailsSubmitted,
      ownerDetailsConfirmed,
      propertyScheduleConfirmed:
        readiness?.propertyScheduleConfirmedAt !== null &&
        readiness?.propertyScheduleConfirmedAt !== undefined,
      readyForDraft:
        readiness?.status === "ready_for_draft" &&
        readiness.readyForDraftAt !== null,
    },
    permissions: {
      actor,
      canCreateReadiness:
        acceptedApplication &&
        readiness === null,
      canSubmitOwnDetails:
        acceptedApplication &&
        activeReadiness &&
        !ownConfirmed,
      canConfirmOwnDetails:
        acceptedApplication &&
        activeReadiness &&
        ownSubmitted,
      canConfirmPropertySchedule:
        actor === "owner" &&
        acceptedApplication &&
        activeReadiness &&
        buyerDetailsConfirmed &&
        ownerDetailsConfirmed &&
        readiness?.propertyScheduleConfirmedAt === null,
      canCancelReadiness:
        readiness !== null &&
        (
          readiness.status === "collecting_details" ||
          readiness.status === "ready_for_draft"
        ) &&
        (
          readiness.remainingSeconds > 0 ||
          readiness.expiresAt === null
        ),
      canViewReadiness: readiness !== null,
      canGenerateAdvisoryDraft: false,
      canApproveForExecution: false,
      canExecuteAgreement: false,
    },
    policy: {
      readinessVersion:
        MOBILE_PROPERTY_AGREEMENT_READINESS_VERSION,
      partyInputVersion:
        MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION,
      requiresAcceptedApplication: true,
      requiresReservedInventory: true,
      requiresBothPartyConfirmations: true,
      requiresAllFourBoundaries: true,
      usesServerOwnedPropertyPrice: true,
      legalProfileIdentifiersOnly: true,
      confidentialDocumentsOpened: false,
      aiDraftAdvisoryOnly: true,
      lawyerReviewRequired: true,
      paymentRequiredBeforeExecution: true,
      generatesAgreement: false,
      approvesAgreement: false,
      executesAgreement: false,
      createsPayment: false,
      marksInventorySold: false,
      transfersTitle: false,
      transfersOwnership: false,
    },
  };
}

export async function createMobilePropertyBookingAgreementReadiness(input: {
  actorUserId: string;
  request: MobilePropertyBookingAgreementReadinessCreate;
}) {
  const actorUserId = validUuid(input.actorUserId);
  const applicationId = validUuid(
    input.request.applicationId,
  );

  if (!actorUserId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!applicationId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "APPLICATION_ID_INVALID",
      "Select a valid accepted booking application.",
    );
  }

  const unitId = await invokeAgreementRpc(
    "create_property_unit_booking_agreement_readiness",
    {
      target_actor_user_id: actorUserId,
      target_application_id: applicationId,
    },
  );

  return buildMobilePropertyBookingAgreementWorkspace({
    userId: actorUserId,
    unitId,
  });
}

export async function submitMobilePropertyBookingAgreementPartyInput(input: {
  actorUserId: string;
  submission: MobilePropertyBookingAgreementPartySubmission;
}) {
  const actorUserId = validUuid(input.actorUserId);
  const readinessId = validUuid(
    input.submission.readinessId,
  );

  if (!actorUserId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!readinessId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "READINESS_ID_INVALID",
      "Select a valid agreement-readiness workspace.",
    );
  }

  if (
    input.submission.inputVersion !==
      MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION ||
    input.submission.consentAccepted !== true
  ) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "PARTY_CONSENT_REQUIRED",
      "Confirm the current agreement-readiness acknowledgement.",
    );
  }

  const unitId = await invokeAgreementRpc(
    "submit_property_unit_booking_agreement_party_input",
    {
      target_actor_user_id: actorUserId,
      target_readiness_id: readinessId,
      target_party_input: {
        legalName: clean(input.submission.legalName),
        relationType:
          input.submission.relationType ?? null,
        relationName:
          nullableText(input.submission.relationName),
        addressLine1:
          clean(input.submission.addressLine1),
        addressLine2:
          nullableText(input.submission.addressLine2),
        villageOrLocality:
          nullableText(input.submission.villageOrLocality),
        postOffice:
          nullableText(input.submission.postOffice),
        policeStation:
          nullableText(input.submission.policeStation),
        blockOrMunicipality:
          nullableText(input.submission.blockOrMunicipality),
        district: clean(input.submission.district),
        state: clean(input.submission.state),
        pincode: clean(input.submission.pincode),
        identityDocumentType:
          input.submission.identityDocumentType,
        identityMaskedReference:
          clean(input.submission.identityMaskedReference),
        authorityCapacity:
          nullableText(input.submission.authorityCapacity),
        inputVersion:
          MOBILE_PROPERTY_AGREEMENT_PARTY_INPUT_VERSION,
        consentAccepted: true,
      },
    },
  );

  return buildMobilePropertyBookingAgreementWorkspace({
    userId: actorUserId,
    unitId,
  });
}

export async function confirmMobilePropertyBookingAgreementPartyInput(input: {
  actorUserId: string;
  confirmation: MobilePropertyBookingAgreementPartyConfirmation;
}) {
  const actorUserId = validUuid(input.actorUserId);
  const readinessId = validUuid(
    input.confirmation.readinessId,
  );

  if (!actorUserId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!readinessId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "READINESS_ID_INVALID",
      "Select a valid agreement-readiness workspace.",
    );
  }

  const unitId = await invokeAgreementRpc(
    "confirm_property_unit_booking_agreement_party_input",
    {
      target_actor_user_id: actorUserId,
      target_readiness_id: readinessId,
    },
  );

  return buildMobilePropertyBookingAgreementWorkspace({
    userId: actorUserId,
    unitId,
  });
}

export async function confirmMobilePropertyBookingAgreementSchedule(input: {
  ownerUserId: string;
  confirmation: MobilePropertyBookingAgreementScheduleConfirmation;
}) {
  const ownerUserId = validUuid(input.ownerUserId);
  const readinessId = validUuid(
    input.confirmation.readinessId,
  );

  if (!ownerUserId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated owner reference is invalid.",
    );
  }

  if (!readinessId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "READINESS_ID_INVALID",
      "Select a valid agreement-readiness workspace.",
    );
  }

  const unitId = await invokeAgreementRpc(
    "confirm_property_unit_booking_agreement_schedule",
    {
      target_owner_user_id: ownerUserId,
      target_readiness_id: readinessId,
    },
  );

  return buildMobilePropertyBookingAgreementWorkspace({
    userId: ownerUserId,
    unitId,
  });
}

export async function cancelMobilePropertyBookingAgreementReadiness(input: {
  actorUserId: string;
  cancellation: MobilePropertyBookingAgreementCancellation;
}) {
  const actorUserId = validUuid(input.actorUserId);
  const readinessId = validUuid(
    input.cancellation.readinessId,
  );

  if (!actorUserId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!readinessId) {
    throw new MobilePropertyBookingAgreementReadinessError(
      400,
      "READINESS_ID_INVALID",
      "Select a valid agreement-readiness workspace.",
    );
  }

  const unitId = await invokeAgreementRpc(
    "cancel_property_unit_booking_agreement_readiness",
    {
      target_actor_user_id: actorUserId,
      target_readiness_id: readinessId,
      target_reason:
        nullableText(input.cancellation.reason),
    },
  );

  return buildMobilePropertyBookingAgreementWorkspace({
    userId: actorUserId,
    unitId,
  });
}
