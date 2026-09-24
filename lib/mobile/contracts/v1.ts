import type { CanonicalCompletionState, CanonicalVerificationState } from "@/lib/identity/resolveCanonicalIdentity";

export const MOBILE_API_VERSION = "1" as const;
export const MOBILE_CONTRACT_VERSION = "2026-08-09" as const;

export type MobileDashboardKey =
  | "admin_home"
  | "blog_admin_home"
  | "banker_home"
  | "investor_home"
  | "vendor_home"
  | "publisher_home"
  | "buyer_home";

export type MobileRequiredAction =
  | "none"
  | "select_role"
  | "complete_basic_profile"
  | "complete_business_profile"
  | "complete_profile_setup"
  | "review_growth_plan"
  | "contact_support";

export type MobileApiErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_SESSION"
  | "CONFIGURATION_ERROR"
  | "BOOTSTRAP_FAILED"
  | "PROPERTY_WORKSPACE_FAILED"
  | "PROPERTY_DISCOVERY_FAILED"
  | "TRUSTED_MEDIA_FAILED"
  | "PROPERTY_LEGAL_REVIEW_FAILED"
  | "PROPERTY_BOOKING_HOLD_FAILED"
  | "PROPERTY_BOOKING_APPLICATION_FAILED"
  | "PROPERTY_BOOKING_ADVANCE_FAILED"
  | "PROPERTY_AGREEMENT_READINESS_FAILED";

export type MobileOnboardingPath = "customer" | "business" | "individual_professional";

export type MobileIdentityOption = {
  key: string;
  label: string;
  localLabel: string | null;
  family: string;
  description: string | null;
  registrationScopes: string[];
  requiresBusinessOnboarding: boolean;
  requiresVerification: boolean;
  lifetimeFreeCandidate: boolean;
  redirectToBusiness: boolean;
};

export type MobileRegistrationLegalConstitution = {
  key: string;
  label: string;
  description: string | null;
};

export type MobileRegistrationBusinessSector = {
  key: string;
  title: string;
  description: string | null;
  symbol: string | null;
};

export type MobileRegistrationSectorMapping = {
  identityKey: string;
  sectorKey: string;
  natureModules: string[];
};

export type MobileRegistrationCatalogue = {
  legalConstitutions: MobileRegistrationLegalConstitution[];
  businessSectors: MobileRegistrationBusinessSector[];
  sectorMappings: MobileRegistrationSectorMapping[];
};

export type MobileEvidenceAsset = {
  id: string;
  bucket: "registration-evidence";
  path: string;
  /**
   * Registration evidence is private. Review UIs must request a short-lived
   * signed URL from an authorised server endpoint.
   */
  url: null;
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
  kind: "image" | "document";
  captureSource: "live_camera" | "file_upload";
  captureTimestamp: string;
  serverReceivedAt: string;
  evidenceBindingSha256: string;
  captureMetadata: {
    latitude: number; longitude: number; accuracy: number;
    altitude: number | null; altitudeAccuracy: number | null;
    heading: number | null; speed: number | null;
    locationTimestamp: string; locationAgeMs: number; mocked: boolean | null;
    cameraOpenedAt: string; deviceCapturedAt: string; timezone: string;
    utcOffsetMinutes: number; platform: string; cameraFacing: "front" | "back";
  } | null;
  evidenceCategory: string;
};

export type MobileOnboardingState = {
  path: MobileOnboardingPath | null;
  catalogue: MobileRegistrationCatalogue;
  identityOptions: MobileIdentityOption[];
  selectedIdentityKeys: string[];
  primaryIdentityKey: string | null;
  profile: { fullName: string; phone: string; state: string; district: string; pincode: string };
  business: {
    businessName: string;
    businessType: string;
    businessIdentities: string[];
    individualIdentities: string[];
    natureOfBusiness: string[];
    state: string;
    district: string;
    city: string;
    pincode: string;
    locationStatus: string;
    approvalStatus: string;
    registrationComplete: boolean;
  };
  evidence: {
    selfieCaptured: boolean;
    workPhotoCount: number;
    documentCount: number;
  };
  verification: { status: string; reasons: string[]; canActivateDashboard: boolean };
};

export type MobileApiSuccess<T> = {
  ok: true;
  apiVersion: typeof MOBILE_API_VERSION;
  contractVersion: typeof MOBILE_CONTRACT_VERSION;
  data: T;
};

