import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { evaluateTrustedPublication, extractPersistedMediaAssets } from "@/lib/media/trusted-publication-server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown) => String(value ?? "").trim();
const fail = (message: string, status: number, code: string) => NextResponse.json({ ok: false, error: { code, message } }, { status });

async function ownerContext(unitId: string) {
  const session = getSupabaseServerClient(await cookies());
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user?.id) return { response: fail("Authentication required.", 401, "UNAUTHORIZED") };
  if (!UUID.test(unitId)) return { response: fail("Invalid unit ID.", 400, "UNIT_ID_INVALID") };
  const admin = getSupabaseAdmin();
  const unit = await admin.from("builder_inventory_units")
    .select("id,project_id,catalog_id,unit_code,title,unit_kind,tower,block,floor_no,unit_no,facing,status,property_type_id,property_subtype_id,plot_area_sqft,built_up_sqft,carpet_sqft,super_built_up_sqft,dimension_length_ft,dimension_width_ft,boundary_north,boundary_south,boundary_east,boundary_west,availability_note,trusted_media_json,trusted_publication,trust_status,updated_at")
    .eq("id", unitId).maybeSingle();
  if (unit.error || !unit.data) return { response: fail("Unit not found.", 404, "UNIT_NOT_FOUND") };
  const project = await admin.from("builder_projects")
    .select("id,name,slug,builder_profiles!inner(owner_user_id)")
    .eq("id", unit.data.project_id).eq("builder_profiles.owner_user_id", user.id).maybeSingle();
  if (project.error || !project.data) return { response: fail("Unit not found or you do not own it.", 403, "UNIT_FORBIDDEN") };
  return { admin, user, unit: { ...unit.data, builder_project: project.data } };
}

