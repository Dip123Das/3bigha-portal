import type {
  MobilePropertyLegalDocumentAccess,
  MobilePropertyLegalReviewDocument,
  MobilePropertyLegalReviewRequest,
  MobilePropertyLegalReviewStatus,
  MobilePropertyLegalReviewUnit,
  MobilePropertyLegalReviewWorkspace,
  MobilePropertyUnitStatus,
} from "@/lib/mobile/contracts/v1";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MOBILE_PROPERTY_LEGAL_CONSENT_VERSION =
  "property-legal-review-v1";

type LegalReviewErrorCode =
  | "UNIT_ID_INVALID"
  | "UNIT_NOT_FOUND"
  | "UNIT_NOT_AVAILABLE"
  | "SELF_REVIEW_FORBIDDEN"
  | "PURPOSE_INVALID"
  | "CONSENT_REQUIRED"
  | "CONSENT_VERSION_INVALID"
  | "REQUEST_ALREADY_ACTIVE"
  | "REQUEST_LOOKUP_FAILED"
  | "REQUEST_CREATE_FAILED"
  | "AUDIT_WRITE_FAILED"
  | "DOCUMENT_LOOKUP_FAILED"
  | "REQUEST_ID_INVALID"
  | "REQUEST_NOT_FOUND"
  | "OWNER_REQUIRED"
  | "DECISION_INVALID"
  | "DECISION_NOTE_INVALID"
  | "DECISION_CONFLICT"
  | "DOCUMENT_ID_INVALID"
  | "DOCUMENT_NOT_FOUND"
  | "ACCESS_FORBIDDEN"
  | "SIGNED_ACCESS_FAILED";

type Row = Record<string, any>;

type UnitContext = {
  unit: Row;
  project: Row;
  ownerUserId: string;
};

export class MobilePropertyLegalReviewError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: LegalReviewErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MobilePropertyLegalReviewError";
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function nullableText(value: unknown) {
  const text = clean(value);
  return text || null;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean).slice(0, 100)
    : [];
}

function publicUnitStatus(value: unknown): MobilePropertyUnitStatus {
  const status = clean(value).toLowerCase();
  if (status === "reserved") return "hold";
  if (
    status === "available" ||
    status === "hold" ||
    status === "booked" ||
    status === "sold" ||
    status === "blocked"
  ) {
    return status;
  }
  return "blocked";
}

function ownerId(project: Row) {
  const relation = project.builder_profiles;
  const profile = Array.isArray(relation) ? relation[0] : relation;
  return clean(profile?.owner_user_id);
}

function mapUnit(context: UnitContext): MobilePropertyLegalReviewUnit {
  return {
    id: clean(context.unit.id),
    projectId: clean(context.unit.project_id),
    projectName: clean(context.project.name),
    projectSlug: clean(context.project.slug),
    unitCode: nullableText(context.unit.unit_code),
    title: nullableText(context.unit.title),
    unitKind: clean(context.unit.unit_kind) || "property_unit",
    status: publicUnitStatus(context.unit.status),
    trustStatus: "verified",
  };
}

function mapRequest(row: Row): MobilePropertyLegalReviewRequest {
  return {
    id: clean(row.id),
    projectId: clean(row.project_id),
    unitId: clean(row.unit_id),
    status: clean(row.status) as MobilePropertyLegalReviewStatus,
    purpose: clean(row.purpose),
    consentVersion: clean(row.consent_version),
    buyerConsentAt: clean(row.buyer_consent_at),
    requestedAt: clean(row.requested_at),
    decidedAt: nullableText(row.decided_at),
    expiresAt: nullableText(row.expires_at),
    revokedAt: nullableText(row.revoked_at),
    decisionNote: nullableText(row.decision_note),
  };
}

