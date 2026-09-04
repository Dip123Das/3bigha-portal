import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type TaxonomyKind = "type" | "category" | "subcategory" | "product_group";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: TaxonomyKind;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

type MappingRow = {
  subcategory_id: string;
  product_group_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const VALID_KINDS: TaxonomyKind[] = [
  "type",
  "category",
  "subcategory",
  "product_group",
];

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function validKind(value: unknown): value is TaxonomyKind {
  return typeof value === "string" && VALID_KINDS.includes(value as TaxonomyKind);
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description || null;
}

function cleanSortOrder(value: unknown) {
  if (value === "" || value === null || value === undefined) return 1000;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 1000000
    ? number
    : null;
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function databaseError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "23505") {
    return reply(
      { ok: false, error: "A Materials Taxonomy entry with this permanent key already exists." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "This record is connected to Materials data and cannot be changed in that way." },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      { ok: false, error: error.message || "A permanent Materials Taxonomy identity cannot be changed." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Materials Taxonomy operation failed." },
    400
  );
}

function listingColumn(kind: TaxonomyKind) {
  if (kind === "type") return "type_id";
  if (kind === "category") return "category_id";
  if (kind === "subcategory") return "subcategory_id";
  return "product_group_id";
}

function countDescendants(id: string, children: Record<string, TaxonRow[]>) {
  let count = 0;
  const pending = [...(children[id] || [])];
  const visited = new Set<string>();
  while (pending.length) {
    const child = pending.pop();
    if (!child || visited.has(child.id)) continue;
    visited.add(child.id);
    count += 1;
    pending.push(...(children[child.id] || []));
  }
  return count;
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const supabase = access.admin;
  const [taxonResult, mappingResult, listingResult, attributeMappingResult, valueResult] =
    await Promise.all([
      supabase
        .from("material_taxons")
        .select("id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("material_subcategory_product_groups")
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at"),
      supabase
        .from("material_listings")
        .select("id,type_id,category_id,subcategory_id,product_group_id"),
      supabase
        .from("material_product_group_attributes")
        .select("product_group_id,attribute_id"),
      supabase
        .from("material_attribute_values")
        .select("product_group_id,attribute_id"),
    ]);

  const error =
    taxonResult.error ||
    mappingResult.error ||
    listingResult.error ||
    attributeMappingResult.error ||
    valueResult.error;
  if (error) return databaseError(error);

  const taxons = (taxonResult.data || []) as TaxonRow[];
  const mappings = (mappingResult.data || []) as MappingRow[];
  const children: Record<string, TaxonRow[]> = {};
  const listingCounts: Record<string, number> = {};
  const subcategoryMappingCounts: Record<string, number> = {};
  const productGroupUsageCounts: Record<string, number> = {};
  const attributeMappingCounts: Record<string, number> = {};
  const valueCounts: Record<string, number> = {};

  for (const taxon of taxons) {
    if (!taxon.parent_id) continue;
    (children[taxon.parent_id] ||= []).push(taxon);
  }
  for (const listing of listingResult.data || []) {
    for (const id of [listing.type_id, listing.category_id, listing.subcategory_id, listing.product_group_id]) {
      if (id) listingCounts[id] = (listingCounts[id] || 0) + 1;
    }
  }
  for (const mapping of mappings) {
    if (!mapping.is_active) continue;
    subcategoryMappingCounts[mapping.subcategory_id] =
      (subcategoryMappingCounts[mapping.subcategory_id] || 0) + 1;
    productGroupUsageCounts[mapping.product_group_id] =
      (productGroupUsageCounts[mapping.product_group_id] || 0) + 1;
  }
  for (const mapping of attributeMappingResult.data || []) {
    attributeMappingCounts[mapping.product_group_id] =
      (attributeMappingCounts[mapping.product_group_id] || 0) + 1;
  }
  for (const value of valueResult.data || []) {
    if (!value.product_group_id) continue;
    valueCounts[value.product_group_id] = (valueCounts[value.product_group_id] || 0) + 1;
  }

  return reply({
    ok: true,
    taxons: taxons.map((taxon) => ({
      ...taxon,
      child_count: (children[taxon.id] || []).length,
      active_child_count: (children[taxon.id] || []).filter((child) => child.is_active).length,
      descendant_count: countDescendants(taxon.id, children),
      listing_count: listingCounts[taxon.id] || 0,
      subcategory_mapping_count: subcategoryMappingCounts[taxon.id] || 0,
      product_group_usage_count: productGroupUsageCounts[taxon.id] || 0,
      attribute_mapping_count: attributeMappingCounts[taxon.id] || 0,
      controlled_value_count: valueCounts[taxon.id] || 0,
    })),
    subcategory_product_groups: mappings,
    summary: {
      total_taxons: taxons.length,
      active_taxons: taxons.filter((row) => row.is_active).length,
      inactive_taxons: taxons.filter((row) => !row.is_active).length,
      type_count: taxons.filter((row) => row.kind === "type").length,
      category_count: taxons.filter((row) => row.kind === "category").length,
      subcategory_count: taxons.filter((row) => row.kind === "subcategory").length,
      product_group_count: taxons.filter((row) => row.kind === "product_group").length,
      listing_count: listingResult.data?.length || 0,
      unmapped_subcategory_count: taxons.filter(
        (row) => row.kind === "subcategory" && !(subcategoryMappingCounts[row.id] || 0)
      ).length,
    },
  });
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "A valid JSON request is required." }, 400);
  }

  const supabase = access.admin;
  if (body.action === "map_product_group") {
    const subcategoryId = typeof body.subcategory_id === "string" ? body.subcategory_id.trim() : "";
    const productGroupId = typeof body.product_group_id === "string" ? body.product_group_id.trim() : "";
    if (!subcategoryId || !productGroupId) {
      return reply({ ok: false, error: "Select a Materials Subcategory and Product Group." }, 400);
    }

    const [subcategoryResult, productGroupResult, existingResult] = await Promise.all([
      supabase.from("material_taxons").select("id,kind,is_active").eq("id", subcategoryId).maybeSingle(),
      supabase.from("material_taxons").select("id,kind,is_active").eq("id", productGroupId).maybeSingle(),
      supabase
        .from("material_subcategory_product_groups")
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
        .eq("subcategory_id", subcategoryId)
        .maybeSingle(),
    ]);
    const error = subcategoryResult.error || productGroupResult.error || existingResult.error;
    if (error) return databaseError(error);
    if (subcategoryResult.data?.kind !== "subcategory" || !subcategoryResult.data.is_active) {
      return reply({ ok: false, error: "Select an active Materials Subcategory." }, 409);
    }
    if (productGroupResult.data?.kind !== "product_group" || !productGroupResult.data.is_active) {
      return reply({ ok: false, error: "Select an active Materials Product Group." }, 409);
    }

    const existing = existingResult.data as MappingRow | null;
    if (existing) {
      if (existing.product_group_id !== productGroupId) {
        return reply(
          { ok: false, error: "This Subcategory already has a permanent Product Group relationship. Deactivate it for history; it cannot be replaced." },
          409
        );
      }
      if (existing.is_active) return reply({ ok: true, action: "unchanged", data: existing });
      const updated = await supabase
        .from("material_subcategory_product_groups")
        .update({ is_active: true })
        .eq("subcategory_id", subcategoryId)
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
        .single();
      if (updated.error) return databaseError(updated.error);
      return reply({ ok: true, action: "reactivated", data: updated.data });
    }

    const inserted = await supabase
      .from("material_subcategory_product_groups")
      .insert({ subcategory_id: subcategoryId, product_group_id: productGroupId, is_active: true })
      .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
      .single();
    if (inserted.error) return databaseError(inserted.error);
    return reply({ ok: true, action: "created", data: inserted.data }, 201);
  }

  if (!validKind(body.kind)) {
    return reply({ ok: false, error: "Select a valid Materials Taxonomy level." }, 400);
  }
  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply({ ok: false, error: "Name must contain 2 to 120 characters." }, 400);
  }
  const slug = slugify(typeof body.slug === "string" ? body.slug : name);
  if (slug.length < 2 || slug.length > 120) {
    return reply({ ok: false, error: "A valid permanent key is required." }, 400);
  }
  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply({ ok: false, error: "Description must not exceed 600 characters." }, 400);
  }
  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply({ ok: false, error: "Sort order must be a whole number from 0 to 1000000." }, 400);
  }

  let parentId: string | null = null;
  if (body.kind === "category" || body.kind === "subcategory") {
    parentId = typeof body.parent_id === "string" ? body.parent_id.trim() : "";
    if (!parentId) return reply({ ok: false, error: "Select the required active parent." }, 400);
    const parent = await supabase
      .from("material_taxons")
      .select("id,kind,is_active")
      .eq("id", parentId)
      .maybeSingle();
    if (parent.error) return databaseError(parent.error);
    const expected = body.kind === "category" ? "type" : "category";
    if (!parent.data || parent.data.kind !== expected || !parent.data.is_active) {
      return reply({ ok: false, error: `A Materials ${body.kind} must belong to an active ${expected}.` }, 409);
    }
  } else if (typeof body.parent_id === "string" && body.parent_id.trim()) {
    return reply({ ok: false, error: "Materials Types and reusable Product Groups are global and cannot have parents." }, 400);
  }

  const inserted = await supabase
    .from("material_taxons")
    .insert({
      parent_id: parentId,
      kind: body.kind,
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
      source: "admin",
    })
    .select("id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at")
    .single();
  if (inserted.error) return databaseError(inserted.error);
  return reply({ ok: true, action: "created", data: inserted.data }, 201);
}

