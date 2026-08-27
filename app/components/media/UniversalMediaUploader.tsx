"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  UNIVERSAL_MEDIA_LIMITS,
  type UniversalMediaModule,
  type UploadedMediaAsset,
} from "@/lib/media/media-config";
import {
  formatMediaSize,
  type MediaQualityWarning,
} from "@/lib/media/media-utils";
import { executeMediaUpload } from "@/lib/media/upload-engine";
import type {
  TrustedUploadContext,
} from "@/lib/media/upload-strategy";
import type {
  TrustedMediaEntityType,
  TrustedMediaEvidenceRole,
} from "@/lib/trusted-media/trusted-media-types";

type TrustedUploadProgress = {
  required: number;
  completed: number;
  galleryUnlocked: boolean;
};

type TrustedUploadStatus =
  | "idle"
  | "waiting_gps"
  | "session_created"
  | "camera_ready"
  | "captured"
  | "uploading"
  | "verified"
  | "complete";

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

type TrustedGpsCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function trustedEntityForModule(
  module: UniversalMediaModule,
): {
  entityType: TrustedMediaEntityType;
  evidenceRole: TrustedMediaEvidenceRole;
} | null {
  if (module === "property") {
    return { entityType: "property", evidenceRole: "property_overview" };
  }
  if (module === "project") {
    return { entityType: "builder_project", evidenceRole: "project_overview" };
  }
  if (module === "materials") {
    return { entityType: "material", evidenceRole: "material_overview" };
  }
  if (module === "rentals") {
    return { entityType: "rental", evidenceRole: "rental_asset_overview" };
  }
  if (module === "services") {
    return { entityType: "service", evidenceRole: "service_work_evidence" };
  }
  return null;
}

function isTrustedLiveEvidenceAsset(
  asset: UploadedMediaAsset,
): boolean {
  const metadata =
    asset as UploadedMediaAsset &
      TrustedAssetMetadata;

  return (
    metadata.captureSource === "live_camera" &&
    metadata.gpsVerified === true &&
    metadata.captureSessionCompleted === true &&
    metadata.provenanceStatus === "verified" &&
    metadata.mandatoryTrustedCapture === true
  );
}

type UniversalMediaUploaderProps = {
  module: UniversalMediaModule;
  value: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  folder?: string;
  label?: string;
  helperText?: string;
  allowImages?: boolean;
  allowVideos?: boolean;
  allowDocuments?: boolean;
  maxFiles?: number;
  cameraFacing?: "user" | "environment";
  cameraOnly?: boolean;
  cameraButtonLabel?: string;
  inlineCamera?: boolean;
  cameraGuide?: "none" | "face";
  outputPreset?: "square_1080";
  requirePreparation?: boolean;
  assetMetadata?: Record<string, unknown>;
  uploadStrategy?: "standard" | "trusted";
  mandatoryTrustedCaptures?: number;
  showTrustedBanner?: boolean;
};