function mapDocument(row: Row): MobilePropertyLegalReviewDocument {
  return {
    id: clean(row.id),
    documentType: clean(row.document_type),
    title: clean(row.title),
    originalFilename: nullableText(row.original_filename),
    mimeType: nullableText(row.mime_type),
    fileSizeBytes:
      Number.isFinite(Number(row.file_size_bytes))
        ? Number(row.file_size_bytes)
        : null,
    analysisStatus: nullableText(row.analysis_status),
    analysisConfidence:
      Number.isFinite(Number(row.analysis_confidence))
        ? Number(row.analysis_confidence)
        : null,
    summary: nullableText(row.ai_summary),
    warnings: stringList(row.ai_warnings),
    createdAt: clean(row.created_at),
  };
}

async function loadUnitContext(
  unitId: string,
  requireAvailable: boolean,
): Promise<UnitContext> {
  if (!UUID.test(unitId)) {
    throw new MobilePropertyLegalReviewError(
      400,
      "UNIT_ID_INVALID",
      "Choose a valid property unit.",
    );
  }

  const admin = getSupabaseAdmin();
  const unitResult = await admin
    .from("builder_inventory_units")
    .select(
      "id,project_id,unit_code,title,unit_kind,status,trust_status",
    )
    .eq("id", unitId)
    .eq("trust_status", "verified")
    .maybeSingle();

  if (unitResult.error || !unitResult.data) {
    throw new MobilePropertyLegalReviewError(
      404,
      "UNIT_NOT_FOUND",
      "The verified property unit was not found.",
    );
  }

  if (
    requireAvailable &&
    publicUnitStatus(unitResult.data.status) !== "available"
  ) {
    throw new MobilePropertyLegalReviewError(
      409,
      "UNIT_NOT_AVAILABLE",
      "Legal review can be requested only while this unit is available.",
    );
  }

  const projectResult = await admin
    .from("builder_projects")
    .select(
      "id,name,slug,status,is_active,builder_profiles!inner(owner_user_id)",
    )
    .eq("id", unitResult.data.project_id)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  const projectOwnerId = ownerId(projectResult.data ?? {});
  if (projectResult.error || !projectResult.data || !projectOwnerId) {
    throw new MobilePropertyLegalReviewError(
      404,
      "UNIT_NOT_FOUND",
      "The active property project was not found.",
    );
  }

  return {
    unit: unitResult.data,
    project: projectResult.data,
    ownerUserId: projectOwnerId,
  };
}

async function writeAuditEvent(input: {
  requestId: string;
  unitId: string;
  projectId: string;
  actorUserId: string;
  eventKind:
    | "requested"
    | "granted"
    | "declined"
    | "revoked"
    | "expired"
    | "document_viewed";
  documentId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  const result = await admin
    .from("property_legal_review_access_events")
    .insert({
      request_id: input.requestId,
      unit_id: input.unitId,
      project_id: input.projectId,
      document_id: input.documentId ?? null,
      actor_user_id: input.actorUserId,
      event_kind: input.eventKind,
      metadata: input.metadata ?? {},
    });

  if (result.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "AUDIT_WRITE_FAILED",
      "The confidential legal-review audit event could not be recorded.",
    );
  }
}

async function expireGrantedRequest(row: Row) {
  if (
    clean(row.status) !== "granted" ||
    !row.expires_at ||
    Date.parse(clean(row.expires_at)) > Date.now()
  ) {
    return row;
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const result = await admin
    .from("property_unit_legal_review_requests")
    .update({
      status: "expired",
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "granted")
    .select("*")
    .maybeSingle();

  if (result.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "The legal-review expiry could not be reconciled.",
    );
  }

  if (result.data) {
    await writeAuditEvent({
      requestId: clean(result.data.id),
      unitId: clean(result.data.unit_id),
      projectId: clean(result.data.project_id),
      actorUserId: clean(result.data.owner_user_id),
      eventKind: "expired",
      metadata: { expiredAt: now, source: "mobile_workspace_read" },
    });
    return result.data;
  }

  const refreshed = await admin
    .from("property_unit_legal_review_requests")
    .select("*")
    .eq("id", row.id)
    .maybeSingle();

  if (refreshed.error || !refreshed.data) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "The legal-review request could not be refreshed.",
    );
  }

  return refreshed.data;
}

