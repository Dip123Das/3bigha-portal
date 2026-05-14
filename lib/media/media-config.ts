export type UniversalMediaModule =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "rfq"
  | "support"
  | "vendor"
  | "project"
  | "blog";

export type UniversalMediaKind = "image" | "video" | "document";

export type UploadedMediaAsset = {
  id: string;
  url: string;
  bucket: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
  kind: UniversalMediaKind;
};

export const MEDIA_BUCKET_BY_MODULE: Record<UniversalMediaModule, string> = {
  property: "listing-media",
  materials: "listing-media",
  services: "listing-media",
  rentals: "listing-media",
  rfq: "rfq-media",
  support: "support-media",
  vendor: "vendor-media",
  project: "listing-media",
  blog: "blog-media",
};

export const UNIVERSAL_MEDIA_LIMITS = {
  maxImageSize: 8 * 1024 * 1024,
  maxVideoSize: 80 * 1024 * 1024,
  maxDocumentSize: 20 * 1024 * 1024,
  maxFiles: 12,
  imageCompressionMaxWidth: 1600,
  imageCompressionQuality: 0.78,
};

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"];