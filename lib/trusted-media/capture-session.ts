import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import {
  getTrustedMediaEvidencePolicy,
} from "./evidence-policy";

import type {
  TrustedCaptureIntegrityStatus,
  TrustedCaptureSession,
  TrustedLocationObservation,
  TrustedMediaEntityType,
  TrustedMediaPlatform,
} from "./trusted-media-types";

const CAPTURE_SESSION_TTL_MINUTES = 15;
const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;

export type CreateTrustedCaptureSessionInput = {
  ownerUserId: string;
  businessId?: string | null;
  entityType: TrustedMediaEntityType;
  entityId?: string | null;
  draftToken?: string | null;
  platform: TrustedMediaPlatform;
  appVersion?: string | null;
  deviceSessionId?: string | null;
};

export type CreateTrustedCaptureSessionResult = {
  session: TrustedCaptureSession;
  nonce: string;
};

export type AttachTrustedCaptureLocationInput = {
  ownerUserId: string;
  sessionId: string;
  nonce: string;
  location: TrustedLocationObservation;
};

export type CompleteTrustedCaptureSessionInput = {
  ownerUserId: string;
  sessionId: string;
  nonce: string;
};

type TrustedCaptureSessionRow = {
  id: string;
  owner_user_id: string;
  business_id: string | null;
  listing_entity_type: TrustedMediaEntityType;
  listing_entity_id: string | null;
  draft_token: string | null;
  evidence_policy_key: string;
  nonce_hash: string;
  issued_at: string;
  expires_at: string;
  completed_at: string | null;
  client_platform: TrustedMediaPlatform | null;
  app_version: string | null;
  device_session_id: string | null;
  requested_lat: number | null;
  requested_lng: number | null;
  requested_accuracy_m: number | null;
  location_observed_at: string | null;
  integrity_status: TrustedCaptureIntegrityStatus;
  risk_flags: unknown;
};

export class TrustedCaptureSessionError extends Error {
  readonly code:
    | "INVALID_INPUT"
    | "SESSION_NOT_FOUND"
    | "SESSION_EXPIRED"
    | "SESSION_COMPLETED"
    | "INVALID_NONCE"
    | "LOCATION_INVALID"
    | "LOCATION_STALE"
    | "DATABASE_ERROR";

  readonly status: number;

  constructor(
    code: TrustedCaptureSessionError["code"],
    message: string,
    status: number
  ) {
    super(message);
    this.name = "TrustedCaptureSessionError";
    this.code = code;
    this.status = status;
  }
}

function hashNonce(nonce: string): string {
  return createHash("sha256")
    .update(nonce, "utf8")
    .digest("hex");
}

function createNonce(): string {
  return randomBytes(32).toString("base64url");
}

function parseRiskFlags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function rowToCaptureSession(
  row: TrustedCaptureSessionRow
): TrustedCaptureSession {
  const hasLocation =
    row.requested_lat !== null &&
    row.requested_lng !== null &&
    row.requested_accuracy_m !== null &&
    row.location_observed_at !== null;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    businessId: row.business_id,
    entityType: row.listing_entity_type,
    entityId: row.listing_entity_id,
    draftToken: row.draft_token,
    evidencePolicyKey: row.evidence_policy_key,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    platform: row.client_platform ?? "unknown",
    appVersion: row.app_version,
    deviceSessionId: row.device_session_id,
    integrityStatus: row.integrity_status,
    location: hasLocation
      ? {
          latitude: row.requested_lat as number,
          longitude: row.requested_lng as number,
          accuracyMetres:
            row.requested_accuracy_m as number,
          capturedAt:
            row.location_observed_at as string,
          provider: null,
          altitudeMetres: null,
        }
      : null,
    riskFlags: parseRiskFlags(row.risk_flags),
  };
}

function assertOwnerUserId(ownerUserId: string): void {
  if (!ownerUserId.trim()) {
    throw new TrustedCaptureSessionError(
      "INVALID_INPUT",
      "Authenticated user ID is required.",
      401
    );
  }
}

function assertEntityReference(
  entityId?: string | null,
  draftToken?: string | null
): void {
  if (!entityId && !draftToken) {
    throw new TrustedCaptureSessionError(
      "INVALID_INPUT",
      "Either an existing listing ID or a draft token is required.",
      400
    );
  }
}

