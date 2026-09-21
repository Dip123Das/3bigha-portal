import type { Session } from "@supabase/supabase-js";

import {
  canonicalApiUrl,
  mobileApiRequest,
  MobileRequestError,
} from "@/lib/api/request";

export type MobileTrustedMediaTarget = {
  entityType: "project_unit";
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
  entityType: "project_unit";
  entityId: string;
  evidencePolicyKey: string;
  issuedAt: string;
  expiresAt: string;
  completedAt?: string | null;
  platform: "android" | "ios";
  appVersion?: string | null;
  deviceSessionId?: string | null;
  integrityStatus:
    | "pending"
    | "accepted"
    | "review_required"
    | "rejected"
    | "expired";
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
  kind: "image" | "video";
  durationMs?: number | null;
  captureSource: "live_camera";
  captureTimestamp: string;
  captureSessionId: string;
  evidenceRole: "unit_overview" | "additional_live_capture";
  provenanceStatus: string;
  lifecycleStatus: string;
  captureIntegrityStatus: MobileTrustedCaptureSession["integrityStatus"];
};

type NativePhoto = {
  uri: string;
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  capturedAt: string;
};

type NativeVideo = {
  uri: string;
  name: string;
  mimeType: "video/mp4" | "video/quicktime";
  capturedAt: string;
  durationMs: number;
  recordsAudio: false;
};

type UploadResponse = {
  ok?: boolean;
  asset?: MobileTrustedMediaAsset;
  error?: string | { message?: string };
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function errorMessage(body: UploadResponse | null) {
  if (typeof body?.error === "string") return body.error;
  if (body?.error?.message) return body.error.message;
  return "The live trusted media could not be uploaded safely.";
}

export function loadTrustedMediaTargets(
  session: Session,
): Promise<MobileTrustedMediaTargets> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/trusted-media/targets",
    {},
    "Your owned project units could not be loaded safely.",
  );
}

export function startTrustedCaptureSession(
  session: Session,
  input: {
    entityId: string;
    platform: "android" | "ios";
    appVersion?: string | null;
    deviceSessionId?: string | null;
  },
): Promise<MobileTrustedCaptureStart> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/trusted-media/capture-session",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
    "The trusted-photo session could not be started.",
  );
}

export function bindTrustedCaptureLocation(
  session: Session,
  input: {
    sessionId: string;
    nonce: string;
    location: MobileTrustedLocationObservation;
  },
): Promise<MobileTrustedCaptureSession> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/trusted-media/capture-session/${encodeURIComponent(input.sessionId)}/location`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        nonce: input.nonce,
        location: input.location,
      }),
    },
    "The live GPS observation could not be bound to this capture.",
  );
}

export async function uploadTrustedUnitPhoto(
  session: Session,
  input: {
    unitId: string;
    capture: MobileTrustedCaptureStart;
    photo: NativePhoto;
    evidenceRole: "unit_overview" | "additional_live_capture";
    uploadMetadata?: Record<string, unknown>;
  },
): Promise<MobileTrustedMediaAsset> {
  const form = new FormData();
  form.append(
    "file",
    {
      uri: input.photo.uri,
      name: input.photo.name,
      type: input.photo.mimeType,
    } as unknown as Blob,
  );
  form.append(
    "context",
    JSON.stringify({
      sessionId: input.capture.session.id,
      nonce: input.capture.nonce,
      module: "property",
      entityType: "project_unit",
      entityId: input.unitId,
      evidenceRole: input.evidenceRole,
      isMandatoryEvidence: input.evidenceRole === "unit_overview",
      originType: "trusted_native",
      capturedAtClient: input.photo.capturedAt,
      uploadMetadata: input.uploadMetadata ?? {},
    }),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(
      canonicalApiUrl("/api/trusted-media/upload"),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
        body: form,
        signal: controller.signal,
      },
    );
    const body = await response.json().catch(() => null) as
      | UploadResponse
      | null;

    if (!response.ok || !body?.ok || !body.asset) {
      throw new MobileRequestError(
        errorMessage(body),
        "service",
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }

    return body.asset;
  } catch (error) {
    if (error instanceof MobileRequestError) throw error;
    const timedOut = controller.signal.aborted;
    throw new MobileRequestError(
      timedOut
        ? "The trusted-photo upload timed out. Please try again."
        : "The trusted photo could not reach 3Bigha. Check your connection and try again.",
      timedOut ? "timeout" : "offline",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadTrustedUnitVideo(
  session: Session,
  input: {
    unitId: string;
    capture: MobileTrustedCaptureStart;
    video: NativeVideo;
    uploadMetadata?: Record<string, unknown>;
  },
): Promise<MobileTrustedMediaAsset> {
  const form = new FormData();
  form.append(
    "file",
    {
      uri: input.video.uri,
      name: input.video.name,
      type: input.video.mimeType,
    } as unknown as Blob,
  );
  form.append(
    "context",
    JSON.stringify({
      sessionId: input.capture.session.id,
      nonce: input.capture.nonce,
      module: "property",
      entityType: "project_unit",
      entityId: input.unitId,
      evidenceRole: "unit_walkthrough_video",
      isMandatoryEvidence: false,
      originType: "trusted_native",
      capturedAtClient: input.video.capturedAt,
      mediaKind: "video",
      durationMs: input.video.durationMs,
      recordsAudio: input.video.recordsAudio,
      uploadMetadata: input.uploadMetadata ?? {},
    }),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(
      canonicalApiUrl("/api/trusted-media/upload"),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
          "Cache-Control": "no-store",
        },
        body: form,
        signal: controller.signal,
      },
    );
    const body = await response.json().catch(() => null) as
      | UploadResponse
      | null;

    if (!response.ok || !body?.ok || !body.asset) {
      throw new MobileRequestError(
        errorMessage(body),
        "service",
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }

    if (
      body.asset.kind !== "video" ||
      body.asset.lifecycleStatus !== "verification_pending"
    ) {
      throw new MobileRequestError(
        "The server did not preserve the private trusted-video boundary.",
        "service",
        false,
      );
    }

    return body.asset;
  } catch (error) {
    if (error instanceof MobileRequestError) throw error;
    const timedOut = controller.signal.aborted;
    throw new MobileRequestError(
      timedOut
        ? "The trusted-video upload timed out. Please try again."
        : "The trusted video could not reach 3Bigha. Check your connection and try again.",
      timedOut ? "timeout" : "offline",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function attachTrustedUnitPhoto(
  session: Session,
  input: {
    sessionId: string;
    unitId: string;
    assetId: string;
  },
): Promise<MobileTrustedMediaTarget> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/trusted-media/capture-session/${encodeURIComponent(input.sessionId)}/attach`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        unitId: input.unitId,
        assetId: input.assetId,
      }),
    },
    "The trusted photo was uploaded but could not be attached to the project unit.",
  );
}

export function attachTrustedUnitVideo(
  session: Session,
  input: {
    sessionId: string;
    unitId: string;
    assetId: string;
  },
): Promise<MobileTrustedMediaTarget> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/trusted-media/capture-session/${encodeURIComponent(input.sessionId)}/attach`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        unitId: input.unitId,
        assetId: input.assetId,
      }),
    },
    "The private walkthrough video was uploaded but could not be attached to the project unit.",
  );
}
