import {
  buildTrustedPublicationContext,
  validateTrustedPublication,
  type TrustedPublicationModule,
} from "@/lib/media/trusted-publication-gate";

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
  const mediaAssets =
    extractPersistedMediaAssets(
      persistedMediaInput,
    );

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
    hasExplicitAiFailure(mediaAssets);

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
