import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

import type {
  PropertyBookingApplication,
} from "./booking-application-api";
import type {
  PropertyLegalReviewWorkspace,
} from "./legal-review-api";

export const PROPERTY_AGREEMENT_READINESS_VERSION =
  "property-agreement-readiness-v1" as const;

export const PROPERTY_AGREEMENT_PARTY_INPUT_VERSION =
  "property-agreement-party-input-v1" as const;

export type PropertyBookingAgreementReadinessStatus =
  | "collecting_details"
  | "ready_for_draft"
  | "draft_generated"
  | "parties_reviewing"
  | "changes_requested"
  | "approved_for_execution"
  | "cancelled"
  | "expired";

export type PropertyBookingAgreementPartyRole =
  | "buyer"
  | "owner";

export type PropertyBookingAgreementPartyStatus =
  | "incomplete"
  | "submitted"
  | "confirmed"
  | "changes_requested";

export type PropertyBookingAgreementIdentityDocumentType =
  | "pan"
  | "aadhaar"
  | "voter_id"
  | "passport"
  | "driving_licence"
  | "company_registration"
  | "other";

export type PropertyBookingAgreementRelationType =
  | "father"
  | "mother"
  | "spouse"
  | "guardian"
  | "authorized_representative";

export type PropertyBookingAgreementPrintPageSize =
  | "A4"
  | "LEGAL"
  | "CUSTOM_STAMP_PAPER";

export type PropertyBookingAgreementPrintLayout = {
  pageSize: PropertyBookingAgreementPrintPageSize;
  orientation: "portrait";
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  customPageWidthMm: number | null;
  customPageHeightMm: number | null;
};

export type PropertyBookingAgreementSchedule = {
  unitCode: string;
  unitTitle: string | null;
  unitKind: string;
  projectName: string | null;
  quotedPropertyPricePaise: number;
  currency: "INR";
  plotAreaSqft: number | null;
  builtUpSqft: number | null;
  carpetSqft: number | null;
  superBuiltUpSqft: number | null;
  dimensionLengthFt: number | null;
  dimensionWidthFt: number | null;
  floorNumber: number | null;
  unitNumber: string | null;
  facing: string | null;
  boundaryNorth: string;
  boundarySouth: string;
  boundaryEast: string;
  boundaryWest: string;
  boundaryDemarcation: string | null;
  plotNumbers: string[];
  deedNumbers: string[];
  mutationNumbers: string[];
  khatianNumbers: string[];
  propertyAddress: string | null;
  printLayout: PropertyBookingAgreementPrintLayout;
};

export type PropertyBookingAgreementPartyInput = {
  role: PropertyBookingAgreementPartyRole;
  status: PropertyBookingAgreementPartyStatus;
  legalName: string | null;
  relationType:
    | PropertyBookingAgreementRelationType
    | null;
  relationName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  villageOrLocality: string | null;
  postOffice: string | null;
  policeStation: string | null;
  blockOrMunicipality: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  identityDocumentType:
    | PropertyBookingAgreementIdentityDocumentType
    | null;
  identityMaskedReference: string | null;
  authorityCapacity: string | null;
  inputVersion:
    typeof PROPERTY_AGREEMENT_PARTY_INPUT_VERSION;
  consentAccepted: boolean;
  consentAcceptedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
};

