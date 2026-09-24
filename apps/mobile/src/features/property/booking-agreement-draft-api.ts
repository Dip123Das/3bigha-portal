import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

export const PROPERTY_AGREEMENT_AI_DRAFT_VERSION =
  "property-agreement-ai-draft-v1" as const;

export const PROPERTY_AGREEMENT_DRAFT_FORMAT =
  "structured_json_v1" as const;

const AGREEMENT_DRAFT_GENERATION_TIMEOUT_MS = 180_000;

export type PropertyBookingAgreementAdvisoryDraftStatus =
  | "generation_pending"
  | "generated"
  | "lawyer_review_pending"
  | "lawyer_changes_requested"
  | "lawyer_approved"
  | "superseded"
  | "cancelled"
  | "generation_failed";

export type PropertyBookingAgreementAdvisoryDraftContent = {
  documentTitle: string;
  advisoryNotice: string;
  advisoryOnly: true;
  lawyerReviewRequired: true;
  parties: Record<string, unknown>;
  propertySchedule: Record<string, unknown>;
  financialTerms: Record<string, unknown>;
  clauses: Array<Record<string, unknown>>;
  lawyerReview: Record<string, unknown>;
  [key: string]: unknown;
};

export type PropertyBookingAgreementAdvisoryDraft = {
  id: string;
  readinessId: string;
  applicationId: string;
  unitId: string;
  projectId: string;
  version: number;
  status: PropertyBookingAgreementAdvisoryDraftStatus;
  promptVersion:
    typeof PROPERTY_AGREEMENT_AI_DRAFT_VERSION;
  draftFormat:
    typeof PROPERTY_AGREEMENT_DRAFT_FORMAT;
  draftContent:
    | PropertyBookingAgreementAdvisoryDraftContent
    | null;
  printableText: string | null;
  draftContentSha256: string | null;
  generationStartedAt: string | null;
  generatedAt: string | null;
  generationFailedAt: string | null;
  generationFailureCode: string | null;
  lawyerReviewRequired: true;
  advisoryOnly: true;
  legalEffectCreated: false;
  signingAllowed: false;
  registrationAllowed: false;
  executionAllowed: false;
  createsPayment: false;
  marksInventorySold: false;
  transfersTitle: false;
  transfersOwnership: false;
  createdAt: string;
  updatedAt: string;
};

export type PropertyBookingAgreementAdvisoryDraftWorkspace = {
  generatedAt: string;
  readinessId: string;
  draft:
    | PropertyBookingAgreementAdvisoryDraft
    | null;
  policy: {
    privateBoundPartyAccessOnly: true;
    confirmedParticularsOnly: true;
    maskedIdentityReferencesOnly: true;
    confidentialSourceLocatorsExposed: false;
    aiCredentialsExposed: false;
    aiRequestReferenceExposed: false;
    sourceSnapshotHashExposed: false;
    advisoryOnly: true;
    lawyerReviewRequired: true;
    legalEffectCreated: false;
    signingAllowed: false;
    registrationAllowed: false;
    executionAllowed: false;
    createsPayment: false;
    marksInventorySold: false;
    transfersTitle: false;
    transfersOwnership: false;
  };
};

export type PropertyBookingAgreementAdvisoryGenerationResult = {
  draftId: string;
  readinessId: string;
  status: string;
  readinessStatus: string;
  version: number;
  promptVersion:
    typeof PROPERTY_AGREEMENT_AI_DRAFT_VERSION;
  draftFormat:
    typeof PROPERTY_AGREEMENT_DRAFT_FORMAT;
  draftContentSha256: string;
  generatedAt: string | null;
  advisoryOnly: true;
  lawyerReviewRequired: true;
  legalEffectCreated: false;
  signingAllowed: false;
  registrationAllowed: false;
  executionAllowed: false;
  createsPayment: false;
  marksInventorySold: false;
  transfersTitle: false;
  transfersOwnership: false;
  replayed: boolean;
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function draftPath(
  readinessId: string,
  suffix = "",
) {
  return (
    "/api/v1/mobile/property-booking-agreement-readiness/" +
    encodeURIComponent(readinessId.trim()) +
    "/draft" +
    suffix
  );
}

export function loadPropertyBookingAgreementAdvisoryDraft(
  session: Session,
  readinessId: string,
): Promise<PropertyBookingAgreementAdvisoryDraftWorkspace> {
  return mobileApiRequest(
    session,
    draftPath(readinessId),
    {},
    "The private advisory agreement draft could not be loaded.",
  );
}

export function generatePropertyBookingAgreementAdvisoryDraft(
  session: Session,
  readinessId: string,
): Promise<PropertyBookingAgreementAdvisoryGenerationResult> {
  const normalizedReadinessId = readinessId.trim();

  return mobileApiRequest(
    session,
    draftPath(normalizedReadinessId, "/generate"),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        readinessId: normalizedReadinessId,
      }),
    },
    "The private advisory agreement draft could not be generated.",
    AGREEMENT_DRAFT_GENERATION_TIMEOUT_MS,
  );
}
