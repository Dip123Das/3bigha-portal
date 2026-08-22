export type TrustedMediaEntityType =
  | "property"
  | "builder_project"
  | "project_unit"
  | "material"
  | "rental"
  | "service";

export type TrustedMediaOriginType =
  | "trusted_native"
  | "trusted_web"
  | "camera_input_unverified"
  | "gallery_upload"
  | "legacy_unknown";

export type TrustedMediaKind =
  | "image"
  | "video"
  | "document";

export type TrustedMediaProvenanceStatus =
  | "pending"
  | "verified"
  | "review_required"
  | "rejected"
  | "legacy_unverified";

export type TrustedMediaLifecycleStatus =
  | "capture_started"
  | "uploaded"
  | "finalised"
  | "verification_pending"
  | "verified"
  | "review_required"
  | "correction_required"
  | "rejected"
  | "superseded"
  | "deleted";

export type TrustedCaptureIntegrityStatus =
  | "pending"
  | "accepted"
  | "review_required"
  | "rejected"
  | "expired";

export type TrustedMediaVerificationSeverity =
  | "none"
  | "minor"
  | "moderate"
  | "major"
  | "critical";

export type TrustedMediaDeterministicDecision =
  | "pending"
  | "allow"
  | "review_required"
  | "correction_required"
  | "reject"
  | "overridden";

export type TrustedMediaVerificationResult =
  | "match"
  | "uncertain"
  | "mismatch"
  | "not_observable";

export type TrustedMediaEvidenceRole =
  | "property_overview"
  | "project_overview"
  | "project_entrance"
  | "construction_progress"
  | "project_surroundings"
  | "unit_overview"
  | "material_overview"
  | "rental_asset_overview"
  | "service_work_evidence"
  | "service_tools_or_premises"
  | "additional_live_capture"
  | "gallery_media";

export type TrustedMediaPublicLocationPrecision =
  | "hidden"
  | "locality"
  | "approximate"
  | "rounded_3_decimals";

export type TrustedMediaPlatform =
  | "web"
  | "android"
  | "ios"
  | "unknown";

export type TrustedLocationObservation = {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  altitudeMetres?: number | null;
  capturedAt: string;
  provider?: string | null;
};

export type TrustedCaptureSession = {
  id: string;
  ownerUserId: string;
  businessId?: string | null;
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  evidencePolicyKey: string;
  issuedAt: string;
  expiresAt: string;
  completedAt?: string | null;
  platform: TrustedMediaPlatform;
  appVersion?: string | null;
  deviceSessionId?: string | null;
  integrityStatus: TrustedCaptureIntegrityStatus;
  location?: TrustedLocationObservation | null;
  riskFlags: string[];
};

export type TrustedMediaAsset = {
  id: string;
  ownerUserId: string;
  businessId?: string | null;
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  bucket: string;
  objectPath: string;
  publicDerivativePath?: string | null;
  kind: TrustedMediaKind;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sha256?: string | null;
  perceptualHash?: string | null;
  originType: TrustedMediaOriginType;
  evidenceRole?: TrustedMediaEvidenceRole | null;
  isMandatoryEvidence: boolean;
  sortOrder: number;
  captureSessionId?: string | null;
  capturedAtClient?: string | null;
  capturedAtServer?: string | null;
  location?: TrustedLocationObservation | null;
  publicLocationPrecision?: TrustedMediaPublicLocationPrecision | null;
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  provenanceStatus: TrustedMediaProvenanceStatus;
  lifecycleStatus: TrustedMediaLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type TrustedMediaVerificationCheck = {
  dimension:
    | "category_match"
    | "type_match"
    | "condition_match"
    | "physical_attribute_match"
    | "overview_adequacy"
    | "unrelated_media"
    | "screenshot_or_brochure"
    | "duplicate_or_stock_image"
    | "brand_or_model_match"
    | "service_relevance";
  result: TrustedMediaVerificationResult;
  confidence: number;
  evidence: string;
};

export type TrustedMediaVerification = {
  id: string;
  ownerUserId: string;
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  verificationVersion: number;
  policyVersion: string;
  inputFingerprint: string;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiRunId?: string | null;
  aiConfidence?: number | null;
  aiSummary?: string | null;
  observations: string[];
  checks: TrustedMediaVerificationCheck[];
  severity: TrustedMediaVerificationSeverity;
  deterministicDecision: TrustedMediaDeterministicDecision;
  decisionReasons: string[];
  requiresAdminReview: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionType?: string | null;
  createdAt: string;
};

export type TrustedMediaGateReasonCode =
  | "mandatory_live_capture_missing"
  | "gps_missing"
  | "gps_accuracy_unacceptable"
  | "capture_timestamp_missing"
  | "camera_provenance_missing"
  | "capture_session_invalid"
  | "capture_session_expired"
  | "verification_pending"
  | "major_mismatch_unresolved"
  | "critical_mismatch_unresolved"
  | "admin_review_required"
  | "legacy_media_only"
  | "verified";

export type TrustedMediaGateReason = {
  code: TrustedMediaGateReasonCode;
  message: string;
  blocking: boolean;
};

export type TrustedMediaGateResult = {
  decision: TrustedMediaDeterministicDecision;
  satisfied: boolean;
  mandatoryLiveCaptureCount: number;
  requiredLiveCaptureCount: number;
  reasons: TrustedMediaGateReason[];
  evaluatedAt: string;
  policyKey: string;
  policyVersion: string;
};

export type TrustedMediaListingSnapshot = {
  title: string;
  description: string;
  category?: string | null;
  type?: string | null;
  subtype?: string | null;
  condition?: string | null;
  brand?: string | null;
  model?: string | null;
  majorAttributes?: Record<string, string | number | boolean | null>;
};
