import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  evaluateTrustedPublication,
  extractPersistedMediaAssets,
} from "@/lib/media/trusted-publication-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return error("Authentication required.", 401, "UNAUTHORIZED");
    const projectId = text(request.nextUrl.searchParams.get("projectId"));
    if (!UUID.test(projectId)) return error("Invalid project ID.", 400, "PROJECT_ID_INVALID");
    const admin = getSupabaseAdmin();
    const project = await admin.from("builder_projects")
      .select("id,name,project_kind,city,district,state,status,investment_plan_master_id,builder_profiles!inner(owner_user_id)")
      .eq("id", projectId).eq("builder_profiles.owner_user_id", user.id).maybeSingle();
    if (project.error || !project.data) return error("Project not found or you do not own it.", 403, "PROJECT_FORBIDDEN");
    const catalogs = await admin.from("builder_project_catalogs")
      .select("id,project_id,kind,name,slug,sort_order,is_active")
      .eq("project_id", projectId).eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false }).order("name");
    if (catalogs.error) return error("Unable to load project catalogues.", 500, "CATALOG_LOOKUP_FAILED");
    const templates = await admin.from("builder_project_catalog_unit_templates")
      .select("catalog_id,template_data,amenity_ids,version,updated_at")
      .eq("project_id", projectId);
    if (templates.error) return error("Unable to load unit templates.", 500, "TEMPLATE_LOOKUP_FAILED");
    const templateByCatalog = new Map((templates.data ?? []).map((row: any) => [String(row.catalog_id), row]));
    const catalogsWithTemplates = (catalogs.data ?? []).map((catalog: any) => ({
      ...catalog,
      unit_template: templateByCatalog.get(String(catalog.id)) ?? null,
    }));
    return NextResponse.json({ ok: true, data: { project: project.data, catalogs: catalogsWithTemplates } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return error("Unable to load builder project.", 500, "PROJECT_LOOKUP_FAILED");
  }
}