export type MobileApiFailure = {
  ok: false;
  apiVersion: typeof MOBILE_API_VERSION;
  error: {
    code: MobileApiErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type MobileBootstrap = {
  person: {
    id: string;
    email: string | null;
    displayName: string;
  };
  registration: {
    state: string;
    reason: string;
    completion: CanonicalCompletionState;
    requiredAction: MobileRequiredAction;
  };
  identity: {
    primaryRole: string;
    businessName: string;
    businessIdentityKeys: string[];
    individualIdentityKeys: string[];
    approvalStatus: string;
    verification: {
      human: CanonicalVerificationState;
      selfie: CanonicalVerificationState;
      business: CanonicalVerificationState;
    };
  };
  navigation: {
    primaryDashboard: MobileDashboardKey;
    primaryWebPath: string;
    unifiedWorkspacePath: string;
    items: Array<{ key: string; label: string; webPath: string }>;
  };
  capabilities: {
    legacy: string[];
    operating: string[];
    groups: Record<string, string[]>;
  };
};

export type MobileDashboardMetric = {
  key: string;
  label: string;
  value: number | null;
  webPath: string;
};

export type MobileDashboardAggregate = {
  dashboard: MobileDashboardKey;
  generatedAt: string;
  metrics: MobileDashboardMetric[];
};

export type MobilePropertyWorkspaceProject = {
  id: string;
  name: string;
  slug: string;
  projectKind: string;
  status: string;
  city: string;
  district: string;
  state: string;
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  pricedUnits: number;
  trustedUnits: number;
  webPath: string;
};

export type MobilePropertyWorkspace = {
  generatedAt: string;
  access: {
    canManageOwnerListings: boolean;
    canManageBuilderProjects: boolean;
  };
  destinations: {
    ownerListings: "/property/my";
    builderProjects: "/property/builder/projects";
    buyerProjects: "/property/projects";
    buyerInventory: "/property/inventory";
  };
  owner: {
    totalListings: number;
    draftListings: number;
    pendingListings: number;
    approvedListings: number;
    rejectedListings: number;
  };
  builder: {
    totalProjects: number;
    activeProjects: number;
    totalUnits: number;
    availableUnits: number;
    reservedUnits: number;
    soldUnits: number;
    pricedUnits: number;
    trustedUnits: number;
    projects: MobilePropertyWorkspaceProject[];
  };
};

export type MobilePropertyUnitStatus =
  | "available"
  | "hold"
  | "booked"
  | "sold"
  | "blocked";

export type MobilePropertyDiscoveryProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  updatedAt: string | null;
  verifiedUnitCount: number;
  availableUnitCount: number;
  webPath: string;
};

export type MobilePropertyDiscoveryCatalogue = {
  id: string;
  kind: string;
  name: string;
  slug: string;
  sortOrder: number | null;
};

export type MobilePropertyDiscoveryUnit = {
  id: string;
  catalogueId: string | null;
  unitCode: string | null;
  title: string | null;
  unitKind: string;
  tower: string | null;
  block: string | null;
  floorNumber: number | null;
  unitNumber: string | null;
  facing: string | null;
  status: MobilePropertyUnitStatus;
  price: number | null;
  plotAreaSqft: number | null;
  builtUpAreaSqft: number | null;
  carpetAreaSqft: number | null;
  superBuiltUpAreaSqft: number | null;
  dimensionLengthFt: number | null;
  dimensionWidthFt: number | null;
  boundaryNorth: string | null;
  boundarySouth: string | null;
  boundaryEast: string | null;
  boundaryWest: string | null;
  landVacancyStatus: string | null;
  existingStructureType: string | null;
  boundaryDemarcationType: string | null;
  trustStatus: "verified";
  listingId: string | null;
  listingWebPath: string | null;
  updatedAt: string | null;
};

export type MobilePropertyLayoutPlacement = {
  unitId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  labelOverride: string | null;
};

export type MobilePropertyPublishedLayout = {
  id: string;
  version: number;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  placements: MobilePropertyLayoutPlacement[];
};

export type MobilePropertyProjectPreview = {
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    updatedAt: string | null;
    webPath: string;
  };
  catalogues: MobilePropertyDiscoveryCatalogue[];
  units: MobilePropertyDiscoveryUnit[];
  layout: MobilePropertyPublishedLayout | null;
};

