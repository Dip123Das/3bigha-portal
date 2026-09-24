import "server-only";

import type {
  MobilePropertyBookingAgreementAdvisoryDraft,
  MobilePropertyBookingAgreementAdvisoryDraftContent,
  MobilePropertyBookingAgreementAdvisoryDraftStatus,
  MobilePropertyBookingAgreementAdvisoryDraftWorkspace,
} from "@/lib/mobile/contracts/v1";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHA256 = /^[0-9a-f]{64}$/;

type Row = Record<string, any>;

type DraftReadErrorCode =
  | "USER_ID_INVALID"
  | "READINESS_ID_INVALID"
  | "AGREEMENT_DRAFT_NOT_FOUND"
  | "AGREEMENT_DRAFT_READ_FAILED"
  | "AGREEMENT_DRAFT_RECORD_INVALID";

export class MobilePropertyBookingAgreementDraftReadError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: DraftReadErrorCode,
    message: string,
  ) {
    super(message);
    this.name =
      "MobilePropertyBookingAgreementDraftReadError";
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

function safeTimestamp(value: unknown) {
  const text = nullableText(value);

  if (!text || !Number.isFinite(Date.parse(text))) {
    return null;
  }

  return text;
}

function safePositiveInteger(value: unknown) {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isDraftStatus(
  value: unknown,
): value is MobilePropertyBookingAgreementAdvisoryDraftStatus {
  return [
    "generation_pending",
    "generated",
    "lawyer_review_pending",
    "lawyer_changes_requested",
    "lawyer_approved",
    "superseded",
    "cancelled",
    "generation_failed",
  ].includes(clean(value));
}

function mapDraftContent(
  value: unknown,
): MobilePropertyBookingAgreementAdvisoryDraftContent | null {
  if (!isRecord(value)) {
    return null;
  }

  const documentTitle = clean(value.documentTitle);
  const advisoryNotice = clean(value.advisoryNotice);
  const parties = value.parties;
  const propertySchedule = value.propertySchedule;
  const financialTerms = value.financialTerms;
  const clauses = value.clauses;
  const lawyerReview = value.lawyerReview;

  if (
    !documentTitle ||
    !advisoryNotice ||
    value.advisoryOnly !== true ||
    value.lawyerReviewRequired !== true ||
    !isRecord(parties) ||
    !isRecord(propertySchedule) ||
    !isRecord(financialTerms) ||
    !Array.isArray(clauses) ||
    clauses.length < 1 ||
    !clauses.every(isRecord) ||
    !isRecord(lawyerReview)
  ) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_RECORD_INVALID",
      "The generated advisory draft is structurally invalid.",
    );
  }

  return {
    ...value,
    documentTitle,
    advisoryNotice,
    advisoryOnly: true,
    lawyerReviewRequired: true,
    parties,
    propertySchedule,
    financialTerms,
    clauses,
    lawyerReview,
  };
}

function mapDraft(
  row: Row,
): MobilePropertyBookingAgreementAdvisoryDraft {
  const id = validUuid(row.id);
  const readinessId = validUuid(row.readiness_id);
  const applicationId = validUuid(row.application_id);
  const unitId = validUuid(row.unit_id);
  const projectId = validUuid(row.project_id);
  const version = safePositiveInteger(row.version);
  const status = clean(row.status);
  const promptVersion = clean(row.prompt_version);
  const draftFormat = clean(row.draft_format);
  const draftContentSha256 =
    nullableText(row.draft_content_sha256);
  const createdAt = safeTimestamp(row.created_at);
  const updatedAt = safeTimestamp(row.updated_at);

  if (
    !id ||
    !readinessId ||
    !applicationId ||
    !unitId ||
    !projectId ||
    !version ||
    !isDraftStatus(status) ||
    promptVersion !== "property-agreement-ai-draft-v1" ||
    draftFormat !== "structured_json_v1" ||
    !createdAt ||
    !updatedAt ||
    row.lawyer_review_required !== true ||
    row.advisory_only !== true ||
    row.legal_effect_created !== false ||
    row.signing_allowed !== false ||
    row.registration_allowed !== false ||
    row.execution_allowed !== false ||
    row.creates_payment !== false ||
    row.marks_inventory_sold !== false ||
    row.transfers_title !== false ||
    row.transfers_ownership !== false
  ) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_RECORD_INVALID",
      "The private advisory-draft record is invalid.",
    );
  }

  if (
    draftContentSha256 !== null &&
    !SHA256.test(draftContentSha256)
  ) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_RECORD_INVALID",
      "The private advisory-draft digest is invalid.",
    );
  }

  const contentExpected = [
    "generated",
    "lawyer_review_pending",
    "lawyer_changes_requested",
    "lawyer_approved",
    "superseded",
  ].includes(status);

  const draftContent = contentExpected
    ? mapDraftContent(row.draft_content_json)
    : null;

  const printableText = contentExpected
    ? nullableText(row.printable_text)
    : null;

  if (
    contentExpected &&
    (
      !draftContent ||
      !printableText ||
      !draftContentSha256
    )
  ) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_RECORD_INVALID",
      "The generated advisory-draft content is incomplete.",
    );
  }

  return {
    id,
    readinessId,
    applicationId,
    unitId,
    projectId,
    version,
    status,
    promptVersion: "property-agreement-ai-draft-v1",
    draftFormat: "structured_json_v1",
    draftContent,
    printableText,
    draftContentSha256:
      contentExpected ? draftContentSha256 : null,
    generationStartedAt:
      safeTimestamp(row.generation_started_at),
    generatedAt: safeTimestamp(row.generated_at),
    generationFailedAt:
      safeTimestamp(row.generation_failed_at),
    generationFailureCode:
      status === "generation_failed"
        ? nullableText(row.generation_failure_code)
        : null,
    lawyerReviewRequired: true,
    advisoryOnly: true,
    legalEffectCreated: false,
    signingAllowed: false,
    registrationAllowed: false,
    executionAllowed: false,
    createsPayment: false,
    marksInventorySold: false,
    transfersTitle: false,
    transfersOwnership: false,
    createdAt,
    updatedAt,
  };
}

