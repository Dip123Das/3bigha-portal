import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
const clean = (value: unknown) => String(value ?? "").trim();
const fail = (message: string, status: number, code: string) => NextResponse.json({ ok: false, error: { code, message } }, { status });

export async function GET(request: NextRequest, context: { params: { slug: string } }) {
  try {
    const slug = clean(context.params.slug).toLowerCase();
    if (!slug) return fail("Project slug is required.", 400, "PROJECT_SLUG_REQUIRED");
    const admin = getSupabaseAdmin();
    const projectResult = await admin.from("builder_projects")
      .select("id,name,slug,description,city,district,state,status,is_active,updated_at,builder_profile_id")
      .eq("slug", slug).maybeSingle();
    if (projectResult.error || !projectResult.data) return fail("Project not found.", 404, "PROJECT_NOT_FOUND");
    const project = projectResult.data;
    let ownerPreview = false;
    if (request.nextUrl.searchParams.get("preview") === "builder") {
      const session = getSupabaseServerClient(await cookies());
      const { data: auth } = await session.auth.getUser();
      if (auth.user) {
        const owner = await admin.from("builder_profiles").select("id")
          .eq("id", project.builder_profile_id).eq("owner_user_id", auth.user.id).maybeSingle();
        ownerPreview = Boolean(owner.data?.id);
      }
    }
    if (!ownerPreview && (project.status !== "active" || project.is_active !== true)) {
      return fail("Project is not publicly available.", 404, "PROJECT_NOT_PUBLIC");
    }
    const [catalogResult, unitResult] = await Promise.all([
      admin.from("builder_project_catalogs").select("id,project_id,kind,name,slug,sort_order,is_active")
        .eq("project_id", project.id).eq("is_active", true).order("sort_order", { ascending: true, nullsFirst: false }),
      admin.from("builder_inventory_units")
        .select("id,project_id,catalog_id,unit_code,title,unit_kind,tower,block,floor_no,unit_no,facing,status,plot_area_sqft,built_up_sqft,carpet_sqft,super_built_up_sqft,dimension_length_ft,dimension_width_ft,boundary_north,boundary_south,boundary_east,boundary_west,land_vacancy_status,existing_structure_type,boundary_demarcation_type,trust_status,updated_at")
        .eq("project_id", project.id).order("unit_code", { ascending: true }),
    ]);
    if (catalogResult.error || unitResult.error) return fail("Project inventory could not be loaded.", 500, "INVENTORY_LOOKUP_FAILED");
    const visibleUnits = ownerPreview ? (unitResult.data ?? []) : (unitResult.data ?? []).filter((unit) => unit.trust_status === "verified");
    const unitIds = visibleUnits.map((unit) => unit.id);
    const priceByUnit = new Map<string, number | null>();
    const listingByUnit = new Map<string, string>();
    if (unitIds.length) {
      const [prices, sources] = await Promise.all([
        admin.from("builder_inventory_pricing").select("unit_id,price_total").in("unit_id", unitIds),
        admin.from("property_listing_sources").select("unit_id,property_id").in("unit_id", unitIds),
      ]);
      for (const row of prices.data ?? []) priceByUnit.set(row.unit_id, row.price_total == null ? null : Number(row.price_total));
      const sourceRows = sources.data ?? [];
      const propertyIds = sourceRows.map((row) => row.property_id).filter(Boolean);
      const allowedPropertyIds = new Set<string>();
      if (propertyIds.length) {
        let listings = admin.from("property_listings").select("id,status,is_public").in("id", propertyIds);
        if (!ownerPreview) listings = listings.eq("status", "published").eq("is_public", true);
        const listingResult = await listings;
        for (const row of listingResult.data ?? []) allowedPropertyIds.add(row.id);
      }
      for (const row of sourceRows) {
        if (row.unit_id && row.property_id && allowedPropertyIds.has(row.property_id)) {
          listingByUnit.set(row.unit_id, row.property_id);
        }
      }
    }
    const { builder_profile_id: _privateBuilderId, ...publicProject } = project;
    return NextResponse.json({ ok: true, data: {
      project: publicProject, catalogs: catalogResult.data ?? [], ownerPreview,
      units: visibleUnits.map((unit) => ({ ...unit, price: priceByUnit.get(unit.id) ?? null, listingId: listingByUnit.get(unit.id) ?? null })),
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("Project inventory could not be loaded.", 500, "PROJECT_INVENTORY_FAILED");
  }
}