async function loadRequest(
  userId: string,
  context: UnitContext,
  requestId?: string,
) {
  const admin = getSupabaseAdmin();
  const actorIsOwner = userId === context.ownerUserId;

  let query = admin
    .from("property_unit_legal_review_requests")
    .select("*")
    .eq("unit_id", context.unit.id)
    .eq("project_id", context.unit.project_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (requestId) {
    if (!UUID.test(requestId)) {
      throw new MobilePropertyLegalReviewError(
        400,
        "REQUEST_LOOKUP_FAILED",
        "Choose a valid legal-review request.",
      );
    }
    query = query.eq("id", requestId);
  }

  query = actorIsOwner
    ? query.eq("owner_user_id", userId)
    : query.eq("buyer_user_id", userId);

  const result = await query.maybeSingle();
  if (result.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "The legal-review request could not be loaded.",
    );
  }

  return result.data ? expireGrantedRequest(result.data) : null;
}

async function loadVisibleDocuments(
  context: UnitContext,
  request: Row | null,
  actorIsOwner: boolean,
) {
  const buyerMayView =
    request &&
    clean(request.status) === "granted" &&
    request.expires_at &&
    Date.parse(clean(request.expires_at)) > Date.now();

  if (!actorIsOwner && !buyerMayView) {
    return [];
  }

  const admin = getSupabaseAdmin();
  const linksResult = await admin
    .from("property_unit_legal_document_links")
    .select("document_id")
    .eq("unit_id", context.unit.id)
    .eq("project_id", context.unit.project_id);

  if (linksResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "DOCUMENT_LOOKUP_FAILED",
      "The unit legal-paper links could not be loaded.",
    );
  }

  const documentIds = [
    ...new Set(
      (linksResult.data ?? [])
        .map((row: Row) => clean(row.document_id))
        .filter(Boolean),
    ),
  ];

  if (!documentIds.length) return [];

  const documentsResult = await admin
    .from("property_project_legal_documents")
    .select(
      "id,document_type,title,original_filename,mime_type,file_size_bytes,analysis_status,analysis_confidence,ai_summary,ai_warnings,created_at",
    )
    .eq("project_id", context.unit.project_id)
    .eq("owner_user_id", context.ownerUserId)
    .is("superseded_at", null)
    .in("id", documentIds)
    .order("created_at", { ascending: false });

  if (documentsResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "DOCUMENT_LOOKUP_FAILED",
      "The confidential legal-paper metadata could not be loaded.",
    );
  }

  return (documentsResult.data ?? []).map(mapDocument);
}

export async function buildMobilePropertyLegalReviewWorkspace(input: {
  userId: string;
  unitId: string;
  requestId?: string;
}): Promise<MobilePropertyLegalReviewWorkspace> {
  const userId = clean(input.userId);
  const context = await loadUnitContext(clean(input.unitId), false);
  const actorIsOwner = userId === context.ownerUserId;
  const request = await loadRequest(
    userId,
    context,
    nullableText(input.requestId) ?? undefined,
  );
  const documents = await loadVisibleDocuments(
    context,
    request,
    actorIsOwner,
  );
  const grantedAndCurrent =
    request &&
    clean(request.status) === "granted" &&
    request.expires_at &&
    Date.parse(clean(request.expires_at)) > Date.now();

  return {
    generatedAt: new Date().toISOString(),
    unit: mapUnit(context),
    request: request ? mapRequest(request) : null,
    documents,
    permissions: {
      actor: actorIsOwner ? "owner" : "buyer",
      canRequestReview:
        !actorIsOwner &&
        publicUnitStatus(context.unit.status) === "available" &&
        (!request ||
          !["requested", "granted"].includes(clean(request.status))),
      canDecideReview:
        actorIsOwner && clean(request?.status) === "requested",
      canRevokeReview:
        actorIsOwner && clean(request?.status) === "granted",
      canViewDocuments: actorIsOwner || Boolean(grantedAndCurrent),
    },
    policy: {
      consentVersion: MOBILE_PROPERTY_LEGAL_CONSENT_VERSION,
      accessExpires: true,
      documentViewsAreAudited: true,
      signedAccessIsShortLived: true,
    },
  };
}