export async function buildMobilePropertyBookingAgreementAdvisoryDraftWorkspace(
  input: {
    userId: string;
    readinessId: string;
  },
): Promise<MobilePropertyBookingAgreementAdvisoryDraftWorkspace> {
  const userId = validUuid(input.userId);
  const readinessId = validUuid(input.readinessId);

  if (!userId) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      400,
      "USER_ID_INVALID",
      "The authenticated user reference is invalid.",
    );
  }

  if (!readinessId) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      400,
      "READINESS_ID_INVALID",
      "Select a valid agreement-readiness workspace.",
    );
  }

  const admin = getSupabaseAdmin();

  /*
   * The identity columns are used only for the service-side access
   * predicate. They are never returned by this projection.
   */
  const readinessResult = await admin
    .from("property_unit_booking_agreement_readiness")
    .select("id")
    .eq("id", readinessId)
    .or(
      "buyer_user_id.eq." +
        userId +
        ",owner_user_id.eq." +
        userId,
    )
    .maybeSingle();

  if (readinessResult.error) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_READ_FAILED",
      "The private advisory-draft workspace could not be loaded.",
    );
  }

  if (!readinessResult.data) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      404,
      "AGREEMENT_DRAFT_NOT_FOUND",
      "The private advisory-draft workspace was not found.",
    );
  }

  const draftResult = await admin
    .from("property_unit_booking_agreement_drafts")
    .select(
      [
        "id",
        "readiness_id",
        "application_id",
        "unit_id",
        "project_id",
        "version",
        "status",
        "prompt_version",
        "draft_format",
        "draft_content_json",
        "printable_text",
        "draft_content_sha256",
        "generation_started_at",
        "generated_at",
        "generation_failed_at",
        "generation_failure_code",
        "lawyer_review_required",
        "advisory_only",
        "legal_effect_created",
        "signing_allowed",
        "registration_allowed",
        "execution_allowed",
        "creates_payment",
        "marks_inventory_sold",
        "transfers_title",
        "transfers_ownership",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("readiness_id", readinessId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftResult.error) {
    throw new MobilePropertyBookingAgreementDraftReadError(
      500,
      "AGREEMENT_DRAFT_READ_FAILED",
      "The private advisory draft could not be loaded.",
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    readinessId,
    draft: draftResult.data
      ? mapDraft(draftResult.data as Row)
      : null,
    policy: {
      privateBoundPartyAccessOnly: true,
      confirmedParticularsOnly: true,
      maskedIdentityReferencesOnly: true,
      confidentialSourceLocatorsExposed: false,
      aiCredentialsExposed: false,
      aiRequestReferenceExposed: false,
      sourceSnapshotHashExposed: false,
      advisoryOnly: true,
      lawyerReviewRequired: true,
      legalEffectCreated: false,
      signingAllowed: false,
      registrationAllowed: false,
      executionAllowed: false,
      createsPayment: false,
      marksInventorySold: false,
      transfersTitle: false,
      transfersOwnership: false,
    },
  };
}