export default function UniversalMediaUploader({
  module,
  value,
  onChange,
  folder,
  label = "Photos / Videos",
  helperText = "Add clear photos or videos. You can also open camera directly on mobile.",
  allowImages = true,
  allowVideos = true,
  allowDocuments = false,
  maxFiles = UNIVERSAL_MEDIA_LIMITS.maxFiles,
  cameraFacing = "environment",
  cameraOnly = false,
  cameraButtonLabel = "📷 Take Photo",
  inlineCamera = false,
  cameraGuide = "none",
  outputPreset = "square_1080",
  requirePreparation = false,
  assetMetadata = {},
  uploadStrategy = "standard",
  mandatoryTrustedCaptures = 1,
  showTrustedBanner = true,
}: UniversalMediaUploaderProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const inlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inlineStreamRef = useRef<MediaStream | null>(null);
  const trustedDraftTokenRef = useRef<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [message, setMessage] = useState("");
  const [progressText, setProgressText] = useState("");
  const [qualityWarnings, setQualityWarnings] = useState<MediaQualityWarning[]>(
    [],
  );
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState("");
  const [capturedAt, setCapturedAt] = useState("");

  const trustedMode =
  uploadStrategy === "trusted";

  const [trustedStatus, setTrustedStatus] =
    useState<TrustedUploadStatus>("idle");

  const [trustedProgress, setTrustedProgress] =
    useState<TrustedUploadProgress>({
      required: mandatoryTrustedCaptures,
      completed: 0,
      galleryUnlocked: false,
    });

  const trustedLiveEvidenceAssets = useMemo(
    () =>
      value.filter(
        isTrustedLiveEvidenceAsset,
      ),
    [value],
  );

  const trustedCompletedFromAssets =
    Math.min(
      Math.max(
        1,
        mandatoryTrustedCaptures,
      ),
      trustedLiveEvidenceAssets.length,
    );

  const [gpsStatus, setGpsStatus] = useState<
    "idle" |
    "requesting" |
    "success" |
    "failed"
  >("idle");

  const [gpsCoordinates, setGpsCoordinates] =
    useState<TrustedGpsCoordinates | null>(null);

  const [gpsMessage, setGpsMessage] =
    useState("");

  const [captureSession, setCaptureSession] =
    useState<{
      sessionId: string | null;
      nonce: string | null;
      startedAt: string | null;
      completedAt: string | null;
      captureNumber: number;
      status:
        | "idle"
        | "created"
        | "capturing"
        | "uploaded"
        | "completed";
    }>({
      sessionId: null,
      nonce: null,
      startedAt: null,
      completedAt: null,
      captureNumber: 0,
      status: "idle",
    });

  useEffect(() => {
    const required = Math.max(
      1,
      mandatoryTrustedCaptures,
    );

    const completed = Math.min(
      required,
      trustedLiveEvidenceAssets.length,
    );

    setTrustedProgress({
      required,
      completed,
      galleryUnlocked:
        completed >= required,
    });

    if (!trustedMode) return;

    if (completed >= required) {
      setTrustedStatus("complete");
      return;
    }

    if (completed > 0) {
      setTrustedStatus("verified");
      return;
    }

    setTrustedStatus((current) =>
      current === "complete" ||
      current === "verified"
        ? "idle"
        : current,
    );
  }, [
    mandatoryTrustedCaptures,
    trustedLiveEvidenceAssets.length,
    trustedMode,
  ]);

  function transitionTrustedState(next: TrustedUploadStatus) {
  setTrustedStatus((current) => {
    if (current === next) return current;
    return next;
  });
}

async function createCaptureSession(
  coordinates: TrustedGpsCoordinates,
) {
  const trustedEntity = trustedEntityForModule(module);
  if (!trustedEntity) {
    setCameraError("Trusted live capture is not supported for this media type.");
    return false;
  }

  trustedDraftTokenRef.current ??= crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const createResponse = await fetch("/api/trusted-media/capture-session", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityType: trustedEntity.entityType,
      draftToken: trustedDraftTokenRef.current,
      platform: "web",
    }),
  });
  const created = await createResponse.json().catch(() => null);
  const sessionId = created?.session?.id;
  const nonce = created?.nonce;

  if (!createResponse.ok || !sessionId || !nonce) {
    setCameraError(created?.error || "Unable to start a secure capture session.");
    return false;
  }

  const locationResponse = await fetch(
    `/api/trusted-media/capture-session/${sessionId}/location`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonce,
        location: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracyMetres: coordinates.accuracy,
          capturedAt: startedAt,
          provider: "browser_geolocation",
        },
      }),
    },
  );
  const located = await locationResponse.json().catch(() => null);

  if (!locationResponse.ok || !located?.ok) {
    setCameraError(located?.error || "Unable to secure the GPS evidence.");
    return false;
  }

  setCaptureSession({
    sessionId,
    nonce,
    startedAt,
    completedAt: null,
    captureNumber: trustedCompletedFromAssets + 1,
    status: "created",
  });

  return true;
}
async function acquireGpsLocation() {
  if (!navigator.geolocation) {
    setGpsStatus("failed");
    setGpsMessage(
      "GPS is not supported on this device.",
    );
    return null;
  }

  setGpsStatus("requesting");
  setGpsMessage(
    "Acquiring GPS location...",
  );

  transitionTrustedState(
    "waiting_gps",
  );

  return new Promise<TrustedGpsCoordinates | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGpsCoordinates(coordinates);

        setGpsStatus("success");
        setGpsMessage(
          "GPS acquired successfully.",
        );

        resolve(coordinates);
      },

      () => {
        setGpsStatus("failed");
        setGpsMessage(
          "Unable to obtain GPS location.",
        );
        resolve(null);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

  function stopInlineCamera() {
    const stream = inlineStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    inlineStreamRef.current = null;

    if (inlineVideoRef.current) {
      inlineVideoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraStarting(false);
  }

  useEffect(() => {
    return () => {
      const stream = inlineStreamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, [capturedPreviewUrl]);

  function clearCapturedPhoto() {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }

    setCapturedPhoto(null);
    setCapturedPreviewUrl("");
    setCapturedAt("");
  }

  async function useCapturedPhoto() {
    if (!capturedPhoto || uploading) return;

    const file = capturedPhoto;
    clearCapturedPhoto();
    const captureTimestamp =
      capturedAt ||
      new Date().toISOString();

    await uploadFiles([file], {
      ...assetMetadata,

      captureSource: "live_camera",
      captureTimestamp,

      outputPreset,
      preparedBeforeUpload: true,
      preparationRequired:
        requirePreparation,

      mandatoryTrustedCapture:
        trustedMode,

      gpsVerified:
        trustedMode
          ? gpsStatus === "success"
          : undefined,

      gpsLatitude:
        trustedMode
          ? gpsCoordinates?.latitude
          : undefined,

      gpsLongitude:
        trustedMode
          ? gpsCoordinates?.longitude
          : undefined,

      gpsAccuracy:
        trustedMode
          ? gpsCoordinates?.accuracy
          : undefined,

      captureSessionId:
        trustedMode
          ? captureSession.sessionId
          : undefined,

      captureSessionStartedAt:
        trustedMode
          ? captureSession.startedAt
          : undefined,

      captureSessionCompleted:
        trustedMode,

      captureSessionCompletedAt:
        trustedMode
          ? captureTimestamp
          : undefined,

      provenanceStatus:
        trustedMode
          ? "verified"
          : undefined,

      aiVerificationStatus:
        trustedMode
          ? "pending"
          : undefined,
    });
  }

  async function retakeCapturedPhoto() {
    clearCapturedPhoto();
    await startInlineCamera();
  }

  async function startInlineCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "This browser cannot open a live camera preview. Open this page in the latest Chrome browser and tap Start Live Camera.",
      );
      return;
    }

    setCameraError("");
    if (trustedMode) {
      const coordinates =
        await acquireGpsLocation();

      if (!coordinates) {
        return;
      }

      const sessionReady =
        await createCaptureSession(coordinates);

      if (!sessionReady) {
        return;
      }

      transitionTrustedState(
        "session_created",
      );
    }
    setCameraStarting(true);
      if (trustedMode) {
      transitionTrustedState("camera_ready");
    }
    clearCapturedPhoto();

    try {
      stopInlineCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: cameraFacing,
          },
          width: {
            ideal: cameraFacing === "user" ? 1080 : 1920,
          },
          height: {
            ideal: 1080,
          },
        },
      });

      inlineStreamRef.current = stream;
      setCameraOpen(true);
      setCameraStarting(false);

      window.setTimeout(async () => {
        const video = inlineVideoRef.current;

        if (!video) {
          return;
        }

        video.srcObject = stream;

        try {
          await video.play();
        } catch {
          setCameraError(
            "The camera opened but the preview could not start. Close the camera and tap Start Live Camera again.",
          );
        }
      }, 30);
    } catch (error) {
      stopInlineCamera();

      const errorName = error instanceof DOMException ? error.name : "";

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setCameraError(
          "Camera access was not granted. Tap Start Live Camera again and choose Allow when your browser asks for camera permission.",
        );
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError"
      ) {
        setCameraError(
          "No usable camera was detected on this device. Continue this selfie step from a mobile phone with a camera.",
        );
      } else {
        setCameraError(
          "The live camera could not start. Close and reopen this page in Chrome, then tap Start Live Camera and choose Allow.",
        );
      }
    }
  }

  async function captureInlinePhoto() {
    if (
      trustedMode &&
      gpsStatus !== "success"
    ) {
      setCameraError(
        "GPS verification is required before capturing a trusted photo.",
      );

      return;
    }
    const video = inlineVideoRef.current;
    const canvas = inlineCanvasRef.current;

    if (!video || !canvas || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError(
        "The camera preview is not ready yet. Wait a moment and try again.",
      );
      return;
    }

    const sourceSize = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = Math.max(
      0,
      Math.floor((video.videoWidth - sourceSize) / 2),
    );
    const sourceY = Math.max(
      0,
      Math.floor((video.videoHeight - sourceSize) / 2),
    );
    const outputSize = Math.min(1080, sourceSize);

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("The selfie could not be captured on this browser.");
      return;
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      setCameraError("The selfie could not be prepared for upload.");
      return;
    }

    const file = new File([blob], `live-selfie-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    stopInlineCamera();

    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    if (trustedMode) {
    setCaptureSession(
      (current) => ({
        ...current,
        status: "capturing",
      }),
    );
  }
    setCapturedPhoto(file);
      if (trustedMode) {
    transitionTrustedState("captured");
  }
    setCapturedAt(new Date().toISOString());
    setCapturedPreviewUrl(URL.createObjectURL(file));
  }

  const acceptList = [
    allowImages ? "image/*" : "",
    allowVideos ? "video/*" : "",
    allowDocuments ? "application/pdf" : "",
  ]
    .filter(Boolean)
    .join(",");

  async function uploadFiles(
    files: FileList | File[],
    uploadMetadata: Record<string, unknown> = {},
  ) {
    const incoming = Array.from(files || []);
    if (!incoming.length || uploading) return;

    setMessage("");
    setProgressText("");
    setQualityWarnings([]);

    if (value.length + incoming.length > maxFiles) {
      setMessage(
        `Maximum ${maxFiles} files allowed. Please remove some files first.`,
      );
      return;
    }

    setUploading(true);
      if (trustedMode) {
    transitionTrustedState("uploading");
  }

    let uploaded: UploadedMediaAsset[] = [];

try {
      const isTrustedCapture =
        trustedMode && uploadMetadata.captureSource === "live_camera";
      const trustedEntity = isTrustedCapture
        ? trustedEntityForModule(module)
        : null;

      let trustedContext: TrustedUploadContext | undefined;
      if (isTrustedCapture) {
        if (
          !trustedEntity ||
          !captureSession.sessionId ||
          !captureSession.nonce ||
          !trustedDraftTokenRef.current
        ) {
          throw new Error(
            "The secure capture session is incomplete. Please retake the live photo.",
          );
        }

        trustedContext = {
          sessionId: captureSession.sessionId,
          nonce: captureSession.nonce,
          entityType: trustedEntity.entityType,
          draftToken: trustedDraftTokenRef.current,
          evidenceRole: trustedEntity.evidenceRole,
          isMandatoryEvidence: true,
          originType: "trusted_web",
          capturedAtClient: String(
            uploadMetadata.captureTimestamp || new Date().toISOString(),
          ),
          sortOrder: trustedCompletedFromAssets,
        };
      }

      const result = await executeMediaUpload(
        {
          supabase,
          module,
          files: incoming,
          folder,
          allowImages,
          allowVideos,
          allowDocuments,
          uploadMetadata,
          trusted: trustedContext,
          onProgress(progress) {
            setProgressText(progress.message);
          },
          onQualityWarnings(warnings) {
            setQualityWarnings((previous) => [
              ...previous,
              ...warnings,
            ]);
          },
        },
        isTrustedCapture ? "trusted" : "standard",
      );

      uploaded = result.uploaded;
      const rejected = result.rejected;

      if (uploaded.length) {
        onChange([...value, ...uploaded]);
      }

      const trustedUploads =
        uploaded.filter(
          isTrustedLiveEvidenceAsset,
        );

      if (
        trustedMode &&
        trustedUploads.length
      ) {
        transitionTrustedState(
          "verified",
        );

        setCaptureSession(
          (current) => ({
            ...current,
            status: "uploaded",
          }),
        );
      }

      if (uploaded.length && rejected.length) {
        setMessage(
          `Uploaded ${uploaded.length} file(s). ${rejected.length} file(s) skipped.`,
        );
      } else if (uploaded.length) {
        setMessage(`Uploaded ${uploaded.length} file(s) successfully.`);
      } else if (rejected.length) {
        setMessage(rejected[0]);
      } else {
        setMessage("No file uploaded.");
      }
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || "Upload failed.");
    } finally {
      if (trustedMode) {
        const newlyAcceptedTrustedCaptures =
          uploaded.filter(
            isTrustedLiveEvidenceAsset,
          ).length;

        const completed = Math.min(
          Math.max(
            1,
            mandatoryTrustedCaptures,
          ),
          trustedLiveEvidenceAssets.length +
            newlyAcceptedTrustedCaptures,
        );

        if (
          completed >=
          Math.max(
            1,
            mandatoryTrustedCaptures,
          )
        ) {
          transitionTrustedState("complete");

          setCaptureSession((current) => ({
            ...current,
            status: "completed",
            completedAt: new Date().toISOString(),
          }));
        } else {
          transitionTrustedState("verified");
        }
      }

      setUploading(false);
      setProgressText("");
    }
  }

  function removeAsset(id: string) {
    if (uploading) return;
    onChange(value.filter((x) => x.id !== id));
  }

  const usedSlots = value.length;
  const remainingSlots = Math.max(0, maxFiles - usedSlots);

  const trustedRequired = Math.max(
    1,
    mandatoryTrustedCaptures,
  );

  const trustedCompleted =
    trustedCompletedFromAssets;
  const trustedCompletionPercent = Math.round(
    (trustedCompleted / trustedRequired) * 100,
  );
  const trustedGalleryReady =
    trustedProgress.galleryUnlocked ||
    trustedCompleted >= trustedRequired;

  return (
    <div
      style={{
        marginTop: 14,
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 14,
        background: "#ffffff",
        boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
      }}
    >
      {trustedMode && showTrustedBanner ? (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid #bfdbfe",
            borderRadius: 16,
            padding: 14,
            background:
              "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#1e3a8a",
              fontSize: 15,
              fontWeight: 950,
            }}
          >
            <span aria-hidden="true">🔒</span>
            Trusted Listing Mode
            <div
  style={{
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
  }}
>
  Status :
  <span
    style={{
      marginLeft: 6,
      color: "#2563eb",
    }}
  >
    {trustedStatus
      .replace(/_/g, " ")
      .toUpperCase()}
  </span>
</div>
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Live camera evidence, GPS verification,
            capture date and time, and AI checks help
            buyers trust this listing.
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(145px, 1fr))",
              gap: 8,
            }}
          >
            {[
              "Live camera required",
              "GPS verification",
              "Date and time recorded",
              "AI review prepared",
            ].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: 10,
                  padding: "8px 9px",
                  background: "#ffffff",
                  color: "#1e3a8a",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                ✓ {item}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 10,
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff7ed",
              color: "#9a3412",
              fontSize: 12,
              fontWeight: 850,
              lineHeight: 1.5,
            }}
          >
            Complete the mandatory live captures before
            gallery uploads are unlocked.
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #dbeafe",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              <div>
                GPS Status :
                {" "}
                <b>{gpsStatus.toUpperCase()}</b>
              </div>

              <div
                style={{
                  marginTop: 4,
                }}
              >
                {gpsMessage || "GPS not acquired."}
              </div>

              {gpsCoordinates ? (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                  }}
                >
                  Accuracy :
                  {" "}
                  {Math.round(
                    gpsCoordinates.accuracy,
                  )}
                  m
                </div>
              ) : null}
              <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#334155",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                  color: "#0f172a",
                }}
              >
                Capture Session
              </div>

              <div style={{ marginTop: 5 }}>
                Session:{" "}
                <b>
                  {captureSession.sessionId
                    ? captureSession.sessionId.slice(0, 12)
                    : "Not created"}
                </b>
              </div>

              <div>
                Capture number:{" "}
                <b>{captureSession.captureNumber || "—"}</b>
              </div>

              <div>
                Status:{" "}
                <b>
                  {captureSession.status
                    .replace(/_/g, " ")
                    .toUpperCase()}
                </b>
              </div>

              {captureSession.startedAt ? (
                <div>
                  Started:{" "}
                  <b>
                    {new Date(
                      captureSession.startedAt,
                    ).toLocaleString()}
                  </b>
                </div>
              ) : null}

              {captureSession.completedAt ? (
                <div>
                  Completed:{" "}
                  <b>
                    {new Date(
                      captureSession.completedAt,
                    ).toLocaleString()}
                  </b>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {trustedMode ? (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 14,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 950,
                }}
              >
                Mandatory Live Captures
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Capture the actual listing through the
                live camera before adding gallery media.
              </div>
            </div>

            <div
              style={{
                border: trustedGalleryReady
                  ? "1px solid #bbf7d0"
                  : "1px solid #fde68a",
                borderRadius: 999,
                padding: "6px 10px",
                background: trustedGalleryReady
                  ? "#f0fdf4"
                  : "#fffbeb",
                color: trustedGalleryReady
                  ? "#166534"
                  : "#92400e",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              {trustedCompleted}/{trustedRequired} completed
            </div>
          </div>

          <div
            aria-label={`${trustedCompletionPercent}% of mandatory trusted captures completed`}
            style={{
              marginTop: 12,
              height: 10,
              overflow: "hidden",
              borderRadius: 999,
              background: "#e2e8f0",
            }}
          >
            <div
              style={{
                width: `${trustedCompletionPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: trustedGalleryReady
                  ? "#16a34a"
                  : "#2563eb",
                transition: "width 180ms ease",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: `repeat(${trustedRequired}, minmax(28px, 1fr))`,
              gap: 7,
            }}
          >
            {Array.from(
              { length: trustedRequired },
              (_, index) => {
                const completed =
                  index < trustedCompleted;

                return (
                  <div
                    key={`trusted-capture-${index + 1}`}
                    style={{
                      minHeight: 34,
                      display: "grid",
                      placeItems: "center",
                      border: completed
                        ? "1px solid #86efac"
                        : "1px solid #cbd5e1",
                      borderRadius: 10,
                      background: completed
                        ? "#f0fdf4"
                        : "#f8fafc",
                      color: completed
                        ? "#166534"
                        : "#64748b",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    {completed
                      ? `✓ ${index + 1}`
                      : index + 1}
                  </div>
                );
              },
            )}
          </div>

          <div
            style={{
              marginTop: 12,
              border: trustedGalleryReady
                ? "1px solid #bbf7d0"
                : "1px solid #fed7aa",
              borderRadius: 12,
              padding: "10px 11px",
              background: trustedGalleryReady
                ? "#f0fdf4"
                : "#fff7ed",
              color: trustedGalleryReady
                ? "#166534"
                : "#9a3412",
              fontSize: 12,
              fontWeight: 850,
              lineHeight: 1.5,
            }}
          >
            {trustedGalleryReady
              ? "✓ Mandatory live captures are complete. Gallery upload is ready."
              : "🔒 Gallery upload will unlock after all mandatory live captures are completed."}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 950, color: "#111827", fontSize: 15 }}>
            {label}
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {helperText}
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1e3a8a",
            borderRadius: 12,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 950,
          }}
        >
          {usedSlots}/{maxFiles} added
        </div>
      </div>

      {inlineCamera && allowImages && remainingSlots > 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
          }}
        >
          <div
            style={{
              fontWeight: 950,
              color: "#1e3a8a",
            }}
          >
            Live camera
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Allow camera access, keep your face and business signboard visible,
            then capture and upload the selfie.
          </div>

          {capturedPreviewUrl ? (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  position: "relative",
                  width: "min(100%, 420px)",
                  aspectRatio: "1 / 1",
                  margin: "0 auto",
                  overflow: "hidden",
                  borderRadius: 18,
                  background: "#0f172a",
                }}
              >
                <img
                  src={capturedPreviewUrl}
                  alt="Captured photo preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void useCapturedPhoto()}
                  style={{
                    ...buttonStyle(uploading),
                    background: "#16a34a",
                    color: "#ffffff",
                  }}
                >
                  ✓ Use This Photo
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void retakeCapturedPhoto()}
                  style={buttonStyle(uploading)}
                >
                  ↻ Retake
                </button>
              </div>
            </div>
          ) : !cameraOpen ? (
            <button
              type="button"
              disabled={uploading || cameraStarting}
              onClick={() => void startInlineCamera()}
              style={{
                ...buttonStyle(uploading || cameraStarting),
                marginTop: 10,
                width: "100%",
                background: "#1d4ed8",
                color: "#ffffff",
              }}
            >
              {cameraStarting ? "Opening Camera..." : "📷 Start Live Camera"}
            </button>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  position: "relative",
                  width: "min(100%, 420px)",
                  aspectRatio: "1 / 1",
                  margin: "0 auto",
                  overflow: "hidden",
                  borderRadius: 18,
                  background: "#0f172a",
                }}
              >
                <video
                  ref={inlineVideoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    background: "#0f172a",
                    transform:
                      cameraFacing === "user" ? "scaleX(-1)" : undefined,
                  }}
                />

                {cameraGuide === "face" ? (
                  <>
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "47%",
                        width: "52%",
                        height: "68%",
                        transform: "translate(-50%, -50%)",
                        border: "3px solid rgba(255,255,255,0.95)",
                        borderRadius: "48% 48% 44% 44% / 42% 42% 58% 58%",
                        boxShadow:
                          "0 0 0 999px rgba(15,23,42,0.28), 0 0 0 2px rgba(37,99,235,0.5)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        bottom: 12,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(15,23,42,0.74)",
                        color: "#fff",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 850,
                      }}
                    >
                      Keep your full face inside the guide and look at the
                      camera.
                    </div>
                  </>
                ) : null}
              </div>

              <canvas ref={inlineCanvasRef} hidden />

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void captureInlinePhoto()}
                  style={{
                    ...buttonStyle(uploading),
                    background: "#16a34a",
                    color: "#ffffff",
                  }}
                >
                  🤳 Capture Photo
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={stopInlineCamera}
                  style={buttonStyle(uploading)}
                >
                  Cancel Camera
                </button>
              </div>
            </div>
          )}

          {cameraError ? (
            <div
              role="alert"
              style={{
                marginTop: 10,
                padding: "9px 10px",
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              {cameraError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {allowImages && !inlineCamera ? (
          <>
            <button
              type="button"
              disabled={uploading || remainingSlots <= 0}
              onClick={() => cameraInputRef.current?.click()}
              style={buttonStyle(uploading || remainingSlots <= 0)}
            >
              {cameraButtonLabel}
            </button>

            {!cameraOnly ? (
              <button
                type="button"
                disabled={uploading || remainingSlots <= 0}
                onClick={() => imageInputRef.current?.click()}
                style={buttonStyle(uploading || remainingSlots <= 0)}
              >
                🖼 Upload Photo
              </button>
            ) : null}
          </>
        ) : null}

        {trustedMode &&
          inlineCamera &&
          allowImages &&
          !cameraOnly ? (
            <button
              type="button"
              disabled={
                uploading ||
                remainingSlots <= 0 ||
                !trustedGalleryReady
              }
              onClick={() =>
                imageInputRef.current?.click()
              }
              style={buttonStyle(
                uploading ||
                  remainingSlots <= 0 ||
                  !trustedGalleryReady,
              )}
              title={
                trustedGalleryReady
                  ? "Upload additional gallery photos"
                  : "Complete all mandatory live captures first"
              }
            >
              {trustedGalleryReady
                ? "🖼 Add Gallery Photos"
                : "🔒 Gallery Photos Locked"}
            </button>
          ) : null}

        {allowVideos ? (
          <button
            type="button"
            disabled={uploading || remainingSlots <= 0}
            onClick={() => videoInputRef.current?.click()}
            style={buttonStyle(uploading || remainingSlots <= 0)}
          >
            🎥 Add Video
          </button>
        ) : null}

        {allowDocuments ? (
          <button
            type="button"
            disabled={uploading || remainingSlots <= 0}
            onClick={() => documentInputRef.current?.click()}
            style={buttonStyle(uploading || remainingSlots <= 0)}
          >
            📄 Add PDF
          </button>
        ) : null}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={cameraFacing}
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept={allowVideos ? acceptList : "image/*"}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      <input
        ref={documentInputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />

      <div
        style={{
          marginTop: 12,
          borderRadius: 12,
          padding: 12,
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          color: "#475569",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <b>AI media guidance:</b> Use daylight, keep the object/property
        centered, avoid blur, show front view, side view, defects, measurements
        and surrounding access road. Short videos should be steady and under the
        size limit.
      </div>

      {qualityWarnings.length ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 12,
            padding: 12,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 13,
            lineHeight: 1.5,
            fontWeight: 800,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 6 }}>
            🤖 AI media quality suggestions
          </div>

          {qualityWarnings.slice(0, 4).map((warning, index) => (
            <div
              key={`${warning.type}-${index}`}
              style={{ marginTop: index ? 4 : 0 }}
            >
              • {warning.message}
            </div>
          ))}

          {qualityWarnings.length > 4 ? (
            <div style={{ marginTop: 4 }}>
              • {qualityWarnings.length - 4} more suggestion(s)
            </div>
          ) : null}
        </div>
      ) : null}

      {uploading || progressText ? (
        <div style={{ marginTop: 10, color: "#2563eb", fontWeight: 900 }}>
          {progressText || "Uploading and optimizing..."}
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            marginTop: 10,
            color:
              message.toLowerCase().includes("failed") ||
              message.toLowerCase().includes("error") ||
              message.toLowerCase().includes("not found") ||
              message.toLowerCase().includes("large") ||
              message.toLowerCase().includes("skipped") ||
              message.toLowerCase().includes("unsupported")
                ? "crimson"
                : "#047857",
            fontWeight: 850,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      ) : null}

      {value.length ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {value.map((asset) => (
            <div
              key={asset.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              {trustedMode ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    padding: "8px 8px 0",
                    background: "#ffffff",
                  }}
                >
                  {[
                    {
                      label: "LIVE",
                      bg: "#dcfce7",
                      fg: "#166534",
                    },
                    {
                      label:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "GPS VERIFIED"
                          : "GPS PENDING",

                      bg:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "#dcfce7"
                          : "#fef3c7",

                      fg:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "#166534"
                          : "#92400e",
                  },
                    {
                      label:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "AI VERIFIED"
                          : "AI PENDING",

                      bg:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "#dcfce7"
                          : "#fef3c7",

                      fg:
                        trustedStatus === "verified" ||
                        trustedStatus === "complete"
                          ? "#166534"
                          : "#92400e",
                  },
                    {
                      label:
                        trustedStatus === "complete"
                          ? "COMPLETE"
                          : "TRUSTED",

                      bg: "#dbeafe",

                      fg: "#1d4ed8",
                  },
                  ].map((badge) => (
                    <span
                      key={badge.label}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: badge.bg,
                        color: badge.fg,
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 0.3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}

              {asset.kind === "image" ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : asset.kind === "video" ? (
                <video
                  src={asset.url}
                  controls
                  style={{
                    width: "100%",
                    height: 120,
                    objectFit: "cover",
                    display: "block",
                    background: "#000",
                  }}
                />
              ) : (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="registration-document-link"
                  aria-label={`Open ${asset.name}`}
                >
                  <span>📄 Open PDF</span>
                </a>
              )}

              <div style={{ padding: 10 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}
                >
                  {asset.name.length > 26
                    ? `${asset.name.slice(0, 26)}...`
                    : asset.name}
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: "#64748b",
                    fontWeight: 800,
                  }}
                >
                  {asset.kind} • {formatMediaSize(asset.size)}
                </div>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => removeAsset(asset.id)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    border: "1px solid #fecaca",
                    background: uploading ? "#f8fafc" : "#fff1f2",
                    color: uploading ? "#94a3b8" : "#be123c",
                    borderRadius: 10,
                    padding: "7px 8px",
                    fontWeight: 900,
                    cursor: uploading ? "not-allowed" : "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 44,
    border: "1px solid #dbeafe",
    background: disabled ? "#f1f5f9" : "#eff6ff",
    color: disabled ? "#94a3b8" : "#1e3a8a",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