export async function GET(_request: NextRequest, context: { params: { unitId: string } }) {
  try {
    const owned = await ownerContext(clean(context.params.unitId));
    if (owned.response) return owned.response;
    const { admin, unit } = owned;
    const [pricing, selectedAmenities, amenities, types, subtypes] = await Promise.all([
      admin.from("builder_inventory_pricing").select("price_total,pricing_kind").eq("unit_id", unit.id).maybeSingle(),
      admin.from("builder_inventory_unit_amenities").select("amenity_id").eq("unit_id", unit.id),
      admin.from("amenities_master").select("id,name,slug,category,sort_order").eq("is_active", true).order("category").order("sort_order"),
      admin.from("property_types").select("id,name,slug").eq("is_active", true).order("name"),
      admin.from("property_subtypes").select("id,type_id,name,slug").eq("is_active", true).order("name"),
    ]);
    const lookupError = pricing.error || selectedAmenities.error || amenities.error || types.error || subtypes.error;
    if (lookupError) return fail("Unit completion data could not be loaded.", 500, "UNIT_COMPLETION_LOOKUP_FAILED");
    return NextResponse.json({ ok: true, data: {
      unit,
      pricing: pricing.data ?? null,
      selectedAmenityIds: (selectedAmenities.data ?? []).map((row) => row.amenity_id),
      amenities: amenities.data ?? [], propertyTypes: types.data ?? [], propertySubtypes: subtypes.data ?? [],
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("Unit completion data could not be loaded.", 500, "UNIT_COMPLETION_FAILED");
  }
}

function positiveOrNull(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than zero.`);
  return parsed;
}

export async function PATCH(request: NextRequest, context: { params: { unitId: string } }) {
  try {
    const unitId = clean(context.params.unitId);
    const owned = await ownerContext(unitId);
    if (owned.response) return owned.response;
    const { admin, user } = owned;
    const body = await request.json().catch(() => null);
    const mode = clean(body?.mode).toLowerCase() === "verify" ? "verify" : "draft";
    const unit = body?.unit && typeof body.unit === "object" ? body.unit : {};
    const unitCode = clean(unit.unitCode);
    if (!unitCode || unitCode.length > 120) return fail("A valid unit code is required.", 400, "UNIT_CODE_INVALID");

    const amenityIds = Array.isArray(body?.amenityIds)
      ? [...new Set(body.amenityIds.map(clean).filter((id: string) => UUID.test(id)))]
      : [];
    for (const [key, label] of [["priceTotal", "Price"], ["plotAreaSqft", "Plot area"], ["builtUpSqft", "Built-up area"], ["carpetSqft", "Carpet area"], ["superBuiltUpSqft", "Super built-up area"], ["dimensionLengthFt", "Length"], ["dimensionWidthFt", "Width"]] as const) {
      unit[key] = positiveOrNull(unit[key], label);
    }
    if (unit.floorNo !== null && unit.floorNo !== undefined && unit.floorNo !== "") {
      const floor = Number(unit.floorNo);
      if (!Number.isInteger(floor) || floor < 0) return fail("Floor must be zero or a positive whole number.", 400, "FLOOR_INVALID");
      unit.floorNo = floor;
    } else unit.floorNo = null;

    const assets = extractPersistedMediaAssets(unit.trustedMediaJson);
    unit.trustStatus = "pending";
    unit.trustedMediaJson = assets;
    unit.trustedPublication = { module: "property", listingKind: "builder_unit", requiredCaptures: 1, completedCaptures: 0, serverVerified: true };
    if (assets.length) {
      const assetIds = [...new Set(assets.map((asset) => clean(asset.trustedMediaAssetId ?? asset.trusted_media_asset_id)).filter(Boolean))];
      if (assetIds.length !== assets.length) return fail("Every Trusted Media item requires its canonical asset ID.", 400, "MEDIA_REFERENCE_INVALID");
      const ownedAssets = await admin.from("listing_media_assets").select("id").in("id", assetIds).eq("owner_user_id", user.id).is("deleted_at", null);
      if (ownedAssets.error || (ownedAssets.data ?? []).length !== assetIds.length) return fail("Trusted media ownership could not be verified.", 403, "MEDIA_OWNERSHIP_INVALID");
      for (const assetId of assetIds) {
        const [camelReference, snakeReference] = await Promise.all([
          admin.from("builder_inventory_units").select("id").neq("id", unitId)
            .contains("trusted_media_json", [{ trustedMediaAssetId: assetId }]).limit(1),
          admin.from("builder_inventory_units").select("id").neq("id", unitId)
            .contains("trusted_media_json", [{ trusted_media_asset_id: assetId }]).limit(1),
        ]);
        if (camelReference.error || snakeReference.error) return fail("Trusted media reuse could not be checked.", 500, "MEDIA_REUSE_CHECK_FAILED");
        if ((camelReference.data ?? []).length || (snakeReference.data ?? []).length) {
          return fail("Trusted evidence is already linked to another unit and cannot be reused.", 409, "UNIT_MEDIA_REUSE_FORBIDDEN");
        }
      }
      const decision = await evaluateTrustedPublication("property", assets);
      if (decision.ok) {
        unit.trustStatus = "verified";
        unit.trustedPublication = { module: "property", listingKind: "builder_unit", requiredCaptures: decision.requiredCaptures, completedCaptures: decision.completedCaptures, gpsVerified: decision.gpsVerified === true, provenanceVerified: decision.provenanceVerified === true, captureSessionCompleted: decision.captureSessionCompleted === true, aiVerificationStatus: decision.aiVerificationStatus ?? "pending", serverVerified: true };
      } else if (mode === "verify") return fail(decision.message || "Trusted unit evidence is incomplete.", 409, decision.code || "TRUSTED_MEDIA_REQUIRED");
    } else if (mode === "verify") return fail("Capture the exact unit's live GPS evidence before verification.", 409, "TRUSTED_MEDIA_REQUIRED");

    if (mode === "verify") {
      const missing = ["propertyTypeId", "propertySubtypeId", "priceTotal", "boundaryNorth", "boundarySouth", "boundaryEast", "boundaryWest"]
        .filter((key) => !clean(unit[key]));
      const hasArea = [unit.plotAreaSqft, unit.builtUpSqft, unit.carpetSqft, unit.superBuiltUpSqft].some((value) => Number(value) > 0);
      if (missing.length || !hasArea) return fail("Complete taxonomy, positive price and area, and all four boundaries before verification.", 400, "UNIT_DATA_INCOMPLETE");
    }

    const result = await admin.rpc("complete_builder_inventory_unit_authoritative", {
      target_owner_user_id: user.id, target_unit_id: unitId, target_unit: unit,
      target_amenity_ids: amenityIds, target_completion_mode: mode,
    });
    if (result.error) {
      const duplicate = result.error.code === "23505";
      return fail(duplicate ? "That unit code is already used in this project." : result.error.message, duplicate ? 409 : 500, duplicate ? "UNIT_CODE_DUPLICATE" : "UNIT_COMPLETION_SAVE_FAILED");
    }
    return NextResponse.json({ ok: true, data: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause: any) {
    return fail(cause?.message || "Unit details could not be saved.", 400, "UNIT_COMPLETION_REQUEST_INVALID");
  }
}
