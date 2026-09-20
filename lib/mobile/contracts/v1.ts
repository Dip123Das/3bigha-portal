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
  | "TRUSTED_MEDIA_FAILED";

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

export type MobileTrustedMediaEntityType = "project_unit";

export type MobileTrustedMediaEvidenceRole =
  | "unit_overview"
  | "additional_live_capture";

export type MobileTrustedCaptureIntegrityStatus =
  | "pending"
  | "accepted"
  | "review_required"
  | "rejected"
  | "expired";

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
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  kind: "image";
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
