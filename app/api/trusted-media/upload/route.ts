import { createHash, randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  MEDIA_BUCKET_BY_MODULE,
  type UniversalMediaModule,
  type UploadedMediaAsset,
} from "@/lib/media/media-config";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  completeTrustedCaptureSession,
  TrustedCaptureSessionError,
} from "@/lib/trusted-media";
import type {
  TrustedMediaEntityType,
  TrustedMediaEvidenceRole,
  TrustedMediaOriginType,
} from "@/lib/trusted-media/trusted-media-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_BUCKET = "listing-evidence-private";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const TRUSTED_ENTITY_TYPES = new Set<TrustedMediaEntityType>([
  "property",
  "builder_project",
  "project_unit",
  "material",
  "rental",
  "service",
]);

const TRUSTED_EVIDENCE_ROLES = new Set<TrustedMediaEvidenceRole>([
  "property_overview",
  "project_overview",
  "project_entrance",
  "construction_progress",
  "project_surroundings",
  "unit_overview",
  "material_overview",
  "rental_asset_overview",
  "service_work_evidence",
  "service_tools_or_premises",
  "additional_live_capture",
  "gallery_media",
]);

type TrustedUploadContext = {
  sessionId: string;
  nonce: string;
  module: UniversalMediaModule;
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
  uploadMetadata?: Record<string, unknown>;
};

type CaptureSessionRow = {
  id: string;
  owner_user_id: string;
  business_id: string | null;
  listing_entity_type: TrustedMediaEntityType;
  listing_entity_id: string | null;
  draft_token: string | null;
  requested_lat: number | null;
  requested_lng: number | null;
  requested_accuracy_m: number | null;
  location_observed_at: string | null;
  integrity_status: string;
  completed_at: string | null;
  expires_at: string;
};

function errorResponse(
  message: string,
  status: number,
  code = "TRUSTED_UPLOAD_ERROR",
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function parseContext(
  value: FormDataEntryValue | null,
): TrustedUploadContext | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as TrustedUploadContext;
  } catch {
    return null;
  }
}

function safePathSegment(value: string): string {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return safe || "unknown";
}

function validateContext(
  context: TrustedUploadContext | null,
): asserts context is TrustedUploadContext {
  if (!context) {
    throw new Error("Trusted upload context is required.");
  }

  if (!context.sessionId?.trim() || !context.nonce?.trim()) {
    throw new Error("Trusted capture session credentials are required.");
  }

  if (!TRUSTED_ENTITY_TYPES.has(context.entityType)) {
    throw new Error("Trusted listing entity type is invalid.");
  }

  if (!TRUSTED_EVIDENCE_ROLES.has(context.evidenceRole)) {
    throw new Error("Trusted evidence role is invalid.");
  }

  if (!context.entityId && !context.draftToken) {
    throw new Error("A listing ID or draft token is required.");
  }

  if (!MEDIA_BUCKET_BY_MODULE[context.module]) {
    throw new Error("Trusted media module is invalid.");
  }

  const capturedAt = new Date(context.capturedAtClient);

  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("Client capture timestamp is invalid.");
  }

  const age = Date.now() - capturedAt.getTime();

  if (age > 15 * 60 * 1000 || age < -60_000) {
    throw new Error(
      "The captured image timestamp is outside the trusted upload window.",
    );
  }
}