function validateLocation(
  location: TrustedLocationObservation,
  now: Date
): string[] {
  const riskFlags: string[] = [];

  if (
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new TrustedCaptureSessionError(
      "LOCATION_INVALID",
      "Latitude must be between -90 and 90.",
      400
    );
  }

  if (
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new TrustedCaptureSessionError(
      "LOCATION_INVALID",
      "Longitude must be between -180 and 180.",
      400
    );
  }

  if (
    !Number.isFinite(location.accuracyMetres) ||
    location.accuracyMetres < 0
  ) {
    throw new TrustedCaptureSessionError(
      "LOCATION_INVALID",
      "Location accuracy must be a non-negative number.",
      400
    );
  }

  const capturedAt = new Date(location.capturedAt);

  if (Number.isNaN(capturedAt.getTime())) {
    throw new TrustedCaptureSessionError(
      "LOCATION_INVALID",
      "Location capture time is invalid.",
      400
    );
  }

  const locationAge =
    now.getTime() - capturedAt.getTime();

  if (
    locationAge > MAX_LOCATION_AGE_MS ||
    locationAge < -30_000
  ) {
    throw new TrustedCaptureSessionError(
      "LOCATION_STALE",
      "The location reading is not recent enough. Obtain a fresh GPS reading and try again.",
      400
    );
  }

  if (location.accuracyMetres > 100) {
    riskFlags.push("gps_accuracy_above_preferred");
  }

  if (location.accuracyMetres > 250) {
    riskFlags.push("gps_accuracy_review_required");
  }

  return riskFlags;
}

function verifyNonce(
  suppliedNonce: string,
  storedNonceHash: string
): boolean {
  if (!suppliedNonce || !storedNonceHash) {
    return false;
  }

  const suppliedHash = hashNonce(suppliedNonce);

  const suppliedBuffer = Buffer.from(
    suppliedHash,
    "utf8"
  );

  const storedBuffer = Buffer.from(
    storedNonceHash,
    "utf8"
  );

  if (suppliedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(
    suppliedBuffer,
    storedBuffer
  );
}

async function getOwnedSessionRow(
  ownerUserId: string,
  sessionId: string
): Promise<TrustedCaptureSessionRow> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("trusted_capture_sessions")
    .select(
      [
        "id",
        "owner_user_id",
        "business_id",
        "listing_entity_type",
        "listing_entity_id",
        "draft_token",
        "evidence_policy_key",
        "nonce_hash",
        "issued_at",
        "expires_at",
        "completed_at",
        "client_platform",
        "app_version",
        "device_session_id",
        "requested_lat",
        "requested_lng",
        "requested_accuracy_m",
        "location_observed_at",
        "integrity_status",
        "risk_flags",
      ].join(",")
    )
    .eq("id", sessionId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    throw new TrustedCaptureSessionError(
      "DATABASE_ERROR",
      error.message,
      500
    );
  }

  if (!data) {
    throw new TrustedCaptureSessionError(
      "SESSION_NOT_FOUND",
      "Trusted capture session was not found.",
      404
    );
  }

  return data as unknown as TrustedCaptureSessionRow;
}

function assertSessionUsable(
  row: TrustedCaptureSessionRow,
  nonce: string,
  now: Date
): void {
  if (!verifyNonce(nonce, row.nonce_hash)) {
    throw new TrustedCaptureSessionError(
      "INVALID_NONCE",
      "Trusted capture session token is invalid.",
      403
    );
  }

  if (row.completed_at) {
    throw new TrustedCaptureSessionError(
      "SESSION_COMPLETED",
      "Trusted capture session has already been completed.",
      409
    );
  }

  const expiresAt = new Date(row.expires_at);

  if (
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.getTime() <= now.getTime()
  ) {
    throw new TrustedCaptureSessionError(
      "SESSION_EXPIRED",
      "Trusted capture session has expired. Start a new live capture.",
      410
    );
  }
}

export async function createTrustedCaptureSession(
  input: CreateTrustedCaptureSessionInput
): Promise<CreateTrustedCaptureSessionResult> {
  assertOwnerUserId(input.ownerUserId);

  assertEntityReference(
    input.entityId,
    input.draftToken
  );

  const policy =
    getTrustedMediaEvidencePolicy(
      input.entityType
    );

  const nonce = createNonce();
  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      CAPTURE_SESSION_TTL_MINUTES * 60 * 1000
  );

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("trusted_capture_sessions")
    .insert({
      owner_user_id: input.ownerUserId,
      business_id: input.businessId ?? null,
      listing_entity_type: input.entityType,
      listing_entity_id: input.entityId ?? null,
      draft_token: input.draftToken ?? null,
      evidence_policy_key: policy.key,
      nonce_hash: hashNonce(nonce),
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      client_platform: input.platform,
      app_version: input.appVersion ?? null,
      device_session_id:
        input.deviceSessionId ?? null,
      integrity_status: "pending",
      risk_flags: [],
    })
    .select(
      [
        "id",
        "owner_user_id",
        "business_id",
        "listing_entity_type",
        "listing_entity_id",
        "draft_token",
        "evidence_policy_key",
        "nonce_hash",
        "issued_at",
        "expires_at",
        "completed_at",
        "client_platform",
        "app_version",
        "device_session_id",
        "requested_lat",
        "requested_lng",
        "requested_accuracy_m",
        "location_observed_at",
        "integrity_status",
        "risk_flags",
      ].join(",")
    )
    .single();

  if (error || !data) {
    throw new TrustedCaptureSessionError(
      "DATABASE_ERROR",
      error?.message ??
        "Unable to create trusted capture session.",
      500
    );
  }

  return {
    session: rowToCaptureSession(
      data as unknown as TrustedCaptureSessionRow
    ),
    nonce,
  };
}

