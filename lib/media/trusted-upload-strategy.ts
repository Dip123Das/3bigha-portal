import type {
  UploadedMediaAsset,
} from "@/lib/media/media-config";
import {
  analyzeImageQuality,
  getMediaKind,
  validateUniversalMediaFile,
} from "@/lib/media/media-utils";

import type {
  UploadStrategy,
  UploadStrategyInput,
  UploadStrategyResult,
} from "./upload-strategy";

type TrustedUploadApiResponse = {
  ok: boolean;
  asset?: UploadedMediaAsset;
  error?: string;
};

export class TrustedUploadStrategy
  implements UploadStrategy
{
  readonly key = "trusted" as const;

  async upload(
    input: UploadStrategyInput
  ): Promise<UploadStrategyResult> {
    const trusted = input.trusted;

    if (!trusted) {
      throw new Error(
        "Trusted upload context is required."
      );
    }

    if (input.files.length !== 1) {
      return {
        uploaded: [],
        rejected: [
          "Trusted live evidence must be uploaded one capture at a time.",
        ],
      };
    }

    const file = input.files[0];

    input.onProgress?.({
      stage: "checking",
      current: 1,
      total: 1,
      message:
        "Checking trusted live evidence...",
    });

    const validationError =
      validateUniversalMediaFile(file);

    if (validationError) {
      return {
        uploaded: [],
        rejected: [
          `${file.name}: ${validationError}`,
        ],
      };
    }

    const kind = getMediaKind(file);

    if (kind !== "image") {
      return {
        uploaded: [],
        rejected: [
          `${file.name}: Trusted live evidence currently requires an image.`,
        ],
      };
    }

    if (!input.allowImages) {
      return {
        uploaded: [],
        rejected: [
          `${file.name}: Images are not allowed here.`,
        ],
      };
    }

    input.onProgress?.({
      stage: "quality_check",
      current: 1,
      total: 1,
      message:
        "Checking trusted image quality...",
    });

    const qualityReport =
      await analyzeImageQuality(file);

    if (
      qualityReport?.warnings?.length
    ) {
      input.onQualityWarnings?.(
        qualityReport.warnings
      );
    }

    input.onProgress?.({
      stage: "uploading",
      current: 1,
      total: 1,
      message:
        "Securing trusted evidence...",
    });

    const formData = new FormData();

    formData.set("file", file);
    formData.set(
      "context",
      JSON.stringify({
        ...trusted,
        module: input.module,
        uploadMetadata:
          input.uploadMetadata ?? {},
      })
    );

    const response = await fetch(
      "/api/trusted-media/upload",
      {
        method: "POST",
        body: formData,
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload =
      (await response
        .json()
        .catch(() => null)) as
        | TrustedUploadApiResponse
        | null;

    if (
      !response.ok ||
      !payload?.ok ||
      !payload.asset
    ) {
      return {
        uploaded: [],
        rejected: [
          `${file.name}: ${
            payload?.error ||
            "Trusted evidence upload failed."
          }`,
        ],
      };
    }

    return {
      uploaded: [payload.asset],
      rejected: [],
    };
  }
}

export const trustedUploadStrategy =
  new TrustedUploadStrategy();