export async function PATCH(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "A valid JSON request is required." }, 400);
  }

  const supabase = access.admin;
  if (body.action === "mapping_status") {
    const subcategoryId = typeof body.subcategory_id === "string" ? body.subcategory_id.trim() : "";
    if (!subcategoryId || typeof body.is_active !== "boolean") {
      return reply({ ok: false, error: "Mapping identity and lifecycle status are required." }, 400);
    }
    const existing = await supabase
      .from("material_subcategory_product_groups")
      .select("subcategory_id,product_group_id,is_active")
      .eq("subcategory_id", subcategoryId)
      .maybeSingle();
    if (existing.error) return databaseError(existing.error);
    if (!existing.data) return reply({ ok: false, error: "The Materials relationship was not found." }, 404);

    if (body.is_active === true) {
      const related = await supabase
        .from("material_taxons")
        .select("id,kind,is_active")
        .in("id", [subcategoryId, existing.data.product_group_id]);
      if (related.error) return databaseError(related.error);
      if ((related.data || []).length !== 2 || (related.data || []).some((row) => !row.is_active)) {
        return reply({ ok: false, error: "Reactivate both related taxonomy records first." }, 409);
      }
    } else {
      const listing = await supabase
        .from("material_listings")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", subcategoryId)
        .eq("product_group_id", existing.data.product_group_id);
      if (listing.error) return databaseError(listing.error);
      if ((listing.count || 0) > 0) {
        return reply({ ok: false, error: `This relationship is used by ${listing.count} material listing(s) and cannot be deactivated.` }, 409);
      }
    }

    const updated = await supabase
      .from("material_subcategory_product_groups")
      .update({ is_active: body.is_active })
      .eq("subcategory_id", subcategoryId)
      .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
      .single();
    if (updated.error) return databaseError(updated.error);
    return reply({ ok: true, action: body.is_active ? "reactivated" : "deactivated", data: updated.data });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return reply({ ok: false, error: "Materials Taxonomy entry ID is required." }, 400);
  for (const field of ["slug", "parent_id", "kind"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return reply({ ok: false, error: "The permanent key, hierarchy level and parent relationship are locked." }, 400);
    }
  }

  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply({ ok: false, error: "Name must contain 2 to 120 characters." }, 400);
  }
  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply({ ok: false, error: "Description must not exceed 600 characters." }, 400);
  }
  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null || typeof body.is_active !== "boolean") {
    return reply({ ok: false, error: "Valid sort order and lifecycle status are required." }, 400);
  }

  const existing = await supabase
    .from("material_taxons")
    .select("id,parent_id,kind,name,slug,is_active")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (!existing.data) return reply({ ok: false, error: "The Materials Taxonomy entry was not found." }, 404);

  if (existing.data.is_active && body.is_active === false) {
    const [children, listings] = await Promise.all([
      supabase
        .from("material_taxons")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id)
        .eq("is_active", true),
      supabase
        .from("material_listings")
        .select("id", { count: "exact", head: true })
        .eq(listingColumn(existing.data.kind as TaxonomyKind), id),
    ]);
    const error = children.error || listings.error;
    if (error) return databaseError(error);
    if ((children.count || 0) > 0) {
      return reply({ ok: false, error: `Deactivate the ${children.count} active child entries first.` }, 409);
    }
    if ((listings.count || 0) > 0) {
      return reply({ ok: false, error: `This entry is used by ${listings.count} material listing(s) and cannot be deactivated.` }, 409);
    }

    if (existing.data.kind === "subcategory") {
      const mapping = await supabase
        .from("material_subcategory_product_groups")
        .select("subcategory_id", { count: "exact", head: true })
        .eq("subcategory_id", id)
        .eq("is_active", true);
      if (mapping.error) return databaseError(mapping.error);
      if ((mapping.count || 0) > 0) {
        return reply({ ok: false, error: "Deactivate the Product Group relationship first." }, 409);
      }
    }
    if (existing.data.kind === "product_group") {
      const [subcategoryMappings, attributeMappings] = await Promise.all([
        supabase
          .from("material_subcategory_product_groups")
          .select("subcategory_id", { count: "exact", head: true })
          .eq("product_group_id", id)
          .eq("is_active", true),
        supabase
          .from("material_product_group_attributes")
          .select("attribute_id", { count: "exact", head: true })
          .eq("product_group_id", id)
          .eq("is_active", true),
      ]);
      const error = subcategoryMappings.error || attributeMappings.error;
      if (error) return databaseError(error);
      if ((subcategoryMappings.count || 0) > 0 || (attributeMappings.count || 0) > 0) {
        return reply({ ok: false, error: "Deactivate connected Subcategory and Attribute mappings first." }, 409);
      }
    }
  }

  if (!existing.data.is_active && body.is_active === true && existing.data.parent_id) {
    const parent = await supabase
      .from("material_taxons")
      .select("id,is_active")
      .eq("id", existing.data.parent_id)
      .maybeSingle();
    if (parent.error) return databaseError(parent.error);
    if (!parent.data?.is_active) {
      return reply({ ok: false, error: "Reactivate the parent taxonomy entry first." }, 409);
    }
  }

  const updated = await supabase
    .from("material_taxons")
    .update({ name, description, sort_order: sortOrder, is_active: body.is_active })
    .eq("id", id)
    .select("id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at")
    .single();
  if (updated.error) return databaseError(updated.error);
  return reply({
    ok: true,
    action: "updated",
    permanent_key: existing.data.slug,
    permanent_kind: existing.data.kind,
    permanent_parent_id: existing.data.parent_id,
    data: updated.data,
  });
}