export async function attachTrustedCaptureLocation(
  input: AttachTrustedCaptureLocationInput
): Promise<TrustedCaptureSession> {
  assertOwnerUserId(input.ownerUserId);

  const now = new Date();

  const row = await getOwnedSessionRow(
    input.ownerUserId,
    input.sessionId
  );

  assertSessionUsable(row, input.nonce, now);

  const riskFlags = Array.from(
    new Set([
      ...parseRiskFlags(row.risk_flags),
      ...validateLocation(input.location, now),
    ])
  );

  const integrityStatus:
    TrustedCaptureIntegrityStatus =
      riskFlags.includes(
        "gps_accuracy_review_required"
      )
        ? "review_required"
        : "accepted";

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("trusted_capture_sessions")
    .update({
      requested_lat: input.location.latitude,
      requested_lng: input.location.longitude,
      requested_accuracy_m:
        input.location.accuracyMetres,
      location_observed_at:
        input.location.capturedAt,
      integrity_status: integrityStatus,
      risk_flags: riskFlags,
    })
    .eq("id", row.id)
    .eq("owner_user_id", input.ownerUserId)
    .select(
      [
        "id",
        "owner_user_id",
        "business_id",
        "listing_entity_type",
        "listing_entity_id",
        "draft_token",
        "evidence_policy_key",
        "nonce_hash",
        "issued_at",
        "expires_at",
        "completed_at",
        "client_platform",
        "app_version",
        "device_session_id",
        "requested_lat",
        "requested_lng",
        "requested_accuracy_m",
        "location_observed_at",
        "integrity_status",
        "risk_flags",
      ].join(",")
    )
    .single();

  if (error || !data) {
    throw new TrustedCaptureSessionError(
      "DATABASE_ERROR",
      error?.message ??
        "Unable to attach location evidence.",
      500
    );
  }

  return rowToCaptureSession(
    data as unknown as TrustedCaptureSessionRow
  );
}

export async function completeTrustedCaptureSession(
  input: CompleteTrustedCaptureSessionInput
): Promise<TrustedCaptureSession> {
  assertOwnerUserId(input.ownerUserId);

  const now = new Date();

  const row = await getOwnedSessionRow(
    input.ownerUserId,
    input.sessionId
  );

  assertSessionUsable(row, input.nonce, now);

  if (
    row.requested_lat === null ||
    row.requested_lng === null ||
    row.requested_accuracy_m === null ||
    row.location_observed_at === null
  ) {
    throw new TrustedCaptureSessionError(
      "LOCATION_INVALID",
      "A trusted capture session cannot be completed without GPS evidence.",
      400
    );
  }

  if (
    row.integrity_status !== "accepted" &&
    row.integrity_status !==
      "review_required"
  ) {
    throw new TrustedCaptureSessionError(
      "INVALID_INPUT",
      "The trusted capture session is not ready for completion.",
      409
    );
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("trusted_capture_sessions")
    .update({
      completed_at: now.toISOString(),
    })
    .eq("id", row.id)
    .eq("owner_user_id", input.ownerUserId)
    .select(
      [
        "id",
        "owner_user_id",
        "business_id",
        "listing_entity_type",
        "listing_entity_id",
        "draft_token",
        "evidence_policy_key",
        "nonce_hash",
        "issued_at",
        "expires_at",
        "completed_at",
        "client_platform",
        "app_version",
        "device_session_id",
        "requested_lat",
        "requested_lng",
        "requested_accuracy_m",
        "location_observed_at",
        "integrity_status",
        "risk_flags",
      ].join(",")
    )
    .single();

  if (error || !data) {
    throw new TrustedCaptureSessionError(
      "DATABASE_ERROR",
      error?.message ??
        "Unable to complete trusted capture session.",
      500
    );
  }

  return rowToCaptureSession(
    data as unknown as TrustedCaptureSessionRow
  );
}
