import {
  getTrustedMediaEvidencePolicy,
  type TrustedMediaEvidencePolicy,
} from "./evidence-policy";

import type {
  TrustedCaptureSession,
  TrustedMediaAsset,
  TrustedMediaDeterministicDecision,
  TrustedMediaEntityType,
  TrustedMediaGateReason,
  TrustedMediaGateResult,
  TrustedMediaVerification,
} from "./trusted-media-types";

export type EvaluateTrustedMediaGateInput = {
  entityType: TrustedMediaEntityType;
  assets: TrustedMediaAsset[];
  captureSessions?: TrustedCaptureSession[];
  latestVerification?: TrustedMediaVerification | null;
  now?: Date;
  adminOverride?: boolean;
};

const ACTIVE_ASSET_STATUSES = new Set([
  "finalised",
  "verification_pending",
  "verified",
  "review_required",
  "correction_required",
]);

const TRUSTED_ORIGINS = new Set([
  "trusted_web",
  "trusted_native",
]);

function reason(
  code: TrustedMediaGateReason["code"],
  message: string,
  blocking: boolean
): TrustedMediaGateReason {
  return {
    code,
    message,
    blocking,
  };
}

function isAcceptedCaptureSession(
  asset: TrustedMediaAsset,
  sessions: TrustedCaptureSession[],
  now: Date
): boolean {
  if (!asset.captureSessionId) {
    return false;
  }

  const session = sessions.find(
    (item) => item.id === asset.captureSessionId
  );

  if (!session) {
    return false;
  }

  if (
    session.integrityStatus !== "accepted" &&
    session.integrityStatus !== "review_required"
  ) {
    return false;
  }

  const expiresAt = new Date(session.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  if (
    expiresAt.getTime() < now.getTime() &&
    !session.completedAt
  ) {
    return false;
  }

  return true;
}

function isTrustedMandatoryAsset(
  asset: TrustedMediaAsset,
  sessions: TrustedCaptureSession[],
  now: Date
): boolean {
  if (!asset.isMandatoryEvidence) {
    return false;
  }

  if (asset.deletedAt) {
    return false;
  }

  if (!ACTIVE_ASSET_STATUSES.has(asset.lifecycleStatus)) {
    return false;
  }

  if (!TRUSTED_ORIGINS.has(asset.originType)) {
    return false;
  }

  if (
    asset.provenanceStatus !== "verified" &&
    asset.provenanceStatus !== "review_required"
  ) {
    return false;
  }

  if (!asset.capturedAtServer) {
    return false;
  }

  if (!asset.location) {
    return false;
  }

  if (!isAcceptedCaptureSession(asset, sessions, now)) {
    return false;
  }

  return true;
}

function hasMissingGps(asset: TrustedMediaAsset): boolean {
  return (
    !asset.location ||
    !Number.isFinite(asset.location.latitude) ||
    !Number.isFinite(asset.location.longitude)
  );
}

function hasUnacceptableGpsAccuracy(
  asset: TrustedMediaAsset,
  policy: TrustedMediaEvidencePolicy
): boolean {
  if (!asset.location) {
    return false;
  }

  return (
    !Number.isFinite(asset.location.accuracyMetres) ||
    asset.location.accuracyMetres >
      policy.reviewGpsAccuracyMetres
  );
}

function hasMissingCaptureTimestamp(
  asset: TrustedMediaAsset
): boolean {
  return !asset.capturedAtServer;
}

function hasInvalidCameraProvenance(
  asset: TrustedMediaAsset
): boolean {
  return !TRUSTED_ORIGINS.has(asset.originType);
}

function determineDecision(
  reasons: TrustedMediaGateReason[],
  verification: TrustedMediaVerification | null | undefined,
  adminOverride: boolean
): TrustedMediaDeterministicDecision {
  if (adminOverride) {
    return "overridden";
  }

  if (
    verification?.severity === "critical" ||
    verification?.deterministicDecision === "reject"
  ) {
    return "reject";
  }

  if (
    verification?.severity === "major" ||
    verification?.deterministicDecision ===
      "correction_required"
  ) {
    return "correction_required";
  }

  if (
    reasons.some(
      (item) =>
        item.code === "admin_review_required" &&
        item.blocking
    ) ||
    verification?.deterministicDecision ===
      "review_required"
  ) {
    return "review_required";
  }

  if (reasons.some((item) => item.blocking)) {
    return "pending";
  }

  return "allow";
}

export function evaluateTrustedMediaGate({
  entityType,
  assets,
  captureSessions = [],
  latestVerification,
  now = new Date(),
  adminOverride = false,
}: EvaluateTrustedMediaGateInput): TrustedMediaGateResult {
  const policy = getTrustedMediaEvidencePolicy(entityType);
  const reasons: TrustedMediaGateReason[] = [];

  const activeMandatoryAssets = assets.filter(
    (asset) =>
      asset.isMandatoryEvidence &&
      !asset.deletedAt &&
      ACTIVE_ASSET_STATUSES.has(asset.lifecycleStatus)
  );

  const trustedMandatoryAssets =
    activeMandatoryAssets.filter((asset) =>
      isTrustedMandatoryAsset(
        asset,
        captureSessions,
        now
      )
    );

  if (
    trustedMandatoryAssets.length <
    policy.minimumLiveImages
  ) {
    reasons.push(
      reason(
        "mandatory_live_capture_missing",
        `At least ${policy.minimumLiveImages} GPS-backed live-camera photo${
          policy.minimumLiveImages === 1 ? "" : "s"
        } must be completed before submission.`,
        true
      )
    );
  }

  if (
    activeMandatoryAssets.some((asset) =>
      hasMissingGps(asset)
    )
  ) {
    reasons.push(
      reason(
        "gps_missing",
        "A mandatory live capture is missing GPS evidence.",
        true
      )
    );
  }

  if (
    activeMandatoryAssets.some((asset) =>
      hasUnacceptableGpsAccuracy(asset, policy)
    )
  ) {
    reasons.push(
      reason(
        "gps_accuracy_unacceptable",
        "The GPS accuracy of a mandatory live capture is outside the accepted range. Capture the photo again after obtaining a better location reading.",
        true
      )
    );
  }

  if (
    activeMandatoryAssets.some((asset) =>
      hasMissingCaptureTimestamp(asset)
    )
  ) {
    reasons.push(
      reason(
        "capture_timestamp_missing",
        "A mandatory live capture is missing its trusted server timestamp.",
        true
      )
    );
  }

  if (
    activeMandatoryAssets.some((asset) =>
      hasInvalidCameraProvenance(asset)
    )
  ) {
    reasons.push(
      reason(
        "camera_provenance_missing",
        "Gallery uploads and unverified camera inputs cannot satisfy the mandatory live-capture requirement.",
        true
      )
    );
  }

  if (
    activeMandatoryAssets.some(
      (asset) =>
        !isAcceptedCaptureSession(
          asset,
          captureSessions,
          now
        )
    )
  ) {
    reasons.push(
      reason(
        "capture_session_invalid",
        "A mandatory capture is not linked to a valid trusted capture session.",
        true
      )
    );
  }

  if (policy.aiVerificationRequired) {
    if (!latestVerification) {
      reasons.push(
        reason(
          "verification_pending",
          "AI media-to-description verification has not been completed.",
          true
        )
      );
    } else if (
      latestVerification.deterministicDecision ===
        "pending"
    ) {
      reasons.push(
        reason(
          "verification_pending",
          "AI media-to-description verification is still pending.",
          true
        )
      );
    }
  }

  if (latestVerification?.severity === "major") {
    reasons.push(
      reason(
        "major_mismatch_unresolved",
        "A major mismatch between the listing media and the declared details must be corrected before submission.",
        true
      )
    );
  }

  if (
    latestVerification?.severity === "critical"
  ) {
    reasons.push(
      reason(
        "critical_mismatch_unresolved",
        "A critical media mismatch was detected and the listing cannot be submitted.",
        true
      )
    );
  }

  if (
    latestVerification?.requiresAdminReview &&
    !adminOverride
  ) {
    reasons.push(
      reason(
        "admin_review_required",
        "This listing requires administrator review before publication.",
        true
      )
    );
  }

  const hasOnlyLegacyMedia =
    assets.length > 0 &&
    assets.every(
      (asset) =>
        asset.originType === "legacy_unknown" ||
        asset.provenanceStatus ===
          "legacy_unverified"
    );

  if (hasOnlyLegacyMedia) {
    reasons.push(
      reason(
        "legacy_media_only",
        "This listing contains only historical unverified media.",
        false
      )
    );
  }

  const decision = determineDecision(
    reasons,
    latestVerification,
    adminOverride
  );

  const satisfied =
    decision === "allow" ||
    decision === "overridden";

  if (satisfied) {
    reasons.push(
      reason(
        "verified",
        adminOverride
          ? "Trusted-media submission requirements were approved through an audited administrator override."
          : "Trusted-media submission requirements are satisfied.",
        false
      )
    );
  }

  return {
    decision,
    satisfied,
    mandatoryLiveCaptureCount:
      trustedMandatoryAssets.length,
    requiredLiveCaptureCount:
      policy.minimumLiveImages,
    reasons,
    evaluatedAt: now.toISOString(),
    policyKey: policy.key,
    policyVersion: policy.version,
  };
}
