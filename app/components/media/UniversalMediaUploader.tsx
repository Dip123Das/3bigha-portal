"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  executeMediaUpload,
} from "@/lib/media/upload-engine";

import type {
  MediaUploadStrategyKey,
  TrustedUploadContext,
} from "@/lib/media/upload-strategy";

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
  uploadStrategy?: MediaUploadStrategyKey;
  trustedUploadContext?: TrustedUploadContext;
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
  uploadStrategy,
  trustedUploadContext,
}: UniversalMediaUploaderProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef =
    useRef<HTMLInputElement | null>(null);
  const inlineVideoRef =
    useRef<HTMLVideoElement | null>(null);
  const inlineCanvasRef =
    useRef<HTMLCanvasElement | null>(null);
  const inlineStreamRef =
    useRef<MediaStream | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] =
    useState(false);
  const [cameraError, setCameraError] = useState("");
  const [message, setMessage] = useState("");
  const [progressText, setProgressText] = useState("");
  const [qualityWarnings, setQualityWarnings] = useState<MediaQualityWarning[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState("");
  const [capturedAt, setCapturedAt] = useState("");

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
    await uploadFiles([file], {
      ...assetMetadata,
      captureSource: "live_camera",
      captureTimestamp:
        capturedAt || new Date().toISOString(),
      outputPreset,
      preparedBeforeUpload: true,
      preparationRequired: requirePreparation,
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
        "This browser cannot open a live camera preview. Open this page in the latest Chrome browser and tap Start Live Camera."
      );
      return;
    }

    setCameraError("");
    setCameraStarting(true);
    clearCapturedPhoto();

    try {
      stopInlineCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
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
            "The camera opened but the preview could not start. Close the camera and tap Start Live Camera again."
          );
        }
      }, 30);
    } catch (error) {
      stopInlineCamera();

      const errorName =
        error instanceof DOMException
          ? error.name
          : "";

      if (
        errorName === "NotAllowedError" ||
        errorName === "SecurityError"
      ) {
        setCameraError(
          "Camera access was not granted. Tap Start Live Camera again and choose Allow when your browser asks for camera permission."
        );
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError"
      ) {
        setCameraError(
          "No usable camera was detected on this device. Continue this selfie step from a mobile phone with a camera."
        );
      } else {
        setCameraError(
          "The live camera could not start. Close and reopen this page in Chrome, then tap Start Live Camera and choose Allow."
        );
      }
    }
  }

  async function captureInlinePhoto() {
    const video = inlineVideoRef.current;
    const canvas = inlineCanvasRef.current;

    if (
      !video ||
      !canvas ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      setCameraError(
        "The camera preview is not ready yet. Wait a moment and try again."
      );
      return;
    }

    const sourceSize = Math.min(
      video.videoWidth,
      video.videoHeight
    );
    const sourceX = Math.max(
      0,
      Math.floor((video.videoWidth - sourceSize) / 2)
    );
    const sourceY = Math.max(
      0,
      Math.floor((video.videoHeight - sourceSize) / 2)
    );
    const outputSize = Math.min(1080, sourceSize);

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError(
        "The selfie could not be captured on this browser."
      );
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
      outputSize
    );

    const blob = await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.9
        );
      }
    );

    if (!blob) {
      setCameraError(
        "The selfie could not be prepared for upload."
      );
      return;
    }

    const file = new File(
      [blob],
      `live-selfie-${Date.now()}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );

    stopInlineCamera();

    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }

    setCapturedPhoto(file);
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
    uploadMetadata: Record<string, unknown> = {}
  ) {
    const incoming = Array.from(files || []);

    if (!incoming.length || uploading) {
      return;
    }

    setMessage("");
    setProgressText("");
    setQualityWarnings([]);

    if (
      value.length + incoming.length >
      maxFiles
    ) {
      setMessage(
        `Maximum ${maxFiles} files allowed. Please remove some files first.`
      );
      return;
    }

    setUploading(true);

    try {
      const result =
        await executeMediaUpload(
          {
            supabase,
            module,
            files: incoming,
            folder,
            allowImages,
            allowVideos,
            allowDocuments,
            uploadMetadata,
            trusted: trustedUploadContext,
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
          uploadStrategy
        );

      if (result.uploaded.length) {
        onChange([
          ...value,
          ...result.uploaded,
        ]);
      }

      if (
        result.uploaded.length &&
        result.rejected.length
      ) {
        setMessage(
          `Uploaded ${result.uploaded.length} file(s). ${result.rejected.length} file(s) skipped.`
        );
      } else if (result.uploaded.length) {
        setMessage(
          `Uploaded ${result.uploaded.length} file(s) successfully.`
        );
      } else if (result.rejected.length) {
        setMessage(result.rejected[0]);
      } else {
        setMessage("No file uploaded.");
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed."
      );
    } finally {
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, color: "#111827", fontSize: 15 }}>
            {label}
          </div>

          <div style={{ marginTop: 5, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
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

      {inlineCamera &&
      allowImages &&
      remainingSlots > 0 ? (
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
            Allow camera access, keep your face and
            business signboard visible, then capture
            and upload the selfie.
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
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
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
              onClick={() =>
                void startInlineCamera()
              }
              style={{
                ...buttonStyle(
                  uploading || cameraStarting
                ),
                marginTop: 10,
                width: "100%",
                background: "#1d4ed8",
                color: "#ffffff",
              }}
            >
              {cameraStarting
                ? "Opening Camera..."
                : "📷 Start Live Camera"}
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
                      cameraFacing === "user"
                        ? "scaleX(-1)"
                        : undefined,
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
                      Keep your full face inside the guide and look at the camera.
                    </div>
                  </>
                ) : null}
              </div>

              <canvas
                ref={inlineCanvasRef}
                hidden
              />

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() =>
                    void captureInlinePhoto()
                  }
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
          gridTemplateColumns:
            "repeat(auto-fit, minmax(130px, 1fr))",
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
        <b>AI media guidance:</b> Use daylight, keep the object/property centered,
        avoid blur, show front view, side view, defects, measurements and surrounding access road.
        Short videos should be steady and under the size limit.
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
            <div key={`${warning.type}-${index}`} style={{ marginTop: index ? 4 : 0 }}>
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
                  <span>
                    📄 Open PDF
                  </span>
                </a>
              )}

              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>
                  {asset.name.length > 26 ? `${asset.name.slice(0, 26)}...` : asset.name}
                </div>

                <div style={{ marginTop: 3, fontSize: 11, color: "#64748b", fontWeight: 800 }}>
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