async function recordAuditEvent(input: {
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  actorUserId: string;
  eventType: string;
  reasonCode?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();

  const { error } = await admin.from("listing_moderation_events").insert({
    listing_entity_type: input.entityType,
    listing_entity_id: input.entityId ?? null,
    draft_token: input.draftToken ?? null,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    reason_code: input.reasonCode ?? null,
    notes: input.notes ?? null,
    event_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("Trusted media audit event failed:", error);
  }
}

export async function POST(request: Request) {
  let authenticatedUserId = "";
  let context: TrustedUploadContext | null = null;

  let privateObjectPath = "";
  let publicObjectPath = "";
  let publicBucket = "";
  let registeredAssetId = "";

  try {
    const cookieStore = await cookies();

    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return errorResponse(
        "You must be signed in to upload trusted evidence.",
        401,
        "UNAUTHENTICATED",
      );
    }

    authenticatedUserId = user.id;

    const formData = await request.formData();

    const fileEntry = formData.get("file");

    context = parseContext(formData.get("context"));

    try {
      validateContext(context);
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : "Trusted upload context is invalid.",
        400,
        "INVALID_CONTEXT",
      );
    }

    if (!(fileEntry instanceof File)) {
      return errorResponse(
        "A trusted evidence image is required.",
        400,
        "FILE_REQUIRED",
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.has(fileEntry.type)) {
      return errorResponse(
        "Trusted evidence must be a JPEG, PNG or WebP image.",
        415,
        "UNSUPPORTED_MEDIA_TYPE",
      );
    }

    if (fileEntry.size <= 0 || fileEntry.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        "Trusted evidence must be smaller than 8 MB.",
        413,
        "FILE_SIZE_INVALID",
      );
    }

    const admin = getSupabaseAdmin();

    const { data: sessionData, error: sessionError } = await admin
      .from("trusted_capture_sessions")
      .select(
        [
          "id",
          "owner_user_id",
          "business_id",
          "listing_entity_type",
          "listing_entity_id",
          "draft_token",
          "requested_lat",
          "requested_lng",
          "requested_accuracy_m",
          "location_observed_at",
          "integrity_status",
          "completed_at",
          "expires_at",
        ].join(","),
      )
      .eq("id", context.sessionId)
      .eq("owner_user_id", user.id)
      .single();

    if (sessionError || !sessionData) {
      await recordAuditEvent({
        entityType: context.entityType,
        entityId: context.entityId,
        draftToken: context.draftToken,
        actorUserId: user.id,
        eventType: "trusted_upload_rejected",
        reasonCode: "capture_session_not_found",
      });

      return errorResponse(
        "Trusted capture session was not found.",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    const session = sessionData as unknown as CaptureSessionRow;

    if (session.completed_at) {
      return errorResponse(
        "Trusted capture session has already been used.",
        409,
        "SESSION_COMPLETED",
      );
    }

    const expiresAt = new Date(session.expires_at);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      await recordAuditEvent({
        entityType: context.entityType,
        entityId: context.entityId,
        draftToken: context.draftToken,
        actorUserId: user.id,
        eventType: "trusted_upload_rejected",
        reasonCode: "capture_session_expired",
      });

      return errorResponse(
        "Trusted capture session has expired. Start a new live capture.",
        410,
        "SESSION_EXPIRED",
      );
    }

    if (session.listing_entity_type !== context.entityType) {
      return errorResponse(
        "Capture session does not belong to this listing type.",
        409,
        "SESSION_ENTITY_MISMATCH",
      );
    }

    if (context.entityId && session.listing_entity_id !== context.entityId) {
      return errorResponse(
        "Capture session does not belong to this listing.",
        409,
        "SESSION_ENTITY_MISMATCH",
      );
    }

    if (context.draftToken && session.draft_token !== context.draftToken) {
      return errorResponse(
        "Capture session does not belong to this listing draft.",
        409,
        "SESSION_DRAFT_MISMATCH",
      );
    }

    if (
      session.requested_lat === null ||
      session.requested_lng === null ||
      session.requested_accuracy_m === null ||
      !session.location_observed_at
    ) {
      return errorResponse(
        "A fresh GPS observation is required before trusted evidence upload.",
        409,
        "GPS_REQUIRED",
      );
    }

    if (
      session.integrity_status !== "accepted" &&
      session.integrity_status !== "review_required"
    ) {
      return errorResponse(
        "Trusted capture session is not ready for upload.",
        409,
        "SESSION_NOT_READY",
      );
    }

    const originalBuffer = Buffer.from(await fileEntry.arrayBuffer());

    const sha256 = createHash("sha256").update(originalBuffer).digest("hex");

    const image = sharp(originalBuffer, {
      failOn: "error",
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return errorResponse(
        "The uploaded image dimensions could not be verified.",
        422,
        "IMAGE_INVALID",
      );
    }

    const derivativeBuffer = await sharp(originalBuffer, {
      failOn: "error",
    })
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 84,
        mozjpeg: true,
      })
      .toBuffer();

    publicBucket = MEDIA_BUCKET_BY_MODULE[context.module];

    const listingReference =
      context.entityId || context.draftToken || context.sessionId;

    const objectId = randomUUID();

    privateObjectPath = [
      user.id,
      safePathSegment(context.entityType),
      safePathSegment(listingReference),
      context.sessionId,
      `${objectId}-original`,
    ].join("/");

    publicObjectPath = [
      safePathSegment(context.entityType),
      safePathSegment(listingReference),
      safePathSegment(context.evidenceRole),
      `${objectId}.jpg`,
    ].join("/");

    await recordAuditEvent({
      entityType: context.entityType,
      entityId: context.entityId,
      draftToken: context.draftToken,
      actorUserId: user.id,
      eventType: "trusted_upload_started",
      metadata: {
        captureSessionId: context.sessionId,
        evidenceRole: context.evidenceRole,
        originalMimeType: fileEntry.type,
        originalByteSize: fileEntry.size,
      },
    });

    const { error: privateUploadError } = await admin.storage
      .from(PRIVATE_BUCKET)
      .upload(privateObjectPath, originalBuffer, {
        contentType: fileEntry.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (privateUploadError) {
      throw privateUploadError;
    }

    const { error: derivativeUploadError } = await admin.storage
      .from(publicBucket)
      .upload(publicObjectPath, derivativeBuffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });

    if (derivativeUploadError) {
      throw derivativeUploadError;
    }

    const capturedAtServer = new Date().toISOString();

    const { data: assetData, error: assetError } = await admin
      .from("listing_media_assets")
      .insert({
        owner_user_id: user.id,
        business_id: context.businessId ?? session.business_id,
        listing_entity_type: context.entityType,
        listing_entity_id: context.entityId ?? session.listing_entity_id,
        draft_token: context.draftToken ?? session.draft_token,
        bucket: PRIVATE_BUCKET,
        object_path: privateObjectPath,
        public_derivative_path: publicObjectPath,
        media_kind: "image",
        mime_type: fileEntry.type,
        byte_size: fileEntry.size,
        width: metadata.width,
        height: metadata.height,
        sha256,
        origin_type: context.originType ?? "trusted_web",
        evidence_role: context.evidenceRole,
        is_mandatory_evidence: context.isMandatoryEvidence ?? true,
        sort_order: Math.max(0, context.sortOrder ?? 0),
        capture_session_id: context.sessionId,
        captured_at_client: context.capturedAtClient,
        captured_at_server: capturedAtServer,
        gps_lat_private: session.requested_lat,
        gps_lng_private: session.requested_lng,
        gps_accuracy_m: session.requested_accuracy_m,
        gps_captured_at: session.location_observed_at,
        location_public_precision: "hidden",
        provenance_status:
          session.integrity_status === "review_required"
            ? "review_required"
            : "verified",
        lifecycle_status: "finalised",
      })
      .select(["id", "provenance_status", "lifecycle_status"].join(","))
      .single();

    if (assetError || !assetData) {
      throw assetError ?? new Error("Trusted media registration failed.");
    }

    const registeredAsset = assetData as unknown as {
      id: string;
      provenance_status: string;
      lifecycle_status: string;
    };

    registeredAssetId = registeredAsset.id;

    const completedSession = await completeTrustedCaptureSession({
      ownerUserId: user.id,
      sessionId: context.sessionId,
      nonce: context.nonce,
    });

    await recordAuditEvent({
      entityType: context.entityType,
      entityId: context.entityId,
      draftToken: context.draftToken,
      actorUserId: user.id,
      eventType: "trusted_upload_completed",
      metadata: {
        assetId: registeredAssetId,
        captureSessionId: context.sessionId,
        privateBucket: PRIVATE_BUCKET,
        privateObjectPath,
        publicBucket,
        publicObjectPath,
        sha256,
      },
    });

    const { data: urlData } = admin.storage
      .from(publicBucket)
      .getPublicUrl(publicObjectPath);

    const uploadedAsset = {
      id: registeredAssetId,
      url: urlData.publicUrl,
      bucket: publicBucket,
      path: publicObjectPath,
      name: fileEntry.name,
      size: fileEntry.size,
      mimeType: fileEntry.type,
      kind: "image",
      captureSource: "live_camera",
      captureTimestamp: context.capturedAtClient,
      evidenceCategory: "trusted_listing_media",
      evidencePurpose: context.evidenceRole,
      trustedMediaAssetId: registeredAssetId,
      captureSessionId: context.sessionId,
      privateEvidenceBucket: PRIVATE_BUCKET,
      privateEvidencePath: privateObjectPath,
      publicDerivativePath: publicObjectPath,
      provenanceStatus: registeredAsset.provenance_status,
      lifecycleStatus: registeredAsset.lifecycle_status,
      captureIntegrityStatus: completedSession.integrityStatus,
      ...context.uploadMetadata,
    } as UploadedMediaAsset;

    return NextResponse.json(
      {
        ok: true,
        asset: uploadedAsset,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const admin = getSupabaseAdmin();

    if (registeredAssetId) {
      await admin
        .from("listing_media_assets")
        .delete()
        .eq("id", registeredAssetId);
    }

    if (publicBucket && publicObjectPath) {
      await admin.storage.from(publicBucket).remove([publicObjectPath]);
    }

    if (privateObjectPath) {
      await admin.storage.from(PRIVATE_BUCKET).remove([privateObjectPath]);
    }

    if (context && authenticatedUserId) {
      await recordAuditEvent({
        entityType: context.entityType,
        entityId: context.entityId,
        draftToken: context.draftToken,
        actorUserId: authenticatedUserId,
        eventType: "trusted_upload_failed",
        reasonCode:
          error instanceof TrustedCaptureSessionError
            ? error.code
            : "upload_pipeline_error",
        notes:
          error instanceof Error
            ? error.message
            : "Unknown trusted upload error.",
      });
    }

    if (error instanceof TrustedCaptureSessionError) {
      return errorResponse(error.message, error.status, error.code);
    }

    console.error("Trusted media upload failed:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to upload trusted evidence.",
      500,
    );
  }
}