export type MobilePropertyDiscovery = {
  generatedAt: string;
  projects: MobilePropertyDiscoveryProject[];
  selectedProject: MobilePropertyProjectPreview | null;
};

export type MobilePropertyLegalReviewStatus =
  | "requested"
  | "granted"
  | "declined"
  | "revoked"
  | "expired";

export type MobilePropertyLegalReviewRequest = {
  id: string;
  projectId: string;
  unitId: string;
  status: MobilePropertyLegalReviewStatus;
  purpose: string;
  consentVersion: string;
  buyerConsentAt: string;
  requestedAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  decisionNote: string | null;
};

export type MobilePropertyLegalReviewDocument = {
  id: string;
  documentType: string;
  title: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  analysisStatus: string | null;
  analysisConfidence: number | null;
  summary: string | null;
  warnings: string[];
  createdAt: string;
};

export type MobilePropertyLegalReviewUnit = {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  unitCode: string | null;
  title: string | null;
  unitKind: string;
  status: MobilePropertyUnitStatus;
  trustStatus: "verified";
};

export type MobilePropertyLegalReviewPermissions = {
  actor: "buyer" | "owner";
  canRequestReview: boolean;
  canDecideReview: boolean;
  canRevokeReview: boolean;
  canViewDocuments: boolean;
};

export type MobilePropertyLegalReviewWorkspace = {
  generatedAt: string;
  unit: MobilePropertyLegalReviewUnit;
  request: MobilePropertyLegalReviewRequest | null;
  documents: MobilePropertyLegalReviewDocument[];
  permissions: MobilePropertyLegalReviewPermissions;
  policy: {
    consentVersion: string;
    accessExpires: boolean;
    documentViewsAreAudited: true;
    signedAccessIsShortLived: true;
  };
};

export type MobilePropertyLegalReviewDecision = {
  requestId: string;
  status: "granted" | "declined" | "revoked";
  decisionNote?: string | null;
};

export type MobilePropertyLegalDocumentAccess = {
  documentId: string;
  expiresAt: string;
  accessUrl: string;
};

export type MobilePropertyUnitHoldStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "converted";

export type MobilePropertyUnitHoldEligibilityReason =
  | "eligible"
  | "legal_review_required"
  | "legal_review_expired"
  | "unit_not_verified"
  | "unit_not_transaction_ready"
  | "unit_not_available"
  | "unit_already_held"
  | "self_hold_forbidden";

export type MobilePropertyUnitHold = {
  id: string;
  unitId: string;
  projectId: string;
  legalReviewRequestId: string;
  status: MobilePropertyUnitHoldStatus;
  heldAt: string;
  expiresAt: string;
  releasedAt: string | null;
  remainingSeconds: number;
};

export type MobilePropertyUnitHoldEligibility = {
  eligible: boolean;
  reason: MobilePropertyUnitHoldEligibilityReason;
  legalReviewRequestId: string | null;
};

export type MobilePropertyUnitHoldPermissions = {
  actor: "buyer" | "owner";
  canAcquireHold: boolean;
  canCancelHold: boolean;
  canViewHold: boolean;
};

export type MobilePropertyUnitHoldWorkspace = {
  generatedAt: string;
  unit: MobilePropertyLegalReviewUnit;
  eligibility: MobilePropertyUnitHoldEligibility;
  hold: MobilePropertyUnitHold | null;
  permissions: MobilePropertyUnitHoldPermissions;
  policy: {
    intentVersion: "property-unit-booking-intent-v1";
    holdDurationSeconds: 900;
    requiresGrantedLegalReview: true;
    createsPayment: false;
    createsAgreement: false;
    transfersOwnership: false;
  };
};

export type MobilePropertyUnitHoldAcquire = {
  unitId: string;
  legalReviewRequestId: string;
  intentVersion: "property-unit-booking-intent-v1";
  acknowledgedAt: string;
};

export type MobilePropertyUnitHoldCancellation = {
  holdId: string;
  reason?: string | null;
};

export type MobilePropertyBookingApplicationStatus =
  | "submitted"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export type MobilePropertyBookingApplication = {
  id: string;
  holdId: string;
  unitId: string;
  projectId: string;
  legalReviewRequestId: string;
  status: MobilePropertyBookingApplicationStatus;
  buyerMessage: string | null;
  submittedAt: string;
  decisionDueAt: string;
  ownerDecidedAt: string | null;
  ownerDecisionNote: string | null;
  acceptedUntil: string | null;
  endedAt: string | null;
  remainingDecisionSeconds: number;
  remainingAcceptedSeconds: number;
};

