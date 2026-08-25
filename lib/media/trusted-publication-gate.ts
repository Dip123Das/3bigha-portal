import type {
  UploadedMediaAsset,
} from "@/lib/media/media-config";

export type TrustedPublicationModule =
  | "property"
  | "builder_project"
  | "materials"
  | "rentals"
  | "services";

export type TrustedAiVerificationStatus =
  | "not_started"
  | "pending"
  | "queued"
  | "verified"
  | "approved"
  | "warning"
  | "failed"
  | "rejected"
  | "mismatch"
  | string;

export type TrustedPublicationContext = {
  completedCaptures: number;

  gpsVerified?: boolean;

  aiVerified?: boolean;

  aiVerificationStatus?:
    | TrustedAiVerificationStatus
    | null;

  provenanceVerified?: boolean;

  captureSessionCompleted?: boolean;

  /**
   * Keep false until the real AI media-description
   * verification workflow is operational.
   *
   * Failed/rejected/mismatch AI results are always blocked.
   */
  requireAiVerified?: boolean;
};

export type TrustedPublicationFailureCode =
  | "INSUFFICIENT_TRUSTED_CAPTURES"
  | "GPS_INCOMPLETE"
  | "PROVENANCE_FAILED"
  | "CAPTURE_SESSION_INCOMPLETE"
  | "AI_VERIFICATION_PENDING"
  | "AI_VERIFICATION_FAILED";

export type TrustedPublicationResult = {
  ok: boolean;

  requiredCaptures: number;

  completedCaptures: number;

  message: string | null;

  code:
    | TrustedPublicationFailureCode
    | null;

  warnings: string[];

  aiVerificationPending: boolean;
};

type TrustedAssetMetadata = {
  captureSource?: unknown;

  captureTimestamp?: unknown;

  gpsVerified?: unknown;

  gpsLatitude?: unknown;

  gpsLongitude?: unknown;

  gpsAccuracy?: unknown;

  captureSessionId?: unknown;

  captureSessionStartedAt?: unknown;

  captureSessionCompleted?: unknown;

  captureSessionCompletedAt?: unknown;

  provenanceStatus?: unknown;

  aiVerificationStatus?: unknown;

  mandatoryTrustedCapture?: unknown;
};

export const TRUSTED_PUBLICATION_POLICY: Readonly<
  Record<
    TrustedPublicationModule,
    {
      requiredCaptures: number;
    }
  >
> = {
  property: {
    requiredCaptures: 2,
  },

  builder_project: {
    requiredCaptures: 2,
  },

  materials: {
    requiredCaptures: 1,
  },

  rentals: {
    requiredCaptures: 1,
  },

  services: {
    requiredCaptures: 1,
  },
};

const AI_VERIFIED_STATUSES =
  new Set([
    "verified",
    "approved",
  ]);

const AI_FAILED_STATUSES =
  new Set([
    "failed",
    "rejected",
    "mismatch",
  ]);