export async function requestMobilePropertyLegalReview(input: {
  buyerUserId: string;
  unitId: string;
  purpose: string;
  consentVersion: string;
  consentAccepted: boolean;
}): Promise<MobilePropertyLegalReviewWorkspace> {
  const buyerUserId = clean(input.buyerUserId);
  const context = await loadUnitContext(clean(input.unitId), true);

  if (buyerUserId === context.ownerUserId) {
    throw new MobilePropertyLegalReviewError(
      403,
      "SELF_REVIEW_FORBIDDEN",
      "A project owner cannot request buyer access to their own papers.",
    );
  }

  const purpose = clean(input.purpose);
  if (purpose.length < 10 || purpose.length > 500) {
    throw new MobilePropertyLegalReviewError(
      400,
      "PURPOSE_INVALID",
      "Explain your purchase-review purpose in 10 to 500 characters.",
    );
  }

  if (input.consentAccepted !== true) {
    throw new MobilePropertyLegalReviewError(
      400,
      "CONSENT_REQUIRED",
      "Confirm the confidential-document review consent.",
    );
  }

  if (
    clean(input.consentVersion) !==
    MOBILE_PROPERTY_LEGAL_CONSENT_VERSION
  ) {
    throw new MobilePropertyLegalReviewError(
      409,
      "CONSENT_VERSION_INVALID",
      "Refresh this screen and review the current consent notice.",
    );
  }

  const admin = getSupabaseAdmin();
  const activeResult = await admin
    .from("property_unit_legal_review_requests")
    .select("id")
    .eq("unit_id", context.unit.id)
    .eq("buyer_user_id", buyerUserId)
    .in("status", ["requested", "granted"])
    .limit(1)
    .maybeSingle();

  if (activeResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "Existing legal-review access could not be checked.",
    );
  }

  if (activeResult.data) {
    throw new MobilePropertyLegalReviewError(
      409,
      "REQUEST_ALREADY_ACTIVE",
      "You already have an active legal-review request for this unit.",
    );
  }

  const now = new Date().toISOString();
  const inserted = await admin
    .from("property_unit_legal_review_requests")
    .insert({
      unit_id: context.unit.id,
      project_id: context.unit.project_id,
      buyer_user_id: buyerUserId,
      owner_user_id: context.ownerUserId,
      status: "requested",
      purpose,
      consent_version: MOBILE_PROPERTY_LEGAL_CONSENT_VERSION,
      buyer_consent_at: now,
      requested_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    if (inserted.error?.code === "23505") {
      throw new MobilePropertyLegalReviewError(
        409,
        "REQUEST_ALREADY_ACTIVE",
        "You already have an active legal-review request for this unit.",
      );
    }
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_CREATE_FAILED",
      "The confidential legal-review request could not be created.",
    );
  }

  try {
    await writeAuditEvent({
      requestId: clean(inserted.data.id),
      unitId: clean(inserted.data.unit_id),
      projectId: clean(inserted.data.project_id),
      actorUserId: buyerUserId,
      eventKind: "requested",
      metadata: {
        consentVersion: MOBILE_PROPERTY_LEGAL_CONSENT_VERSION,
        buyerConsentAt: now,
      },
    });
  } catch (error) {
    await admin
      .from("property_unit_legal_review_requests")
      .delete()
      .eq("id", inserted.data.id)
      .eq("status", "requested");
    throw error;
  }

  return buildMobilePropertyLegalReviewWorkspace({
    userId: buyerUserId,
    unitId: clean(context.unit.id),
    requestId: clean(inserted.data.id),
  });
}
export async function decideMobilePropertyLegalReview(input: {
  ownerUserId: string;
  requestId: string;
  decision: "granted" | "declined" | "revoked";
  decisionNote?: string | null;
}): Promise<MobilePropertyLegalReviewWorkspace> {
  const ownerUserId = clean(input.ownerUserId);
  const requestId = clean(input.requestId);
  const decision = clean(input.decision);
  const decisionNote = nullableText(input.decisionNote);

  if (!UUID.test(requestId)) {
    throw new MobilePropertyLegalReviewError(
      400,
      "REQUEST_ID_INVALID",
      "Choose a valid legal-review request.",
    );
  }

  if (
    decision !== "granted" &&
    decision !== "declined" &&
    decision !== "revoked"
  ) {
    throw new MobilePropertyLegalReviewError(
      400,
      "DECISION_INVALID",
      "Choose grant, decline or revoke.",
    );
  }

  if (decisionNote && decisionNote.length > 500) {
    throw new MobilePropertyLegalReviewError(
      400,
      "DECISION_NOTE_INVALID",
      "Keep the decision note within 500 characters.",
    );
  }

  const admin = getSupabaseAdmin();
  const requestResult = await admin
    .from("property_unit_legal_review_requests")
    .select("*")
    .eq("id", requestId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (requestResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "The legal-review request could not be loaded.",
    );
  }

  if (!requestResult.data) {
    throw new MobilePropertyLegalReviewError(
      404,
      "REQUEST_NOT_FOUND",
      "The legal-review request was not found.",
    );
  }

  const current = await expireGrantedRequest(requestResult.data);
  const context = await loadUnitContext(clean(current.unit_id), false);

  if (
    context.ownerUserId !== ownerUserId ||
    clean(current.project_id) !== clean(context.unit.project_id)
  ) {
    throw new MobilePropertyLegalReviewError(
      403,
      "OWNER_REQUIRED",
      "Only the verified project owner can decide this request.",
    );
  }

  const expectedStatus =
    decision === "revoked" ? "granted" : "requested";

  if (clean(current.status) !== expectedStatus) {
    throw new MobilePropertyLegalReviewError(
      409,
      "DECISION_CONFLICT",
      decision === "revoked"
        ? "Only a current grant can be revoked."
        : "This request has already been decided.",
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt =
    decision === "granted"
      ? new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
      : null;

  const changes =
    decision === "revoked"
      ? {
          status: "revoked",
          revoked_at: nowIso,
          revoked_by: ownerUserId,
          decision_note: decisionNote ?? current.decision_note ?? null,
          updated_at: nowIso,
        }
      : {
          status: decision,
          decided_at: nowIso,
          decided_by: ownerUserId,
          decision_note: decisionNote,
          expires_at: expiresAt,
          revoked_at: null,
          revoked_by: null,
          updated_at: nowIso,
        };

  const updated = await admin
    .from("property_unit_legal_review_requests")
    .update(changes)
    .eq("id", requestId)
    .eq("owner_user_id", ownerUserId)
    .eq("status", expectedStatus)
    .select("*")
    .maybeSingle();

  if (updated.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "DECISION_CONFLICT",
      "The legal-review decision could not be saved.",
    );
  }

  if (!updated.data) {
    throw new MobilePropertyLegalReviewError(
      409,
      "DECISION_CONFLICT",
      "The legal-review request changed before this decision was saved.",
    );
  }

  try {
    await writeAuditEvent({
      requestId,
      unitId: clean(updated.data.unit_id),
      projectId: clean(updated.data.project_id),
      actorUserId: ownerUserId,
      eventKind: decision,
      metadata: {
        decisionNote,
        expiresAt,
      },
    });
  } catch (error) {
    const rollback =
      decision === "revoked"
        ? {
            status: "granted",
            revoked_at: null,
            revoked_by: null,
            decision_note: current.decision_note ?? null,
            updated_at: new Date().toISOString(),
          }
        : {
            status: "requested",
            decided_at: null,
            decided_by: null,
            decision_note: null,
            expires_at: null,
            revoked_at: null,
            revoked_by: null,
            updated_at: new Date().toISOString(),
          };

    await admin
      .from("property_unit_legal_review_requests")
      .update(rollback)
      .eq("id", requestId)
      .eq("status", decision);

    throw error;
  }

  return buildMobilePropertyLegalReviewWorkspace({
    userId: ownerUserId,
    unitId: clean(updated.data.unit_id),
    requestId,
  });
}
export async function createMobilePropertyLegalDocumentAccess(input: {
  buyerUserId: string;
  requestId: string;
  documentId: string;
}): Promise<MobilePropertyLegalDocumentAccess> {
  const buyerUserId = clean(input.buyerUserId);
  const requestId = clean(input.requestId);
  const documentId = clean(input.documentId);

  if (!UUID.test(requestId)) {
    throw new MobilePropertyLegalReviewError(
      400,
      "REQUEST_ID_INVALID",
      "Choose a valid legal-review request.",
    );
  }

  if (!UUID.test(documentId)) {
    throw new MobilePropertyLegalReviewError(
      400,
      "DOCUMENT_ID_INVALID",
      "Choose a valid legal paper.",
    );
  }

  const admin = getSupabaseAdmin();
  const requestResult = await admin
    .from("property_unit_legal_review_requests")
    .select("*")
    .eq("id", requestId)
    .eq("buyer_user_id", buyerUserId)
    .maybeSingle();

  if (requestResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "REQUEST_LOOKUP_FAILED",
      "The confidential legal-review grant could not be checked.",
    );
  }

  if (!requestResult.data) {
    throw new MobilePropertyLegalReviewError(
      403,
      "ACCESS_FORBIDDEN",
      "This legal-review grant does not belong to your account.",
    );
  }

  const request = await expireGrantedRequest(requestResult.data);
  const expiresAtMs = Date.parse(clean(request.expires_at));

  if (
    clean(request.status) !== "granted" ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now()
  ) {
    throw new MobilePropertyLegalReviewError(
      403,
      "ACCESS_FORBIDDEN",
      "The legal-review grant is not active.",
    );
  }

  const context = await loadUnitContext(clean(request.unit_id), false);
  if (
    context.ownerUserId !== clean(request.owner_user_id) ||
    clean(context.unit.project_id) !== clean(request.project_id) ||
    buyerUserId === context.ownerUserId
  ) {
    throw new MobilePropertyLegalReviewError(
      403,
      "ACCESS_FORBIDDEN",
      "The legal-review ownership boundary could not be verified.",
    );
  }

  const linkResult = await admin
    .from("property_unit_legal_document_links")
    .select("document_id")
    .eq("unit_id", request.unit_id)
    .eq("project_id", request.project_id)
    .eq("document_id", documentId)
    .maybeSingle();

  if (linkResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "DOCUMENT_LOOKUP_FAILED",
      "The unit legal-paper link could not be checked.",
    );
  }

  if (!linkResult.data) {
    throw new MobilePropertyLegalReviewError(
      404,
      "DOCUMENT_NOT_FOUND",
      "The legal paper is not attached to this unit.",
    );
  }

  const documentResult = await admin
    .from("property_project_legal_documents")
    .select(
      "id,project_id,owner_user_id,storage_bucket,storage_path,superseded_at",
    )
    .eq("id", documentId)
    .eq("project_id", request.project_id)
    .eq("owner_user_id", request.owner_user_id)
    .is("superseded_at", null)
    .maybeSingle();

  if (documentResult.error) {
    throw new MobilePropertyLegalReviewError(
      500,
      "DOCUMENT_LOOKUP_FAILED",
      "The confidential legal paper could not be checked.",
    );
  }

  if (
    !documentResult.data ||
    clean(documentResult.data.storage_bucket) !==
      "property-documents-private" ||
    !clean(documentResult.data.storage_path)
  ) {
    throw new MobilePropertyLegalReviewError(
      404,
      "DOCUMENT_NOT_FOUND",
      "The confidential legal paper was not found.",
    );
  }

  const signed = await admin.storage
    .from("property-documents-private")
    .createSignedUrl(clean(documentResult.data.storage_path), 60);

  if (signed.error || !signed.data?.signedUrl) {
    throw new MobilePropertyLegalReviewError(
      500,
      "SIGNED_ACCESS_FAILED",
      "Temporary legal-paper access could not be created.",
    );
  }

  const accessExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  await writeAuditEvent({
    requestId,
    unitId: clean(request.unit_id),
    projectId: clean(request.project_id),
    documentId,
    actorUserId: buyerUserId,
    eventKind: "document_viewed",
    metadata: {
      accessExpiresAt,
      signedUrlTtlSeconds: 60,
    },
  });

  return {
    documentId,
    expiresAt: accessExpiresAt,
    accessUrl: signed.data.signedUrl,
  };
}