export type MobilePropertyBookingApplicationPermissions = {
  actor: "buyer" | "owner";
  canSubmitApplication: boolean;
  canCancelApplication: boolean;
  canAcceptApplication: boolean;
  canDeclineApplication: boolean;
  canViewApplication: boolean;
};

export type MobilePropertyBookingApplicationWorkspace = {
  generatedAt: string;
  unit: MobilePropertyLegalReviewUnit;
  hold: MobilePropertyUnitHold | null;
  application: MobilePropertyBookingApplication | null;
  permissions: MobilePropertyBookingApplicationPermissions;
  policy: {
    intentVersion: "property-unit-booking-application-v1";
    ownerDecisionWindowSeconds: 172800;
    acceptedNextStepWindowSeconds: 172800;
    requiresActiveBuyerHold: true;
    keepsInventoryReserved: true;
    createsPayment: false;
    createsAgreement: false;
    marksInventorySold: false;
    transfersOwnership: false;
  };
};

export type MobilePropertyBookingApplicationSubmit = {
  holdId: string;
  intentVersion: "property-unit-booking-application-v1";
  acknowledgedAt: string;
  buyerMessage?: string | null;
};

export type MobilePropertyBookingApplicationDecision = {
  decision: "accepted" | "declined";
  decisionNote?: string | null;
};

export type MobilePropertyBookingApplicationCancellation = {
  reason?: string | null;
};
export type MobilePropertyBookingAdvanceStatus =
  | "owner_proposed"
  | "buyer_confirmed"
  | "gateway_configuration_pending"
  | "gateway_order_created"
  | "payment_pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "review_required";

export type MobilePropertyBookingAdvanceGatewayReadiness =
  | "configuration_pending"
  | "ready";

export type MobilePropertyBookingAdvance = {
  id: string;
  applicationId: string;
  holdId: string;
  unitId: string;
  projectId: string;
  quotedPropertyPricePaise: number;
  advanceAmountPaise: number;
  currency: "INR";
  provider: "sbi_payment_gateway";
  pricingSource: "builder_inventory_pricing";
  pricingSnapshotAt: string;
  ownerTermsNote: string | null;
  ownerProposedAt: string;
  buyerConsentVersion: string | null;
  buyerConsentedAt: string | null;
  status: MobilePropertyBookingAdvanceStatus;
  expiresAt: string;
  cancelledAt: string | null;
  remainingSeconds: number;
};

export type MobilePropertyBookingAdvancePermissions = {
  actor: "buyer" | "owner";
  canProposeAdvance: boolean;
  canConfirmAdvance: boolean;
  canCancelAdvance: boolean;
  canViewAdvance: boolean;
  canCreateGatewayOrder: false;
};

export type MobilePropertyBookingAdvanceWorkspace = {
  generatedAt: string;
  unit: MobilePropertyLegalReviewUnit;
  application: MobilePropertyBookingApplication | null;
  advance: MobilePropertyBookingAdvance | null;
  permissions: MobilePropertyBookingAdvancePermissions;
  gateway: {
    provider: "sbi_payment_gateway";
    readiness: MobilePropertyBookingAdvanceGatewayReadiness;
    configured: boolean;
  };
  policy: {
    consentVersion: "property-booking-advance-v1";
    requiresAcceptedApplication: true;
    requiresReservedInventory: true;
    usesServerOwnedPropertyPrice: true;
    createsGatewayOrder: false;
    collectsMoney: false;
    createsAgreement: false;
    marksInventorySold: false;
    transfersTitle: false;
    transfersOwnership: false;
  };
};

export type MobilePropertyBookingAdvanceProposal = {
  applicationId: string;
  advanceAmountPaise: number;
  ownerTermsNote?: string | null;
};

export type MobilePropertyBookingAdvanceConfirmation = {
  advanceRequestId: string;
  consentVersion: "property-booking-advance-v1";
  consentAccepted: true;
};

export type MobilePropertyBookingAdvanceCancellation = {
  advanceRequestId: string;
  reason?: string | null;
};

export type MobilePropertyBookingAgreementReadinessStatus =
  | "collecting_details"
  | "ready_for_draft"
  | "draft_generated"
  | "parties_reviewing"
  | "changes_requested"
  | "approved_for_execution"
  | "cancelled"
  | "expired";

