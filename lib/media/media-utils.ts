import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  UNIVERSAL_MEDIA_LIMITS,
  type UniversalMediaKind,
} from "@/lib/media/media-config";

export type MediaQualityWarning = {
  type: "low_resolution" | "dark_image" | "possibly_blurry" | "large_file";
  message: string;
};

export type MediaQualityReport = {
  width?: number;
  height?: number;
  brightness?: number;
  sharpness?: number;
  warnings: MediaQualityWarning[];
};

export function getMediaKind(file: File): UniversalMediaKind | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return "video";
  if (ACCEPTED_DOCUMENT_TYPES.includes(file.type)) return "document";
  return null;
}

export function validateUniversalMediaFile(file: File): string | null {
  const kind = getMediaKind(file);

  if (!kind) return "Unsupported file type. Please upload image, video or PDF only.";

  if (kind === "image" && file.size > UNIVERSAL_MEDIA_LIMITS.maxImageSize) {
    return "Image is too large. Please upload image under 8 MB.";
  }

  if (kind === "video" && file.size > UNIVERSAL_MEDIA_LIMITS.maxVideoSize) {
    return "Video is too large. Please upload video under 80 MB.";
  }

  if (kind === "document" && file.size > UNIVERSAL_MEDIA_LIMITS.maxDocumentSize) {
    return "Document is too large. Please upload PDF under 20 MB.";
  }

  return null;
}

export function safeMediaFileName(name: string) {
  const clean = String(name || "media")
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_");

  return clean || "media";
}

export function formatMediaSize(size: number) {
  if (!Number.isFinite(size)) return "—";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function analyzeImageQuality(file: File): Promise<MediaQualityReport | null> {
  if (getMediaKind(file) !== "image") return null;
  if (typeof window === "undefined") return null;

  try {
    const bitmap = await createImageBitmap(file);

    const sampleWidth = Math.min(320, bitmap.width);
    const sampleHeight = Math.max(1, Math.round((bitmap.height / bitmap.width) * sampleWidth));

    const canvas = document.createElement("canvas");
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);

    const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

    let brightnessSum = 0;
    let edgeSum = 0;
    let count = 0;

    for (let y = 1; y < sampleHeight - 1; y += 2) {
      for (let x = 1; x < sampleWidth - 1; x += 2) {
        const idx = (y * sampleWidth + x) * 4;
        const leftIdx = (y * sampleWidth + (x - 1)) * 4;
        const rightIdx = (y * sampleWidth + (x + 1)) * 4;

        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const leftGray = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
        const rightGray = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];

        brightnessSum += gray;
        edgeSum += Math.abs(rightGray - leftGray);
        count++;
      }
    }

    const brightness = count ? brightnessSum / count : 0;
    const sharpness = count ? edgeSum / count : 0;

    const warnings: MediaQualityWarning[] = [];

    if (bitmap.width < 700 || bitmap.height < 500) {
      warnings.push({
        type: "low_resolution",
        message: "Image resolution looks low. A clearer photo may improve buyer trust.",
      });
    }

    if (brightness < 55) {
      warnings.push({
        type: "dark_image",
        message: "Image looks dark. Try taking the photo in daylight or better lighting.",
      });
    }

    if (sharpness < 7) {
      warnings.push({
        type: "possibly_blurry",
        message: "Image may be blurry. Hold the phone steady and retake if possible.",
      });
    }

    if (file.size > 4 * 1024 * 1024) {
      warnings.push({
        type: "large_file",
        message: "Large image detected. It will be optimized before upload.",
      });
    }

    return {
      width: bitmap.width,
      height: bitmap.height,
      brightness,
      sharpness,
      warnings,
    };
  } catch {
    return null;
  }
}

export async function compressImageIfNeeded(file: File): Promise<File> {
  const kind = getMediaKind(file);
  if (kind !== "image") return file;
  if (typeof window === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const maxWidth = UNIVERSAL_MEDIA_LIMITS.imageCompressionMaxWidth;

  if (bitmap.width <= maxWidth && file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", UNIVERSAL_MEDIA_LIMITS.imageCompressionQuality);
  });

  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}