function normalizeStatus(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function hasFiniteCoordinate(
  value: unknown,
): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function readTrustedMetadata(
  asset: UploadedMediaAsset,
): TrustedAssetMetadata {
  return asset as UploadedMediaAsset &
    TrustedAssetMetadata;
}

export function isTrustedLiveEvidenceAsset(
  asset: UploadedMediaAsset,
): boolean {
  const metadata =
    readTrustedMetadata(asset);

  return (
    metadata.captureSource ===
      "live_camera" &&
    metadata.mandatoryTrustedCapture ===
      true &&
    metadata.gpsVerified === true &&
    hasFiniteCoordinate(
      metadata.gpsLatitude,
    ) &&
    hasFiniteCoordinate(
      metadata.gpsLongitude,
    ) &&
    metadata.captureSessionCompleted ===
      true &&
    Boolean(
      metadata.captureSessionId,
    ) &&
    normalizeStatus(
      metadata.provenanceStatus,
    ) === "verified"
  );
}

function getAiStatusFromAssets(
  assets: readonly UploadedMediaAsset[],
): TrustedAiVerificationStatus {
  const statuses = assets.map(
    (asset) =>
      normalizeStatus(
        readTrustedMetadata(asset)
          .aiVerificationStatus,
      ),
  );

  if (
    statuses.some((status) =>
      AI_FAILED_STATUSES.has(status),
    )
  ) {
    return "failed";
  }

  if (
    statuses.length > 0 &&
    statuses.every((status) =>
      AI_VERIFIED_STATUSES.has(status),
    )
  ) {
    return "verified";
  }

  if (
    statuses.some(
      (status) =>
        status === "pending" ||
        status === "queued",
    )
  ) {
    return "pending";
  }

  return "not_started";
}

export function buildTrustedPublicationContext(
  mediaAssets:
    readonly UploadedMediaAsset[],
  options?: {
    requireAiVerified?: boolean;
  },
): TrustedPublicationContext {
  const trustedAssets =
    mediaAssets.filter(
      isTrustedLiveEvidenceAsset,
    );

  const aiVerificationStatus =
    getAiStatusFromAssets(
      trustedAssets,
    );

  return {
    completedCaptures:
      trustedAssets.length,

    gpsVerified:
      trustedAssets.length > 0 &&
      trustedAssets.every(
        (asset) =>
          readTrustedMetadata(asset)
            .gpsVerified === true,
      ),

    provenanceVerified:
      trustedAssets.length > 0 &&
      trustedAssets.every(
        (asset) =>
          normalizeStatus(
            readTrustedMetadata(asset)
              .provenanceStatus,
          ) === "verified",
      ),

    captureSessionCompleted:
      trustedAssets.length > 0 &&
      trustedAssets.every(
        (asset) =>
          readTrustedMetadata(asset)
            .captureSessionCompleted ===
          true,
      ),

    aiVerified:
      aiVerificationStatus ===
        "verified",

    aiVerificationStatus,

    requireAiVerified:
      options?.requireAiVerified ??
      false,
  };
}

function failure(
  input: {
    code: TrustedPublicationFailureCode;

    requiredCaptures: number;

    completedCaptures: number;

    message: string;

    warnings?: string[];

    aiVerificationPending?: boolean;
  },
): TrustedPublicationResult {
  return {
    ok: false,

    requiredCaptures:
      input.requiredCaptures,

    completedCaptures:
      input.completedCaptures,

    message:
      input.message,

    code:
      input.code,

    warnings:
      input.warnings ?? [],

    aiVerificationPending:
      input.aiVerificationPending ??
      false,
  };
}

function isMediaAssetArray(
  input:
    | TrustedPublicationContext
    | readonly UploadedMediaAsset[],
): input is readonly UploadedMediaAsset[] {
  return Array.isArray(input);
}

export async function validateTrustedPublication(
  module: TrustedPublicationModule,

  input:
    | TrustedPublicationContext
    | readonly UploadedMediaAsset[],

  options?: {
    requireAiVerified?: boolean;
  },
): Promise<TrustedPublicationResult> {
  const requiredCaptures =
    TRUSTED_PUBLICATION_POLICY[module]
      .requiredCaptures;

  const context =
    isMediaAssetArray(input)
      ? buildTrustedPublicationContext(
          input,
          options,
        )
      : {
          ...input,

          requireAiVerified:
            options?.requireAiVerified ??
            input.requireAiVerified ??
            false,
        };

  const completedCaptures =
    Math.max(
      0,
      Number(
        context.completedCaptures ??
          0,
      ),
    );

  if (
    completedCaptures <
    requiredCaptures
  ) {
    return failure({
      code:
        "INSUFFICIENT_TRUSTED_CAPTURES",

      requiredCaptures,

      completedCaptures,

      message:
        `Complete ${requiredCaptures} mandatory live GPS capture(s) before publishing.`,
    });
  }

  if (
    context.gpsVerified === false
  ) {
    return failure({
      code:
        "GPS_INCOMPLETE",

      requiredCaptures,

      completedCaptures,

      message:
        "GPS verification is incomplete.",
    });
  }

  if (
    context.provenanceVerified ===
    false
  ) {
    return failure({
      code:
        "PROVENANCE_FAILED",

      requiredCaptures,

      completedCaptures,

      message:
        "Live camera provenance verification failed.",
    });
  }

  if (
    context.captureSessionCompleted ===
    false
  ) {
    return failure({
      code:
        "CAPTURE_SESSION_INCOMPLETE",

      requiredCaptures,

      completedCaptures,

      message:
        "Capture session is incomplete.",
    });
  }

  const aiStatus =
    normalizeStatus(
      context.aiVerificationStatus,
    );

  const aiFailed =
    context.aiVerified === false &&
    AI_FAILED_STATUSES.has(
      aiStatus,
    );

  if (
    AI_FAILED_STATUSES.has(
      aiStatus,
    ) ||
    aiFailed
  ) {
    return failure({
      code:
        "AI_VERIFICATION_FAILED",

      requiredCaptures,

      completedCaptures,

      message:
        "AI media verification found a serious mismatch. Replace the incorrect media before publishing.",
    });
  }

  const aiVerified =
    context.aiVerified === true ||
    AI_VERIFIED_STATUSES.has(
      aiStatus,
    );

  const aiVerificationPending =
    !aiVerified;

  if (
    context.requireAiVerified &&
    aiVerificationPending
  ) {
    return failure({
      code:
        "AI_VERIFICATION_PENDING",

      requiredCaptures,

      completedCaptures,

      message:
        "AI media verification is still pending. Please wait for verification before publishing.",

      aiVerificationPending:
        true,
    });
  }

  const warnings: string[] = [];

  if (
    aiVerificationPending
  ) {
    warnings.push(
      "AI media-description verification is pending. The listing may require automated or human review before final public approval.",
    );
  }

  return {
    ok: true,

    requiredCaptures,

    completedCaptures,

    message: null,

    code: null,

    warnings,

    aiVerificationPending,
  };
}
