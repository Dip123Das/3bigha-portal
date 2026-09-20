import { MEDIA_BUCKET_BY_MODULE } from "@/lib/media/media-config";
import {
  evaluateTrustedPublication,
  extractPersistedMediaAssets,
} from "@/lib/media/trusted-publication-server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  MobileTrustedMediaTarget,
  MobileTrustedMediaTargets,
} from "@/lib/mobile/contracts/v1";

type Row = Record<string, any>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value: unknown) => String(value ?? "").trim();

function assetCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export class MobileTrustedMediaTargetError extends Error {
  constructor(
    readonly code:
      | "TARGET_INVALID"
      | "TARGET_FORBIDDEN"
      | "TARGET_LOOKUP_FAILED"
      | "ASSET_INVALID"
      | "ASSET_FORBIDDEN"
      | "ASSET_REUSE_FORBIDDEN"
      | "ATTACHMENT_FAILED",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MobileTrustedMediaTargetError";
  }
}

function toTarget(
  unit: Row,
  project: Row,
): MobileTrustedMediaTarget {
  return {
    entityType: "project_unit",
    entityId: clean(unit.id),
    projectId: clean(project.id),
    projectName: clean(project.name) || "Untitled project",
    projectSlug: clean(project.slug),
    unitCode: clean(unit.unit_code) || null,
    title: clean(unit.title) || null,
    unitKind: clean(unit.unit_kind) || "unit",
    status: clean(unit.status) || "draft",
    trustStatus: clean(unit.trust_status) || "pending",
    existingAssetCount: assetCount(unit.trusted_media_json),
    requiredEvidenceRole: "unit_overview",
  };
}

export async function buildMobileTrustedMediaTargets(
  ownerUserId: string,
): Promise<MobileTrustedMediaTargets> {
  if (!UUID.test(ownerUserId)) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_INVALID",
      "A valid authenticated owner is required.",
      400,
    );
  }

  const admin = getSupabaseAdmin();

  const projectsResult = await admin
    .from("builder_projects")
    .select(
      "id,name,slug,builder_profile_id,builder_profiles!inner(owner_user_id)",
    )
    .eq("builder_profiles.owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (projectsResult.error) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_LOOKUP_FAILED",
      "Owned builder projects could not be loaded.",
      500,
    );
  }

  const projects = (projectsResult.data ?? []) as Row[];
  const projectIds = projects
    .map((project) => clean(project.id))
    .filter((id) => UUID.test(id));

  if (projectIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      targets: [],
    };
  }

  const unitsResult = await admin
    .from("builder_inventory_units")
    .select(
      [
        "id",
        "project_id",
        "unit_code",
        "title",
        "unit_kind",
        "status",
        "trust_status",
        "trusted_media_json",
        "updated_at",
      ].join(","),
    )
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  if (unitsResult.error) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_LOOKUP_FAILED",
      "Owned builder units could not be loaded.",
      500,
    );
  }

  const projectById = new Map(
    projects.map((project) => [clean(project.id), project]),
  );

  const targets = ((unitsResult.data ?? []) as Row[])
    .map((unit) => {
      const project = projectById.get(clean(unit.project_id));
      return project ? toTarget(unit, project) : null;
    })
    .filter(
      (target): target is MobileTrustedMediaTarget => target !== null,
    );

  return {
    generatedAt: new Date().toISOString(),
    targets,
  };
}

export async function requireOwnedProjectUnitTarget(
  ownerUserId: string,
  unitId: string,
): Promise<MobileTrustedMediaTarget> {
  if (!UUID.test(ownerUserId) || !UUID.test(unitId)) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_INVALID",
      "A valid project-unit capture target is required.",
      400,
    );
  }

  const admin = getSupabaseAdmin();

  const unitResult = await admin
    .from("builder_inventory_units")
    .select(
      "id,project_id,unit_code,title,unit_kind,status,trust_status,trusted_media_json",
    )
    .eq("id", unitId)
    .maybeSingle();

  if (unitResult.error) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_LOOKUP_FAILED",
      "The project unit could not be checked.",
      500,
    );
  }

  if (!unitResult.data) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_FORBIDDEN",
      "The project unit was not found or is not available to this account.",
      403,
    );
  }

  const projectResult = await admin
    .from("builder_projects")
    .select("id,name,slug,builder_profiles!inner(owner_user_id)")
    .eq("id", unitResult.data.project_id)
    .eq("builder_profiles.owner_user_id", ownerUserId)
    .maybeSingle();

  if (projectResult.error) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_LOOKUP_FAILED",
      "Project-unit ownership could not be checked.",
      500,
    );
  }

  if (!projectResult.data) {
    throw new MobileTrustedMediaTargetError(
      "TARGET_FORBIDDEN",
      "The project unit was not found or you do not own it.",
      403,
    );
  }

  return toTarget(
    unitResult.data as Row,
    projectResult.data as Row,
  );
}

function trustedAssetId(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  return clean(
    record.trustedMediaAssetId ??
      record.trusted_media_asset_id ??
      record.id,
  );
}

