"use client";

import React, { useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  MEDIA_BUCKET_BY_MODULE,
  UNIVERSAL_MEDIA_LIMITS,
  type UniversalMediaModule,
  type UploadedMediaAsset,
} from "@/lib/media/media-config";
import {
  analyzeImageQuality,
  compressImageIfNeeded,
  formatMediaSize,
  getMediaKind,
  safeMediaFileName,
  validateUniversalMediaFile,
  type MediaQualityWarning,
} from "@/lib/media/media-utils";

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
}: UniversalMediaUploaderProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [progressText, setProgressText] = useState("");
  const [qualityWarnings, setQualityWarnings] = useState<MediaQualityWarning[]>([]);

  const acceptList = [
    allowImages ? "image/*" : "",
    allowVideos ? "video/*" : "",
    allowDocuments ? "application/pdf" : "",
  ]
    .filter(Boolean)
    .join(",");

  async function uploadFiles(files: FileList | File[]) {
    const incoming = Array.from(files || []);
    if (!incoming.length || uploading) return;

    setMessage("");
    setProgressText("");
    setQualityWarnings([]);

    if (value.length + incoming.length > maxFiles) {
      setMessage(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      return;
    }

    setUploading(true);

    try {
      const bucket = MEDIA_BUCKET_BY_MODULE[module];
      const uploaded: UploadedMediaAsset[] = [];
      const rejected: string[] = [];
      const baseFolder =
        folder?.trim() || `${module}/${new Date().getFullYear()}/${Date.now()}`;

      for (let index = 0; index < incoming.length; index++) {
        const originalFile = incoming[index];
        setProgressText(`Checking ${index + 1} of ${incoming.length}...`);

        const validationError = validateUniversalMediaFile(originalFile);
        if (validationError) {
          rejected.push(`${originalFile.name}: ${validationError}`);
          continue;
        }

        const kind = getMediaKind(originalFile);
        if (!kind) {
          rejected.push(`${originalFile.name}: Unsupported file type.`);
          continue;
        }

        if (kind === "image" && !allowImages) {
          rejected.push(`${originalFile.name}: Images are not allowed here.`);
          continue;
        }

        if (kind === "video" && !allowVideos) {
          rejected.push(`${originalFile.name}: Videos are not allowed here.`);
          continue;
        }

        if (kind === "document" && !allowDocuments) {
          rejected.push(`${originalFile.name}: Documents are not allowed here.`);
          continue;
        }

        if (kind === "image") {
          setProgressText(`AI checking image quality ${index + 1} of ${incoming.length}...`);

          const report = await analyzeImageQuality(originalFile);
          if (report?.warnings?.length) {
            setQualityWarnings((prev) => [...prev, ...report.warnings]);
          }
        }

        setProgressText(
          kind === "image"
            ? `Optimizing image ${index + 1} of ${incoming.length}...`
            : `Preparing ${index + 1} of ${incoming.length}...`
        );

        const file =
          kind === "image"
            ? await compressImageIfNeeded(originalFile)
            : originalFile;

        const safeName = safeMediaFileName(file.name);
        const objectPath = `${baseFolder}/${Date.now()}_${index}_${safeName}`;

        setProgressText(`Uploading ${index + 1} of ${incoming.length}...`);

        const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

        if (error) {
          rejected.push(`${file.name}: ${error.message}`);
          continue;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

        uploaded.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          url: data.publicUrl,
          bucket,
          path: objectPath,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          kind,
        });
      }

      if (uploaded.length) {
        onChange([...value, ...uploaded]);
      }

      if (uploaded.length && rejected.length) {
        setMessage(`Uploaded ${uploaded.length} file(s). ${rejected.length} file(s) skipped.`);
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

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {allowImages ? (
          <>
            <button
              type="button"
              disabled={uploading || remainingSlots <= 0}
              onClick={() => cameraInputRef.current?.click()}
              style={buttonStyle(uploading || remainingSlots <= 0)}
            >
              📷 Take Photo
            </button>

            <button
              type="button"
              disabled={uploading || remainingSlots <= 0}
              onClick={() => imageInputRef.current?.click()}
              style={buttonStyle(uploading || remainingSlots <= 0)}
            >
              🖼 Upload Photo
            </button>
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
        capture="environment"
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
                <div
                  style={{
                    height: 120,
                    display: "grid",
                    placeItems: "center",
                    background: "#f1f5f9",
                    fontWeight: 950,
                    color: "#334155",
                  }}
                >
                  📄 PDF
                </div>
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
