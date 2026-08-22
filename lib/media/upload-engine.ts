import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MEDIA_BUCKET_BY_MODULE,
  type UniversalMediaModule,
  type UploadedMediaAsset,
} from "@/lib/media/media-config";

import {
  analyzeImageQuality,
  compressImageIfNeeded,
  getMediaKind,
  safeMediaFileName,
  validateUniversalMediaFile,
  type MediaQualityWarning,
} from "@/lib/media/media-utils";

export type StandardMediaUploadProgress = {
  stage:
    | "checking"
    | "quality_check"
    | "preparing"
    | "uploading";
  current: number;
  total: number;
  message: string;
};

export type StandardMediaUploadInput = {
  supabase: SupabaseClient;
  module: UniversalMediaModule;
  files: File[];
  folder?: string;
  allowImages: boolean;
  allowVideos: boolean;
  allowDocuments: boolean;
  uploadMetadata?: Record<string, unknown>;
  onProgress?: (
    progress: StandardMediaUploadProgress
  ) => void;
  onQualityWarnings?: (
    warnings: MediaQualityWarning[]
  ) => void;
};

export type StandardMediaUploadResult = {
  uploaded: UploadedMediaAsset[];
  rejected: string[];
};

function emitProgress(
  input: StandardMediaUploadInput,
  progress: StandardMediaUploadProgress
) {
  input.onProgress?.(progress);
}

export async function executeStandardMediaUpload(
  input: StandardMediaUploadInput
): Promise<StandardMediaUploadResult> {
  const {
    supabase,
    module,
    files,
    folder,
    allowImages,
    allowVideos,
    allowDocuments,
    uploadMetadata = {},
  } = input;

  const bucket = MEDIA_BUCKET_BY_MODULE[module];
  const uploaded: UploadedMediaAsset[] = [];
  const rejected: string[] = [];

  const baseFolder =
    folder?.trim() ||
    `${module}/${new Date().getFullYear()}/${Date.now()}`;

  for (
    let index = 0;
    index < files.length;
    index++
  ) {
    const originalFile = files[index];
    const current = index + 1;
    const total = files.length;

    emitProgress(input, {
      stage: "checking",
      current,
      total,
      message: `Checking ${current} of ${total}...`,
    });

    const validationError =
      validateUniversalMediaFile(originalFile);

    if (validationError) {
      rejected.push(
        `${originalFile.name}: ${validationError}`
      );
      continue;
    }

    const kind = getMediaKind(originalFile);

    if (!kind) {
      rejected.push(
        `${originalFile.name}: Unsupported file type.`
      );
      continue;
    }

    if (kind === "image" && !allowImages) {
      rejected.push(
        `${originalFile.name}: Images are not allowed here.`
      );
      continue;
    }

    if (kind === "video" && !allowVideos) {
      rejected.push(
        `${originalFile.name}: Videos are not allowed here.`
      );
      continue;
    }

    if (
      kind === "document" &&
      !allowDocuments
    ) {
      rejected.push(
        `${originalFile.name}: Documents are not allowed here.`
      );
      continue;
    }

    if (kind === "image") {
      emitProgress(input, {
        stage: "quality_check",
        current,
        total,
        message:
          `AI checking image quality ${current} of ${total}...`,
      });

      const report =
        await analyzeImageQuality(originalFile);

      if (report?.warnings?.length) {
        input.onQualityWarnings?.(
          report.warnings
        );
      }
    }

    emitProgress(input, {
      stage: "preparing",
      current,
      total,
      message:
        kind === "image"
          ? `Optimizing image ${current} of ${total}...`
          : `Preparing ${current} of ${total}...`,
    });

    const preparedFile =
      kind === "image"
        ? await compressImageIfNeeded(originalFile)
        : originalFile;

    const safeName = safeMediaFileName(
      preparedFile.name
    );

    const objectPath =
      `${baseFolder}/${Date.now()}_${index}_${safeName}`;

    emitProgress(input, {
      stage: "uploading",
      current,
      total,
      message:
        `Uploading ${current} of ${total}...`,
    });

    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, preparedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType:
          preparedFile.type || undefined,
      });

    if (error) {
      rejected.push(
        `${preparedFile.name}: ${error.message}`
      );
      continue;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    uploaded.push({
      id:
        `${Date.now()}_${Math.random()
          .toString(16)
          .slice(2)}`,
      url: data.publicUrl,
      bucket,
      path: objectPath,
      name: preparedFile.name,
      size: preparedFile.size,
      mimeType: preparedFile.type,
      kind,
      ...uploadMetadata,
    } as UploadedMediaAsset);
  }

  return {
    uploaded,
    rejected,
  };
}