export type MobilePropertyBookingAgreementPartyRole =
  | "buyer"
  | "owner";

export type MobilePropertyBookingAgreementPartyStatus =
  | "incomplete"
  | "submitted"
  | "confirmed"
  | "changes_requested";

export type MobilePropertyBookingAgreementIdentityDocumentType =
  | "pan"
  | "aadhaar"
  | "voter_id"
  | "passport"
  | "driving_licence"
  | "company_registration"
  | "other";

export type MobilePropertyBookingAgreementRelationType =
  | "father"
  | "mother"
  | "spouse"
  | "guardian"
  | "authorized_representative";

export type MobilePropertyBookingAgreementPrintPageSize =
  | "A4"
  | "LEGAL"
  | "CUSTOM_STAMP_PAPER";

export type MobilePropertyBookingAgreementPrintLayout = {
  pageSize: MobilePropertyBookingAgreementPrintPageSize;
  orientation: "portrait";
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  customPageWidthMm: number | null;
  customPageHeightMm: number | null;
};

export type MobilePropertyBookingAgreementSchedule = {
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
  printLayout: MobilePropertyBookingAgreementPrintLayout;
};

export type MobilePropertyBookingAgreementPartyInput = {
  role: MobilePropertyBookingAgreementPartyRole;
  status: MobilePropertyBookingAgreementPartyStatus;
  legalName: string | null;
  relationType:
    | MobilePropertyBookingAgreementRelationType
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
    | MobilePropertyBookingAgreementIdentityDocumentType
    | null;
  identityMaskedReference: string | null;
  authorityCapacity: string | null;
  inputVersion: "property-agreement-party-input-v1";
  consentAccepted: boolean;
  consentAcceptedAt: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
};