const TEMPLATE_TEXT_KEYS = [
  "listingPurpose", "primaryType", "kind", "subcategory", "bhk",
  "builtUpSqft", "carpetSqft", "plotAreaSqft", "houseFloors",
  "houseBuiltUpSqft", "houseCarpetSqft", "housePlotSqft", "tower",
  "totalFloorsInTower", "facing", "plotFacing", "furnishing", "readyToMove",
  "unitCodePrefix", "unitCodePadDigits",
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return error("Authentication required.", 401, "UNAUTHORIZED");
    const body = await request.json().catch(() => null);
    const projectId = text(body?.projectId);
    const catalogId = text(body?.catalogId);
    if (!UUID.test(projectId) || !UUID.test(catalogId)) {
      return error("Valid project and catalogue IDs are required.", 400, "TEMPLATE_TARGET_INVALID");
    }
    const admin = getSupabaseAdmin();
    const project = await admin.from("builder_projects")
      .select("id,builder_profiles!inner(owner_user_id)")
      .eq("id", projectId).eq("builder_profiles.owner_user_id", user.id).maybeSingle();
    if (project.error || !project.data) return error("Project not found or you do not own it.", 403, "TEMPLATE_FORBIDDEN");
    const catalog = await admin.from("builder_project_catalogs")
      .select("id,project_id").eq("id", catalogId).eq("project_id", projectId).maybeSingle();
    if (catalog.error || !catalog.data) return error("Catalogue does not belong to this project.", 400, "TEMPLATE_CATALOG_INVALID");

    const templateData: Record<string, string> = {};
    for (const key of TEMPLATE_TEXT_KEYS) {
      const value = text(body?.templateData?.[key]);
      if (value.length > 240) return error(`${key} is too long.`, 400, "TEMPLATE_VALUE_INVALID");
      if (value) templateData[key] = value;
    }
    const amenityIds = Array.isArray(body?.amenityIds)
      ? [...new Set(body.amenityIds.map(text).filter((id: string) => UUID.test(id)))]
      : [];
    if (amenityIds.length) {
      const amenities = await admin.from("amenities_master").select("id").in("id", amenityIds).eq("is_active", true);
      if (amenities.error || (amenities.data ?? []).length !== amenityIds.length) {
        return error("One or more template amenities are invalid or inactive.", 400, "TEMPLATE_AMENITY_INVALID");
      }
    }
    const existing = await admin.from("builder_project_catalog_unit_templates")
      .select("version").eq("catalog_id", catalogId).maybeSingle();
    const saved = await admin.from("builder_project_catalog_unit_templates").upsert({
      catalog_id: catalogId,
      project_id: projectId,
      template_data: templateData,
      amenity_ids: amenityIds,
      version: Number(existing.data?.version ?? 0) + 1,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "catalog_id" }).select("catalog_id,template_data,amenity_ids,version,updated_at").single();
    if (saved.error) return error(saved.error.message, 500, "TEMPLATE_SAVE_FAILED");
    return NextResponse.json({ ok: true, data: saved.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause: any) {
    return error(cause?.message || "Unable to save unit template.", 400, "TEMPLATE_REQUEST_INVALID");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIT_KINDS = new Set(["flat", "plot", "shop", "office", "house", "villa", "warehouse", "other"]);

function error(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function finitePositive(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${field} must be greater than zero.`);
  return parsed;
}

function positiveInteger(value: unknown, field: string) {
  const parsed = finitePositive(value, field);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed)) throw new Error(`${field} must be a whole number.`);
  return parsed;
}

function floorInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Floor number must be zero or a positive whole number.");
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return error("Authentication required.", 401, "UNAUTHORIZED");

    const body = await request.json().catch(() => null);
    const projectId = text(body?.projectId);
    const incomingUnits = Array.isArray(body?.units) ? body.units : [];
    const amenityIds = Array.isArray(body?.amenityIds)
      ? [...new Set(body.amenityIds.map(text).filter((id: string) => UUID.test(id)))]
      : [];

    if (!UUID.test(projectId)) return error("A valid projectId is required.", 400, "PROJECT_ID_INVALID");
    if (incomingUnits.length < 1 || incomingUnits.length > 200) {
      return error("Between 1 and 200 units may be created at once.", 400, "UNIT_COUNT_INVALID");
    }

    const admin = getSupabaseAdmin();
    const projectResult = await admin
      .from("builder_projects")
      .select("id,builder_profile_id,builder_profiles!inner(owner_user_id)")
      .eq("id", projectId)
      .eq("builder_profiles.owner_user_id", user.id)
      .maybeSingle();

    if (projectResult.error || !projectResult.data?.id) {
      return error("Project not found or you do not own it.", 403, "PROJECT_FORBIDDEN");
    }

    const businessResult = await admin
      .from("business_profiles")
      .select("is_complete")
      .eq("user_id", user.id)
      .maybeSingle();
    if (businessResult.error || businessResult.data?.is_complete !== true) {
      return error("Complete business registration is required.", 409, "BUSINESS_PROFILE_INCOMPLETE");
    }

    const units = incomingUnits.map((unit: any) => {
      const unitCode = text(unit?.unitCode);
      const unitKind = text(unit?.unitKind).toLowerCase();
      if (!unitCode) throw new Error("Every unit requires a unit code.");
      if (unitCode.length > 120) throw new Error("Unit code cannot exceed 120 characters.");
      if (!UNIT_KINDS.has(unitKind)) throw new Error(`Unsupported unit kind: ${unitKind || "empty"}.`);
      return {
        ...unit,
        unitCode,
        unitKind,
        title: text(unit?.title) || null,
        priceTotal: finitePositive(unit?.priceTotal, "Price"),
        plotAreaSqft: finitePositive(unit?.plotAreaSqft, "Plot area"),
        builtUpSqft: finitePositive(unit?.builtUpSqft, "Built-up area"),
        carpetSqft: finitePositive(unit?.carpetSqft, "Carpet area"),
        superBuiltUpSqft: finitePositive(unit?.superBuiltUpSqft, "Super built-up area"),
        dimensionLengthFt: finitePositive(unit?.dimensionLengthFt, "Length"),
        dimensionWidthFt: finitePositive(unit?.dimensionWidthFt, "Width"),
        floorNo: floorInteger(unit?.floorNo),
        bedroomCount: positiveInteger(unit?.bedroomCount, "Bedroom count"),
        structureFloors: positiveInteger(unit?.structureFloors, "Structure floor count"),
      };
    });

    if (
      units.length === 1 &&
      ["boundaryNorth", "boundarySouth", "boundaryEast", "boundaryWest"].some(
        (field) => !text((units[0] as any)[field]),
      )
    ) {
      return error("North, South, East and West boundaries are mandatory for an individual unit.", 400, "BOUNDARIES_REQUIRED");
    }

    if (units.length > 1 && units.some((unit: any) => extractPersistedMediaAssets(unit.trustedMediaJson).length > 0)) {
      return error("Trusted evidence belongs to one unit and cannot be copied during bulk creation.", 400, "BULK_MEDIA_FORBIDDEN");
    }

    for (const unit of units) {
      const assets = extractPersistedMediaAssets(unit.trustedMediaJson);
      if (!assets.length) {
        unit.trustedMediaJson = [];
        unit.trustedPublication = { module: "property", listingKind: "builder_unit", requiredCaptures: 1, completedCaptures: 0, serverVerified: true };
        unit.trustStatus = "pending";
        continue;
      }

      const assetIds = [...new Set(assets.map((asset) => text(asset.trustedMediaAssetId ?? asset.trusted_media_asset_id)).filter(Boolean))];
      if (assetIds.length !== assets.length) {
        return error("Every Trusted Media item requires its canonical asset ID.", 400, "MEDIA_REFERENCE_INVALID");
      }
      const ownedAssets = await admin.from("listing_media_assets").select("id").in("id", assetIds).eq("owner_user_id", user.id).is("deleted_at", null);
      if (ownedAssets.error || (ownedAssets.data ?? []).length !== assetIds.length) {
        return error("Trusted media ownership could not be verified.", 403, "MEDIA_OWNERSHIP_INVALID");
      }

      const decision = await evaluateTrustedPublication("property", assets);
      if (!decision.ok) return error(decision.message || "Trusted unit evidence is incomplete.", 409, decision.code || "TRUSTED_MEDIA_REQUIRED");
      unit.trustedMediaJson = assets;
      unit.trustedPublication = { module: "property", listingKind: "builder_unit", requiredCaptures: decision.requiredCaptures, completedCaptures: decision.completedCaptures, gpsVerified: decision.gpsVerified === true, provenanceVerified: decision.provenanceVerified === true, captureSessionCompleted: decision.captureSessionCompleted === true, aiVerificationStatus: decision.aiVerificationStatus ?? "pending", serverVerified: true };
      unit.trustStatus = "verified";
    }

    const rpcResult = await admin.rpc("create_builder_inventory_units_authoritative", {
      target_owner_user_id: user.id,
      target_project_id: projectId,
      target_units: units,
      target_amenity_ids: amenityIds,
    });
    if (rpcResult.error) {
      const duplicate = rpcResult.error.code === "23505";
      return error(duplicate ? "A unit with the same code already exists in this project." : rpcResult.error.message, duplicate ? 409 : 500, duplicate ? "UNIT_CODE_DUPLICATE" : "UNIT_CREATE_FAILED");
    }

    return NextResponse.json({ ok: true, data: rpcResult.data });
  } catch (cause: any) {
    return error(cause?.message || "Unable to create builder units.", 400, "INVALID_REQUEST");
  }
}
