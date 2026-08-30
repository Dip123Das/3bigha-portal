import "server-only";

import {
  buildTrustedPublicationContext,
  validateTrustedPublication,
  type TrustedPublicationModule,
} from "@/lib/media/trusted-publication-gate";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type TrustedPublicationServerDecision = {
  ok: boolean;

  module: TrustedPublicationModule;

  requiredCaptures: number;
  completedCaptures: number;

  gpsVerified?: boolean;
  provenanceVerified?: boolean;
  captureSessionCompleted?: boolean;

  aiVerificationStatus?: string | null;

  explicitAiFailure: boolean;

  code: string | null;
  message: string | null;
};

const AI_FAILURE_STATUSES = new Set([
  "failed",
  "rejected",
  "mismatch",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * Normalize persisted marketplace media into a
 * canonical array of evidence objects.
 *
 * Supported shapes intentionally include the
 * legacy/current containers used across 3Bigha.
 */
export function extractPersistedMediaAssets(
  mediaJson: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(mediaJson)) {
    return mediaJson.filter(isRecord);
  }

  if (!isRecord(mediaJson)) {
    return [];
  }

  const candidates = [
    mediaJson.media,
    mediaJson.media_assets,
    mediaJson.assets,
    mediaJson.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
}

export function hasExplicitAiFailure(
  mediaAssets: readonly unknown[],
): boolean {
  return mediaAssets.some((asset) => {
    if (!isRecord(asset)) {
      return false;
    }

    const status = String(
      asset.aiVerificationStatus ??
        asset.ai_verification_status ??
        "",
    )
      .trim()
      .toLowerCase();

    return AI_FAILURE_STATUSES.has(status);
  });
}

function trustedAssetId(asset: Record<string, unknown>) {
  const value = asset.trustedMediaAssetId ?? asset.trusted_media_asset_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadCanonicalTrustedAssets(
  persistedAssets: readonly Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const claimedIds = persistedAssets
    .map(trustedAssetId)
    .filter((value): value is string => Boolean(value));

  if (!claimedIds.length) return [];

  const admin = getSupabaseAdmin();
  const { data: assets, error: assetError } = await admin
    .from("listing_media_assets")
    .select(
      "id,capture_session_id,origin_type,evidence_role,is_mandatory_evidence,captured_at_client,gps_lat_private,gps_lng_private,gps_accuracy_m,provenance_status,lifecycle_status",
    )
    .in("id", claimedIds)
    .is("deleted_at", null);

  if (assetError || !assets?.length) return [];

  const sessionIds = assets
    .map((asset: any) => asset.capture_session_id)
    .filter(Boolean);
  const { data: sessions, error: sessionError } = sessionIds.length
    ? await admin
        .from("trusted_capture_sessions")
        .select("id,completed_at,integrity_status")
        .in("id", sessionIds)
    : { data: [], error: null };

  if (sessionError) return [];

  const sessionsById = new Map(
    (sessions || []).map((session: any) => [session.id, session]),
  );
  const persistedById = new Map(
    persistedAssets
      .map((asset) => [trustedAssetId(asset), asset] as const)
      .filter(([id]) => Boolean(id)),
  );

  return assets.map((asset: any) => {
    const session = sessionsById.get(asset.capture_session_id) as any;
    const persisted = persistedById.get(asset.id) || {};
    const sessionAccepted =
      session?.integrity_status === "accepted" ||
      session?.integrity_status === "review_required";

    return {
      trustedMediaAssetId: asset.id,
      captureSource:
        asset.origin_type === "trusted_web" ||
        asset.origin_type === "trusted_native"
          ? "live_camera"
          : "file_upload",
      captureTimestamp: asset.captured_at_client,
      mandatoryTrustedCapture: asset.is_mandatory_evidence === true,
      gpsVerified:
        asset.gps_lat_private !== null &&
        asset.gps_lng_private !== null &&
        Number.isFinite(Number(asset.gps_lat_private)) &&
        Number.isFinite(Number(asset.gps_lng_private)),
      gpsLatitude: Number(asset.gps_lat_private),
      gpsLongitude: Number(asset.gps_lng_private),
      gpsAccuracy: Number(asset.gps_accuracy_m),
      captureSessionId: asset.capture_session_id,
      captureSessionCompleted: Boolean(session?.completed_at) && sessionAccepted,
      captureSessionCompletedAt: session?.completed_at ?? null,
      provenanceStatus: asset.provenance_status,
      lifecycleStatus: asset.lifecycle_status,
      aiVerificationStatus:
        persisted.aiVerificationStatus ??
        persisted.ai_verification_status ??
        "pending",
    };
  });
}

/**
 * Canonical server-side Trusted Listing Media
 * decision.
 *
 * IMPORTANT:
 * - Callers must pass persisted database evidence.
 * - Never pass client-declared readiness booleans.
 * - Capture requirements remain governed by
 *   trusted-publication-gate.ts.
 */
export async function evaluateTrustedPublication(
  module: TrustedPublicationModule,
  persistedMediaInput: unknown,
): Promise<TrustedPublicationServerDecision> {
  const persistedMediaAssets =
    extractPersistedMediaAssets(
      persistedMediaInput,
    );

  /*
   * Browser-persisted JSON is only a reference projection. Publication
   * authority is rebuilt from immutable listing_media_assets and its
   * completed capture sessions so forged readiness booleans cannot pass.
   */
  const mediaAssets =
    await loadCanonicalTrustedAssets(persistedMediaAssets);

  const trustedContext =
    buildTrustedPublicationContext(
      mediaAssets as any[],
    );

  const trustedResult =
    await validateTrustedPublication(
      module,
      trustedContext,
    );

  const explicitAiFailure =
    hasExplicitAiFailure(persistedMediaAssets);

  if (!trustedResult.ok) {
    return {
      ok: false,

      module,

      requiredCaptures:
        trustedResult.requiredCaptures,
      completedCaptures:
        trustedResult.completedCaptures,

      gpsVerified:
        trustedContext.gpsVerified,
      provenanceVerified:
        trustedContext.provenanceVerified,
      captureSessionCompleted:
        trustedContext.captureSessionCompleted,

      aiVerificationStatus:
        trustedContext.aiVerificationStatus,

      explicitAiFailure,

      code: "TRUSTED_MEDIA_REQUIRED",

      message:
        trustedResult.message ||
        "Trusted media verification is incomplete.",
    };
  }

  /*
   * AI review is not yet mandatory for publication
   * when its state is pending/not-started.
   *
   * An explicit negative AI decision is mandatory
   * to respect and therefore blocks publication.
   */
  if (explicitAiFailure) {
    return {
      ok: false,

      module,

      requiredCaptures:
        trustedResult.requiredCaptures,
      completedCaptures:
        trustedResult.completedCaptures,

      gpsVerified:
        trustedContext.gpsVerified,
      provenanceVerified:
        trustedContext.provenanceVerified,
      captureSessionCompleted:
        trustedContext.captureSessionCompleted,

      aiVerificationStatus:
        trustedContext.aiVerificationStatus,

      explicitAiFailure: true,

      code: "TRUSTED_MEDIA_AI_MISMATCH",

      message:
        "AI media verification detected a significant mismatch. Correct the listing details or upload genuine media before submitting for review.",
    };
  }

  return {
    ok: true,

    module,

    requiredCaptures:
      trustedResult.requiredCaptures,
    completedCaptures:
      trustedResult.completedCaptures,

    gpsVerified:
      trustedContext.gpsVerified,
    provenanceVerified:
      trustedContext.provenanceVerified,
    captureSessionCompleted:
      trustedContext.captureSessionCompleted,

    aiVerificationStatus:
      trustedContext.aiVerificationStatus,

    explicitAiFailure: false,

    code: null,
    message: null,
  };
}
