import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MobilePropertyDiscovery,
  MobilePropertyDiscoveryProject,
  MobilePropertyDiscoveryUnit,
  MobilePropertyLayoutPlacement,
  MobilePropertyProjectPreview,
  MobilePropertyUnitStatus,
} from "@/lib/mobile/contracts/v1";

type Row = Record<string, any>;

const clean = (value: unknown) => String(value ?? "").trim();
const nullableText = (value: unknown) => {
  const result = clean(value);
  return result || null;
};
const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};

function publicStatus(value: unknown): MobilePropertyUnitStatus {
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

async function loadPublicProjects(supabase: SupabaseClient): Promise<Row[]> {
  const result = await supabase
    .from("builder_projects")
    .select(
      "id,name,slug,description,city,district,state,pincode,updated_at",
    )
    .eq("status", "active")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(50);

  if (result.error) throw result.error;
  return (result.data ?? []) as Row[];
}

async function loadVerifiedUnitCounts(
  supabase: SupabaseClient,
  projectIds: string[],
) {
  if (projectIds.length === 0) return new Map<string, Row[]>();

  const result = await supabase
    .from("builder_inventory_units")
    .select("id,project_id,status,trust_status")
    .in("project_id", projectIds)
    .eq("trust_status", "verified");

  if (result.error) throw result.error;

  const grouped = new Map<string, Row[]>();
  for (const row of (result.data ?? []) as Row[]) {
    const projectId = clean(row.project_id);
    grouped.set(projectId, [...(grouped.get(projectId) ?? []), row]);
  }
  return grouped;
}

function projectSummary(
  project: Row,
  units: Row[],
): MobilePropertyDiscoveryProject {
  return {
    id: clean(project.id),
    name: clean(project.name) || "Untitled project",
    slug: clean(project.slug),
    description: nullableText(project.description),
    city: nullableText(project.city),
    district: nullableText(project.district),
    state: nullableText(project.state),
    pincode: nullableText(project.pincode),
    updatedAt: nullableText(project.updated_at),
    verifiedUnitCount: units.length,
    availableUnitCount: units.filter(
      (unit) => publicStatus(unit.status) === "available",
    ).length,
    webPath: `/property/projects/${encodeURIComponent(clean(project.slug))}`,
  };
}

async function loadSelectedProject(
  supabase: SupabaseClient,
  project: Row,
): Promise<MobilePropertyProjectPreview> {
  const projectId = clean(project.id);

  const [catalogueResult, unitResult] = await Promise.all([
    supabase
      .from("builder_project_catalogs")
      .select("id,kind,name,slug,sort_order")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("builder_inventory_units")
      .select(
        "id,catalog_id,unit_code,title,unit_kind,tower,block,floor_no,unit_no,facing,status,plot_area_sqft,built_up_sqft,carpet_sqft,super_built_up_sqft,dimension_length_ft,dimension_width_ft,boundary_north,boundary_south,boundary_east,boundary_west,land_vacancy_status,existing_structure_type,boundary_demarcation_type,trust_status,updated_at",
      )
      .eq("project_id", projectId)
      .eq("trust_status", "verified")
      .order("unit_code", { ascending: true }),
  ]);

  if (catalogueResult.error) throw catalogueResult.error;
  if (unitResult.error) throw unitResult.error;

  const unitRows = (unitResult.data ?? []) as Row[];
  const unitIds = unitRows.map((unit) => clean(unit.id)).filter(Boolean);
  const priceByUnit = new Map<string, number | null>();
  const listingByUnit = new Map<string, string>();

  if (unitIds.length > 0) {
    const [priceResult, sourceResult] = await Promise.all([
      supabase
        .from("builder_inventory_pricing")
        .select("unit_id,price_total")
        .in("unit_id", unitIds),
      supabase
        .from("property_listing_sources")
        .select("unit_id,property_id")
        .in("unit_id", unitIds),
    ]);

    if (priceResult.error) throw priceResult.error;
    if (sourceResult.error) throw sourceResult.error;

    for (const row of (priceResult.data ?? []) as Row[]) {
      priceByUnit.set(clean(row.unit_id), nullableNumber(row.price_total));
    }

    const sources = (sourceResult.data ?? []) as Row[];
    const propertyIds = sources
      .map((source) => clean(source.property_id))
      .filter(Boolean);
    const publishedIds = new Set<string>();

    if (propertyIds.length > 0) {
      const listingResult = await supabase
        .from("property_listings")
        .select("id")
        .in("id", propertyIds)
        .eq("status", "published")
        .eq("is_public", true);

      if (listingResult.error) throw listingResult.error;
      for (const row of (listingResult.data ?? []) as Row[]) {
        publishedIds.add(clean(row.id));
      }
    }

    for (const source of sources) {
      const propertyId = clean(source.property_id);
      if (publishedIds.has(propertyId)) {
        listingByUnit.set(clean(source.unit_id), propertyId);
      }
    }
  }

  const units: MobilePropertyDiscoveryUnit[] = unitRows.map((unit) => {
    const id = clean(unit.id);
    const listingId = listingByUnit.get(id) ?? null;

    return {
      id,
      catalogueId: nullableText(unit.catalog_id),
      unitCode: nullableText(unit.unit_code),
      title: nullableText(unit.title),
      unitKind: clean(unit.unit_kind),
      tower: nullableText(unit.tower),
      block: nullableText(unit.block),
      floorNumber: nullableNumber(unit.floor_no),
      unitNumber: nullableText(unit.unit_no),
      facing: nullableText(unit.facing),
      status: publicStatus(unit.status),
      price: priceByUnit.get(id) ?? null,
      plotAreaSqft: nullableNumber(unit.plot_area_sqft),
      builtUpAreaSqft: nullableNumber(unit.built_up_sqft),
      carpetAreaSqft: nullableNumber(unit.carpet_sqft),
      superBuiltUpAreaSqft: nullableNumber(unit.super_built_up_sqft),
      dimensionLengthFt: nullableNumber(unit.dimension_length_ft),
      dimensionWidthFt: nullableNumber(unit.dimension_width_ft),
      boundaryNorth: nullableText(unit.boundary_north),
      boundarySouth: nullableText(unit.boundary_south),
      boundaryEast: nullableText(unit.boundary_east),
      boundaryWest: nullableText(unit.boundary_west),
      landVacancyStatus: nullableText(unit.land_vacancy_status),
      existingStructureType: nullableText(unit.existing_structure_type),
      boundaryDemarcationType: nullableText(unit.boundary_demarcation_type),
      trustStatus: "verified",
      listingId,
      listingWebPath: listingId
        ? `/property/${encodeURIComponent(listingId)}`
        : null,
      updatedAt: nullableText(unit.updated_at),
    };
  });

  const layoutResult = await supabase
    .from("property_project_layouts")
    .select("id,version,name,canvas_width,canvas_height")
    .eq("project_id", projectId)
    .eq("status", "published")
    .maybeSingle();

  if (layoutResult.error) throw layoutResult.error;

  let layout: MobilePropertyProjectPreview["layout"] = null;
  if (layoutResult.data) {
    const placementResult = await supabase
      .from("property_project_layout_units")
      .select(
        "unit_id,position_x,position_y,width,height,rotation,label_override",
      )
      .eq("layout_id", layoutResult.data.id);

    if (placementResult.error) throw placementResult.error;

    const visibleIds = new Set(units.map((unit) => unit.id));
    const placements: MobilePropertyLayoutPlacement[] = (
      (placementResult.data ?? []) as Row[]
    )
      .filter((placement) => visibleIds.has(clean(placement.unit_id)))
      .map((placement) => ({
        unitId: clean(placement.unit_id),
        positionX: Number(placement.position_x),
        positionY: Number(placement.position_y),
        width: Number(placement.width),
        height: Number(placement.height),
        rotation: Number(placement.rotation),
        labelOverride: nullableText(placement.label_override),
      }));

    layout = {
      id: clean(layoutResult.data.id),
      version: Number(layoutResult.data.version),
      name: clean(layoutResult.data.name) || "Published project layout",
      canvasWidth: Number(layoutResult.data.canvas_width),
      canvasHeight: Number(layoutResult.data.canvas_height),
      placements,
    };
  }

  return {
    project: {
      id: projectId,
      name: clean(project.name) || "Untitled project",
      slug: clean(project.slug),
      description: nullableText(project.description),
      city: nullableText(project.city),
      district: nullableText(project.district),
      state: nullableText(project.state),
      updatedAt: nullableText(project.updated_at),
      webPath: `/property/projects/${encodeURIComponent(clean(project.slug))}`,
    },
    catalogues: ((catalogueResult.data ?? []) as Row[]).map((catalogue) => ({
      id: clean(catalogue.id),
      kind: clean(catalogue.kind),
      name: clean(catalogue.name),
      slug: clean(catalogue.slug),
      sortOrder: nullableNumber(catalogue.sort_order),
    })),
    units,
    layout,
  };
}

export async function buildMobilePropertyDiscovery(
  supabase: SupabaseClient,
  selectedSlug?: string | null,
): Promise<MobilePropertyDiscovery> {
  const projects = await loadPublicProjects(supabase);
  const projectIds = projects.map((project) => clean(project.id));
  const unitsByProject = await loadVerifiedUnitCounts(supabase, projectIds);
  const summaries = projects.map((project) =>
    projectSummary(project, unitsByProject.get(clean(project.id)) ?? []),
  );
  const slug = clean(selectedSlug).toLowerCase();
  const selected = slug
    ? projects.find((project) => clean(project.slug).toLowerCase() === slug)
    : null;

  return {
    generatedAt: new Date().toISOString(),
    projects: summaries,
    selectedProject: selected
      ? await loadSelectedProject(supabase, selected)
      : null,
  };
}