export async function attachTrustedMediaAssetToProjectUnit(
  ownerUserId: string,
  unitId: string,
  assetId: string,
  captureSessionId: string,
): Promise<MobileTrustedMediaTarget> {
  await requireOwnedProjectUnitTarget(ownerUserId, unitId);

  if (!UUID.test(assetId)) {
    throw new MobileTrustedMediaTargetError(
      "ASSET_INVALID",
      "A valid trusted-media asset is required.",
      400,
    );
  }

  const admin = getSupabaseAdmin();

  const [unitResult, assetResult] = await Promise.all([
    admin
      .from("builder_inventory_units")
      .select("id,trusted_media_json,updated_at")
      .eq("id", unitId)
      .maybeSingle(),
    admin
      .from("listing_media_assets")
      .select(
        [
          "id",
          "owner_user_id",
          "listing_entity_type",
          "listing_entity_id",
          "bucket",
          "public_derivative_path",
          "media_kind",
          "mime_type",
          "byte_size",
          "evidence_role",
          "capture_session_id",
          "captured_at_client",
          "provenance_status",
          "lifecycle_status",
          "deleted_at",
        ].join(","),
      )
      .eq("id", assetId)
      .eq("owner_user_id", ownerUserId)
      .eq("listing_entity_type", "project_unit")
      .eq("listing_entity_id", unitId)
      .eq("capture_session_id", captureSessionId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (unitResult.error || !unitResult.data) {
    throw new MobileTrustedMediaTargetError(
      "ATTACHMENT_FAILED",
      "The project unit could not be prepared for trusted media.",
      500,
    );
  }

  if (assetResult.error) {
    throw new MobileTrustedMediaTargetError(
      "ATTACHMENT_FAILED",
      "Trusted-media ownership could not be checked.",
      500,
    );
  }

  if (!assetResult.data) {
    throw new MobileTrustedMediaTargetError(
      "ASSET_FORBIDDEN",
      "The trusted photo was not found or does not belong to this unit.",
      403,
    );
  }

  const currentAssets = extractPersistedMediaAssets(
    unitResult.data.trusted_media_json,
  );

  if (
    currentAssets.some(
      (asset) => trustedAssetId(asset) === assetId,
    )
  ) {
    return requireOwnedProjectUnitTarget(ownerUserId, unitId);
  }

  const [camelReuse, snakeReuse] = await Promise.all([
    admin
      .from("builder_inventory_units")
      .select("id")
      .neq("id", unitId)
      .contains("trusted_media_json", [
        { trustedMediaAssetId: assetId },
      ])
      .limit(1),
    admin
      .from("builder_inventory_units")
      .select("id")
      .neq("id", unitId)
      .contains("trusted_media_json", [
        { trusted_media_asset_id: assetId },
      ])
      .limit(1),
  ]);

  if (camelReuse.error || snakeReuse.error) {
    throw new MobileTrustedMediaTargetError(
      "ATTACHMENT_FAILED",
      "Trusted-media reuse could not be checked.",
      500,
    );
  }

  if (
    (camelReuse.data ?? []).length > 0 ||
    (snakeReuse.data ?? []).length > 0
  ) {
    throw new MobileTrustedMediaTargetError(
      "ASSET_REUSE_FORBIDDEN",
      "Trusted evidence is already attached to another unit.",
      409,
    );
  }

  const asset = assetResult.data as Row;
  const publicBucket = MEDIA_BUCKET_BY_MODULE.property;
  const publicPath = clean(asset.public_derivative_path);
  const { data: publicUrlData } = admin.storage
    .from(publicBucket)
    .getPublicUrl(publicPath);

  const persistedAsset = {
    id: clean(asset.id),
    trustedMediaAssetId: clean(asset.id),
    url: publicUrlData.publicUrl,
    bucket: publicBucket,
    path: publicPath,
    name: `trusted-${clean(asset.id)}.jpg`,
    size: Number(asset.byte_size) || 0,
    mimeType: clean(asset.mime_type) || "image/jpeg",
    kind: "image",
    captureSource: "live_camera",
    captureTimestamp: clean(asset.captured_at_client),
    evidenceCategory: "trusted_listing_media",
    evidencePurpose: clean(asset.evidence_role) || "unit_overview",
    evidenceRole: clean(asset.evidence_role) || "unit_overview",
    captureSessionId: clean(asset.capture_session_id),
    provenanceStatus: clean(asset.provenance_status),
    lifecycleStatus: clean(asset.lifecycle_status),
  };

  const nextAssets = [...currentAssets, persistedAsset];
  const decision = await evaluateTrustedPublication(
    "property",
    nextAssets,
  );

  const trustStatus = decision.ok ? "verified" : "pending";
  const trustedPublication = {
    module: "property",
    listingKind: "builder_unit",
    requiredCaptures: decision.requiredCaptures,
    completedCaptures: decision.completedCaptures,
    gpsVerified: decision.gpsVerified === true,
    provenanceVerified: decision.provenanceVerified === true,
    captureSessionCompleted:
      decision.captureSessionCompleted === true,
    aiVerificationStatus:
      decision.aiVerificationStatus ?? "pending",
    serverVerified: true,
  };

  const updated = await admin
    .from("builder_inventory_units")
    .update({
      trusted_media_json: nextAssets,
      trusted_publication: trustedPublication,
      trust_status: trustStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId)
    .eq("updated_at", unitResult.data.updated_at)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    throw new MobileTrustedMediaTargetError(
      "ATTACHMENT_FAILED",
      "The unit changed while its trusted photo was being attached. Reload and try again.",
      409,
    );
  }

  return requireOwnedProjectUnitTarget(ownerUserId, unitId);
}
