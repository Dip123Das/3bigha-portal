import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  UniversalMediaModule,
  UploadedMediaAsset,
} from "@/lib/media/media-config";
import type {
  MediaQualityWarning,
} from "@/lib/media/media-utils";
import type {
  TrustedMediaEntityType,
  TrustedMediaEvidenceRole,
  TrustedMediaOriginType,
} from "@/lib/trusted-media/trusted-media-types";

export type MediaUploadStrategyKey =
  | "standard"
  | "trusted";

export type MediaUploadProgress = {
  stage:
    | "checking"
    | "quality_check"
    | "preparing"
    | "uploading"
    | "registering"
    | "completing";
  current: number;
  total: number;
  message: string;
};

export type TrustedUploadContext = {
  sessionId: string;
  nonce: string;
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  businessId?: string | null;
  evidenceRole: TrustedMediaEvidenceRole;
  isMandatoryEvidence?: boolean;
  originType?: Extract<
    TrustedMediaOriginType,
    "trusted_native" | "trusted_web"
  >;
  capturedAtClient: string;
  sortOrder?: number;
};

export type UploadStrategyInput = {
  supabase: SupabaseClient;
  module: UniversalMediaModule;
  files: File[];
  folder?: string;
  allowImages: boolean;
  allowVideos: boolean;
  allowDocuments: boolean;
  uploadMetadata?: Record<string, unknown>;
  trusted?: TrustedUploadContext;
  onProgress?: (
    progress: MediaUploadProgress
  ) => void;
  onQualityWarnings?: (
    warnings: MediaQualityWarning[]
  ) => void;
};

export type UploadStrategyResult = {
  uploaded: UploadedMediaAsset[];
  rejected: string[];
};

export interface UploadStrategy {
  readonly key: MediaUploadStrategyKey;

  upload(
    input: UploadStrategyInput
  ): Promise<UploadStrategyResult>;
}