export type PropertyBookingAgreementReadiness = {
  id: string;
  applicationId: string;
  holdId: string;
  unitId: string;
  projectId: string;
  advanceRequestId: string | null;
  status: PropertyBookingAgreementReadinessStatus;
  readinessVersion:
    typeof PROPERTY_AGREEMENT_READINESS_VERSION;
  buyerDetailsConfirmedAt: string | null;
  ownerDetailsConfirmedAt: string | null;
  propertyScheduleConfirmedAt: string | null;
  readyForDraftAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  remainingSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type PropertyBookingAgreementProgress = {
  buyerDetailsSubmitted: boolean;
  buyerDetailsConfirmed: boolean;
  ownerDetailsSubmitted: boolean;
  ownerDetailsConfirmed: boolean;
  propertyScheduleConfirmed: boolean;
  readyForDraft: boolean;
};

export type PropertyBookingAgreementPermissions = {
  actor: PropertyBookingAgreementPartyRole;
  canCreateReadiness: boolean;
  canSubmitOwnDetails: boolean;
  canConfirmOwnDetails: boolean;
  canConfirmPropertySchedule: boolean;
  canCancelReadiness: boolean;
  canViewReadiness: boolean;
  canGenerateAdvisoryDraft: false;
  canApproveForExecution: false;
  canExecuteAgreement: false;
};

export type PropertyBookingAgreementWorkspace = {
  generatedAt: string;
  unit: PropertyLegalReviewWorkspace["unit"];
  application: PropertyBookingApplication | null;
  readiness: PropertyBookingAgreementReadiness | null;
  schedule: PropertyBookingAgreementSchedule | null;
  myPartyInput: PropertyBookingAgreementPartyInput | null;
  progress: PropertyBookingAgreementProgress;
  permissions: PropertyBookingAgreementPermissions;
  policy: {
    readinessVersion:
      typeof PROPERTY_AGREEMENT_READINESS_VERSION;
    partyInputVersion:
      typeof PROPERTY_AGREEMENT_PARTY_INPUT_VERSION;
    requiresAcceptedApplication: true;
    requiresReservedInventory: true;
    requiresBothPartyConfirmations: true;
    requiresAllFourBoundaries: true;
    usesServerOwnedPropertyPrice: true;
    legalProfileIdentifiersOnly: true;
    confidentialDocumentsOpened: false;
    aiDraftAdvisoryOnly: true;
    lawyerReviewRequired: true;
    paymentRequiredBeforeExecution: true;
    generatesAgreement: false;
    approvesAgreement: false;
    executesAgreement: false;
    createsPayment: false;
    marksInventorySold: false;
    transfersTitle: false;
    transfersOwnership: false;
  };
};

export type PropertyBookingAgreementPartySubmission = {
  readinessId: string;
  legalName: string;
  relationType?:
    | PropertyBookingAgreementRelationType
    | null;
  relationName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  villageOrLocality?: string | null;
  postOffice?: string | null;
  policeStation?: string | null;
  blockOrMunicipality?: string | null;
  district: string;
  state: string;
  pincode: string;
  identityDocumentType:
    PropertyBookingAgreementIdentityDocumentType;
  identityMaskedReference: string;
  authorityCapacity?: string | null;
  consentAccepted: true;
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function readinessPath(
  readinessId: string,
  suffix: string,
) {
  return (
    "/api/v1/mobile/property-booking-agreement-readiness/" +
    encodeURIComponent(readinessId.trim()) +
    suffix
  );
}

export function loadPropertyBookingAgreementReadiness(
  session: Session,
  unitId: string,
): Promise<PropertyBookingAgreementWorkspace> {
  const params = new URLSearchParams({
    unitId: unitId.trim(),
  });

  const requestPath =
    "/api/v1/mobile/property-booking-agreement-readiness?" +
    params.toString();

  return mobileApiRequest(
    session,
    requestPath,
    {},
    "The private agreement-readiness workspace could not be loaded.",
  );
}

export function createPropertyBookingAgreementReadiness(
  session: Session,
  applicationId: string,
): Promise<PropertyBookingAgreementWorkspace> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-agreement-readiness",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        applicationId: applicationId.trim(),
      }),
    },
    "The private agreement-readiness workspace could not be created.",
  );
}

export function submitPropertyBookingAgreementPartyInput(
  session: Session,
  input: PropertyBookingAgreementPartySubmission,
): Promise<PropertyBookingAgreementWorkspace> {
  const requestPath = readinessPath(
    input.readinessId,
    "/party",
  );

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        readinessId: input.readinessId.trim(),
        legalName: input.legalName.trim(),
        relationType: input.relationType ?? null,
        relationName: input.relationName?.trim() || null,
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2?.trim() || null,
        villageOrLocality:
          input.villageOrLocality?.trim() || null,
        postOffice: input.postOffice?.trim() || null,
        policeStation:
          input.policeStation?.trim() || null,
        blockOrMunicipality:
          input.blockOrMunicipality?.trim() || null,
        district: input.district.trim(),
        state: input.state.trim(),
        pincode: input.pincode.trim(),
        identityDocumentType:
          input.identityDocumentType,
        identityMaskedReference:
          input.identityMaskedReference.trim(),
        authorityCapacity:
          input.authorityCapacity?.trim() || null,
        inputVersion:
          PROPERTY_AGREEMENT_PARTY_INPUT_VERSION,
        consentAccepted: true,
      }),
    },
    "Your private agreement particulars could not be submitted.",
  );
}

export function confirmPropertyBookingAgreementPartyInput(
  session: Session,
  readinessId: string,
): Promise<PropertyBookingAgreementWorkspace> {
  const requestPath = readinessPath(
    readinessId,
    "/party/confirm",
  );

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        readinessId: readinessId.trim(),
      }),
    },
    "Your private agreement particulars could not be confirmed.",
  );
}

export function confirmPropertyBookingAgreementSchedule(
  session: Session,
  readinessId: string,
): Promise<PropertyBookingAgreementWorkspace> {
  const requestPath = readinessPath(
    readinessId,
    "/schedule/confirm",
  );

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        readinessId: readinessId.trim(),
      }),
    },
    "The protected property schedule could not be confirmed.",
  );
}

export function cancelPropertyBookingAgreementReadiness(
  session: Session,
  input: {
    readinessId: string;
    reason?: string | null;
  },
): Promise<PropertyBookingAgreementWorkspace> {
  const requestPath = readinessPath(
    input.readinessId,
    "/cancel",
  );

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        readinessId: input.readinessId.trim(),
        reason: input.reason?.trim() || null,
      }),
    },
    "The private agreement-readiness workspace could not be cancelled.",
  );
}
