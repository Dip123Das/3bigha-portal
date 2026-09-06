import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type TaxonomyKind = "category" | "subcategory" | "service";

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

const VALID_KINDS: TaxonomyKind[] = ["category", "subcategory", "service"];

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
      { ok: false, error: "A Services Taxonomy entry with this permanent key or sibling name already exists." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "This entry is connected to Services data and cannot be changed in that way." },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      { ok: false, error: error.message || "A permanent Services Taxonomy identity cannot be changed." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Services Taxonomy operation failed." },
    400
  );
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
  const [taxonResult, providerResult, attributeMappingResult, attributeValueResult] =
    await Promise.all([
      supabase
        .from("service_taxons")
        .select("id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("provider_services").select("id,service_taxon_id"),
      supabase.from("service_attribute_mappings").select("service_taxon_id"),
      supabase.from("service_attribute_values").select("service_taxon_id"),
    ]);

  const error =
    taxonResult.error ||
    providerResult.error ||
    attributeMappingResult.error ||
    attributeValueResult.error;
  if (error) return databaseError(error);

  const taxons = (taxonResult.data || []) as TaxonRow[];
  const children: Record<string, TaxonRow[]> = {};
  const providerCounts: Record<string, number> = {};
  const attributeMappingCounts: Record<string, number> = {};
  const attributeValueCounts: Record<string, number> = {};

  for (const taxon of taxons) {
    if (taxon.parent_id) (children[taxon.parent_id] ||= []).push(taxon);
  }
  for (const row of providerResult.data || []) {
    if (row.service_taxon_id) {
      providerCounts[row.service_taxon_id] = (providerCounts[row.service_taxon_id] || 0) + 1;
    }
  }
  for (const row of attributeMappingResult.data || []) {
    if (row.service_taxon_id) {
      attributeMappingCounts[row.service_taxon_id] =
        (attributeMappingCounts[row.service_taxon_id] || 0) + 1;
    }
  }
  for (const row of attributeValueResult.data || []) {
    if (row.service_taxon_id) {
      attributeValueCounts[row.service_taxon_id] =
        (attributeValueCounts[row.service_taxon_id] || 0) + 1;
    }
  }

  return reply({
    ok: true,
    taxons: taxons.map((taxon) => ({
      ...taxon,
      child_count: (children[taxon.id] || []).length,
      active_child_count: (children[taxon.id] || []).filter((child) => child.is_active).length,
      descendant_count: countDescendants(taxon.id, children),
      provider_service_count: providerCounts[taxon.id] || 0,
      attribute_mapping_count: attributeMappingCounts[taxon.id] || 0,
      attribute_value_count: attributeValueCounts[taxon.id] || 0,
    })),
    summary: {
      total_taxons: taxons.length,
      active_taxons: taxons.filter((row) => row.is_active).length,
      inactive_taxons: taxons.filter((row) => !row.is_active).length,
      category_count: taxons.filter((row) => row.kind === "category").length,
      subcategory_count: taxons.filter((row) => row.kind === "subcategory").length,
      service_count: taxons.filter((row) => row.kind === "service").length,
      provider_service_count: providerResult.data?.length || 0,
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

  if (!validKind(body.kind)) {
    return reply({ ok: false, error: "Select a valid Services Taxonomy level." }, 400);
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

  const supabase = access.admin;
  let parentId: string | null = null;
  if (body.kind === "subcategory" || body.kind === "service") {
    parentId = typeof body.parent_id === "string" ? body.parent_id.trim() : "";
    if (!parentId) return reply({ ok: false, error: "Select the required active parent." }, 400);
    const parent = await supabase
      .from("service_taxons")
      .select("id,kind,is_active")
      .eq("id", parentId)
      .maybeSingle();
    if (parent.error) return databaseError(parent.error);
    const expected = body.kind === "subcategory" ? "category" : "subcategory";
    if (!parent.data || parent.data.kind !== expected || !parent.data.is_active) {
      return reply({ ok: false, error: `A Services ${body.kind} must belong to an active ${expected}.` }, 409);
    }
  } else if (typeof body.parent_id === "string" && body.parent_id.trim()) {
    return reply({ ok: false, error: "A Services Category cannot have a parent." }, 400);
  }

  const inserted = await supabase
    .from("service_taxons")
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

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return reply({ ok: false, error: "Services Taxonomy entry ID is required." }, 400);
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

  const supabase = access.admin;
  const existing = await supabase
    .from("service_taxons")
    .select("id,parent_id,kind,name,slug,is_active")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (!existing.data) return reply({ ok: false, error: "The Services Taxonomy entry was not found." }, 404);

  if (existing.data.is_active && body.is_active === false) {
    const [children, providerUsage, mappingUsage, valueUsage] = await Promise.all([
      supabase
        .from("service_taxons")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id)
        .eq("is_active", true),
      supabase
        .from("provider_services")
        .select("id", { count: "exact", head: true })
        .eq("service_taxon_id", id),
      supabase
        .from("service_attribute_mappings")
        .select("service_taxon_id", { count: "exact", head: true })
        .eq("service_taxon_id", id),
      supabase
        .from("service_attribute_values")
        .select("service_taxon_id", { count: "exact", head: true })
        .eq("service_taxon_id", id),
    ]);
    const error = children.error || providerUsage.error || mappingUsage.error || valueUsage.error;
    if (error) return databaseError(error);
    if ((children.count || 0) > 0) {
      return reply({ ok: false, error: `Deactivate the ${children.count} active child entries first.` }, 409);
    }
    if ((providerUsage.count || 0) > 0) {
      return reply({ ok: false, error: `This Service is used by ${providerUsage.count} provider record(s) and cannot be deactivated.` }, 409);
    }
    if ((mappingUsage.count || 0) > 0 || (valueUsage.count || 0) > 0) {
      return reply({ ok: false, error: "This entry has Services Attribute history and cannot be deactivated." }, 409);
    }
  }

  if (!existing.data.is_active && body.is_active === true && existing.data.parent_id) {
    const parent = await supabase
      .from("service_taxons")
      .select("id,is_active")
      .eq("id", existing.data.parent_id)
      .maybeSingle();
    if (parent.error) return databaseError(parent.error);
    if (!parent.data?.is_active) {
      return reply({ ok: false, error: "Reactivate the parent taxonomy entry first." }, 409);
    }
  }

  const updated = await supabase
    .from("service_taxons")
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
