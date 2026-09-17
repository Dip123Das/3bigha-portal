import type { SupabaseClient, User } from "@supabase/supabase-js";

import { resolveCanonicalIdentity } from "@/lib/identity/resolveCanonicalIdentity";
import type {
  MobilePropertyWorkspace,
  MobilePropertyWorkspaceProject,
} from "@/lib/mobile/contracts/v1";

type Row = Record<string, any>;

const clean = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) => clean(value).toLowerCase();

function missingColumn(error: any, column: string) {
  const message = clean(error?.message).toLowerCase();
  return error?.code === "42703" || message.includes(column.toLowerCase());
}

async function loadOwnerListings(
  supabase: SupabaseClient,
  userId: string,
): Promise<Row[]> {
  for (const column of ["owner_id", "owner_user_id"]) {
    const result = await supabase
      .from("property_listings")
      .select("id,status")
      .eq(column, userId);

    if (!result.error) return (result.data ?? []) as Row[];
    if (!missingColumn(result.error, column)) throw result.error;
  }

  return [];
}

function countStatus(rows: Row[], status: string) {
  return rows.filter((row) => normalized(row.status) === status).length;
}

function hasPrice(row: Row) {
  const pricing = Array.isArray(row.builder_inventory_pricing)
    ? row.builder_inventory_pricing
    : row.builder_inventory_pricing
      ? [row.builder_inventory_pricing]
      : [];

  return pricing.some((item) => Number(item?.price_total) > 0);
}

function isTrusted(row: Row) {
  return ["trusted", "verified", "approved"].includes(
    normalized(row.trust_status),
  );
}

function unitCounts(rows: Row[]) {
  return {
    totalUnits: rows.length,
    availableUnits: countStatus(rows, "available"),
    reservedUnits: countStatus(rows, "reserved"),
    soldUnits: countStatus(rows, "sold"),
    pricedUnits: rows.filter(hasPrice).length,
    trustedUnits: rows.filter(isTrusted).length,
  };
}

export async function buildMobilePropertyWorkspace(
  supabase: SupabaseClient,
  user: User,
): Promise<MobilePropertyWorkspace> {
  const canonical = await resolveCanonicalIdentity(supabase, user);
  const capabilities = new Set([
    ...canonical.permissionProjection.vendorCapabilities,
    ...canonical.operatingProjection.capabilityKeys,
  ]);
  const canManageOwnerListings = capabilities.has("property_owner");
  const canManageBuilderProjects = capabilities.has("property_builder");

  const ownerListings = canManageOwnerListings
    ? await loadOwnerListings(supabase, user.id)
    : [];

  let projects: Row[] = [];
  let units: Row[] = [];

  if (canManageBuilderProjects) {
    const profileResult = await supabase
      .from("builder_profiles")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (profileResult.error) throw profileResult.error;

    if (profileResult.data?.id) {
      const projectsResult = await supabase
        .from("builder_projects")
        .select("id,name,slug,project_kind,status,is_active,city,district,state,created_at")
        .eq("builder_profile_id", profileResult.data.id)
        .order("created_at", { ascending: false });

      if (projectsResult.error) throw projectsResult.error;
      projects = (projectsResult.data ?? []) as Row[];

      const projectIds = projects.map((project) => clean(project.id)).filter(Boolean);
      if (projectIds.length > 0) {
        const unitsResult = await supabase
          .from("builder_inventory_units")
          .select("id,project_id,status,trust_status,builder_inventory_pricing(price_total)")
          .in("project_id", projectIds);

        if (unitsResult.error) throw unitsResult.error;
        units = (unitsResult.data ?? []) as Row[];
      }
    }
  }

  const projectSummaries: MobilePropertyWorkspaceProject[] = projects
    .slice(0, 20)
    .map((project) => {
      const projectUnits = units.filter(
        (unit) => clean(unit.project_id) === clean(project.id),
      );

      return {
        id: clean(project.id),
        name: clean(project.name) || "Untitled project",
        slug: clean(project.slug),
        projectKind: clean(project.project_kind),
        status: clean(project.status) || "draft",
        city: clean(project.city),
        district: clean(project.district),
        state: clean(project.state),
        ...unitCounts(projectUnits),
        webPath: `/property/builder/projects/${encodeURIComponent(clean(project.id))}/units`,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    access: {
      canManageOwnerListings,
      canManageBuilderProjects,
    },
    destinations: {
      ownerListings: "/property/my",
      builderProjects: "/property/builder/projects",
      buyerProjects: "/property/projects",
      buyerInventory: "/property/inventory",
    },
    owner: {
      totalListings: ownerListings.length,
      draftListings: countStatus(ownerListings, "draft"),
      pendingListings: countStatus(ownerListings, "pending"),
      approvedListings: countStatus(ownerListings, "approved"),
      rejectedListings: countStatus(ownerListings, "rejected"),
    },
    builder: {
      totalProjects: projects.length,
      activeProjects: projects.filter(
        (project) =>
          project.is_active === true || normalized(project.status) === "active",
      ).length,
      ...unitCounts(units),
      projects: projectSummaries,
    },
  };
}