export type MobilePropertyBookingAgreementReadiness = {
  id: string;
  applicationId: string;
  holdId: string;
  unitId: string;
  projectId: string;
  advanceRequestId: string | null;
  status: MobilePropertyBookingAgreementReadinessStatus;
  readinessVersion: "property-agreement-readiness-v1";
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

export type MobilePropertyBookingAgreementProgress = {
  buyerDetailsSubmitted: boolean;
  buyerDetailsConfirmed: boolean;
  ownerDetailsSubmitted: boolean;
  ownerDetailsConfirmed: boolean;
  propertyScheduleConfirmed: boolean;
  readyForDraft: boolean;
};

export type MobilePropertyBookingAgreementPermissions = {
  actor: MobilePropertyBookingAgreementPartyRole;
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

export type MobilePropertyBookingAgreementWorkspace = {
  generatedAt: string;
  unit: MobilePropertyLegalReviewUnit;
  application: MobilePropertyBookingApplication | null;
  readiness:
    | MobilePropertyBookingAgreementReadiness
    | null;
  schedule:
    | MobilePropertyBookingAgreementSchedule
    | null;
  myPartyInput:
    | MobilePropertyBookingAgreementPartyInput
    | null;
  progress: MobilePropertyBookingAgreementProgress;
  permissions: MobilePropertyBookingAgreementPermissions;
  policy: {
    readinessVersion: "property-agreement-readiness-v1";
    partyInputVersion: "property-agreement-party-input-v1";
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

export type MobilePropertyBookingAgreementReadinessCreate = {
  applicationId: string;
};

export type MobilePropertyBookingAgreementPartySubmission = {
  readinessId: string;
  legalName: string;
  relationType?:
    | MobilePropertyBookingAgreementRelationType
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
    MobilePropertyBookingAgreementIdentityDocumentType;
  identityMaskedReference: string;
  authorityCapacity?: string | null;
  inputVersion: "property-agreement-party-input-v1";
  consentAccepted: true;
};

export type MobilePropertyBookingAgreementPartyConfirmation = {
  readinessId: string;
};

export type MobilePropertyBookingAgreementScheduleConfirmation = {
  readinessId: string;
};

export type MobilePropertyBookingAgreementCancellation = {
  readinessId: string;
  reason?: string | null;
};

export type MobilePropertyBookingAgreementAdvisoryDraftStatus =
  | "generation_pending"
  | "generated"
  | "lawyer_review_pending"
  | "lawyer_changes_requested"
  | "lawyer_approved"
  | "superseded"
  | "cancelled"
  | "generation_failed";

export type MobilePropertyBookingAgreementAdvisoryDraftContent = {
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

export type MobilePropertyBookingAgreementAdvisoryDraft = {
  id: string;
  readinessId: string;
  applicationId: string;
  unitId: string;
  projectId: string;
  version: number;
  status: MobilePropertyBookingAgreementAdvisoryDraftStatus;
  promptVersion: "property-agreement-ai-draft-v1";
  draftFormat: "structured_json_v1";
  draftContent:
    | MobilePropertyBookingAgreementAdvisoryDraftContent
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

export type MobilePropertyBookingAgreementAdvisoryDraftWorkspace = {
  generatedAt: string;
  readinessId: string;
  draft: MobilePropertyBookingAgreementAdvisoryDraft | null;
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
export type MobileTrustedMediaEntityType = "project_unit";

export type MobileTrustedMediaEvidenceRole =
  | "unit_overview"
  | "additional_live_capture"
  | "unit_walkthrough_video";

export type MobileTrustedCaptureIntegrityStatus =
  | "pending"
  | "accepted"
  | "review_required"
  | "rejected"
  | "expired";

export type MobileTrustedMediaKind = "image" | "video";

export type MobileTrustedVideoPolicy = {
  minimumDurationSeconds: 5;
  maximumDurationSeconds: 45;
  maximumBytes: 83886080;
  allowedMimeTypes: readonly [
    "video/mp4",
    "video/quicktime",
  ];
  galleryMaySatisfyVideo: false;
  recordsAudio: false;
};

export type MobileTrustedMediaTarget = {
  entityType: MobileTrustedMediaEntityType;
  entityId: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  unitCode: string | null;
  title: string | null;
  unitKind: string;
  status: string;
  trustStatus: string;
  existingAssetCount: number;
  requiredEvidenceRole: "unit_overview";
};

export type MobileTrustedMediaTargets = {
  generatedAt: string;
  targets: MobileTrustedMediaTarget[];
};

export type MobileTrustedLocationObservation = {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  altitudeMetres?: number | null;
  capturedAt: string;
  provider?: string | null;
};

export type MobileTrustedCaptureSession = {
  id: string;
  ownerUserId: string;
  businessId?: string | null;
  entityType: MobileTrustedMediaEntityType;
  entityId: string;
  evidencePolicyKey: string;
  issuedAt: string;
  expiresAt: string;
  completedAt?: string | null;
  platform: "android" | "ios";
  appVersion?: string | null;
  deviceSessionId?: string | null;
  integrityStatus: MobileTrustedCaptureIntegrityStatus;
  location?: MobileTrustedLocationObservation | null;
  riskFlags: string[];
};

export type MobileTrustedCaptureStart = {
  session: MobileTrustedCaptureSession;
  nonce: string;
  policy: {
    minimumLiveImages: 1;
    recommendedLiveImages: number;
    maximumLiveImages: number;
    maximumGpsAccuracyMetres: number;
    reviewGpsAccuracyMetres: number;
    galleryMaySatisfyMandatory: false;
    requiredEvidenceRole: "unit_overview";
  };
};

export type MobileTrustedMediaAsset = {
  id: string;
  trustedMediaAssetId: string;
  url: string;
  bucket: string;
  path: string;
  name: string;
  size: number;
  mimeType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "video/mp4"
    | "video/quicktime";
  kind: MobileTrustedMediaKind;
  durationMs?: number | null;
  captureSource: "live_camera";
  captureTimestamp: string;
  captureSessionId: string;
  evidenceRole: MobileTrustedMediaEvidenceRole;
  provenanceStatus: string;
  lifecycleStatus: string;
  captureIntegrityStatus: MobileTrustedCaptureIntegrityStatus;
};

export type MobileTrustedMediaUploadResult = {
  asset: MobileTrustedMediaAsset;
  target: MobileTrustedMediaTarget;
};

export function mobileSuccess<T>(data: T): MobileApiSuccess<T> {
  return {
    ok: true,
    apiVersion: MOBILE_API_VERSION,
    contractVersion: MOBILE_CONTRACT_VERSION,
    data,
  };
}

export function mobileFailure(
  code: MobileApiErrorCode,
  message: string,
  retryable = false
): MobileApiFailure {
  return {
    ok: false,
    apiVersion: MOBILE_API_VERSION,
    error: { code, message, retryable },
  };
}
