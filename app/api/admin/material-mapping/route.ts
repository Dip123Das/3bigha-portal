import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DatabaseError = {
  code?: string | null;
  message?: string | null;
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanSortOrder(value: unknown) {
  if (value === "" || value === null || value === undefined) return 1000;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 1000000
    ? number
    : null;
}

function databaseError(error: DatabaseError) {
  if (error.code === "23505") {
    return reply(
      { ok: false, error: "This Materials Mapping relationship already exists." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "A selected Materials Taxonomy or Attribute record no longer exists." },
      409
    );
  }
  if (error.code === "22023" || error.code === "55000") {
    return reply(
      { ok: false, error: error.message || "The Materials Mapping relationship is invalid." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Materials Mapping operation failed." },
    400
  );
}

async function validateAttributeParents(
  admin: SupabaseClient,
  productGroupId: string,
  attributeId: string,
  requireActive = true
) {
  const [productGroupResult, attributeResult] = await Promise.all([
    admin
      .from("material_taxons")
      .select("id,name,slug,kind,is_active")
      .eq("id", productGroupId)
      .maybeSingle(),
    admin
      .from("material_attributes")
      .select("id,name,slug,input_type,unit,scope,is_active")
      .eq("id", attributeId)
      .maybeSingle(),
  ]);

  const error = productGroupResult.error || attributeResult.error;
  if (error) throw error;

  if (
    !productGroupResult.data ||
    productGroupResult.data.kind !== "product_group" ||
    (requireActive && !productGroupResult.data.is_active)
  ) {
    return { ok: false as const, error: "Select an active Materials Product Group." };
  }

  if (
    !attributeResult.data ||
    (requireActive && !attributeResult.data.is_active)
  ) {
    return { ok: false as const, error: "Select an active Materials Attribute." };
  }

  return {
    ok: true as const,
    productGroup: productGroupResult.data,
    attribute: attributeResult.data,
  };
}

async function validateTaxonomyParents(
  admin: SupabaseClient,
  subcategoryId: string,
  productGroupId: string,
  requireActive = true
) {
  const related = await admin
    .from("material_taxons")
    .select("id,name,slug,kind,is_active")
    .in("id", [subcategoryId, productGroupId]);

  if (related.error) throw related.error;

  const subcategory = (related.data || []).find((row) => row.id === subcategoryId);
  const productGroup = (related.data || []).find((row) => row.id === productGroupId);

  if (
    !subcategory ||
    subcategory.kind !== "subcategory" ||
    (requireActive && !subcategory.is_active)
  ) {
    return { ok: false as const, error: "Select an active Materials Subcategory." };
  }

  if (
    !productGroup ||
    productGroup.kind !== "product_group" ||
    (requireActive && !productGroup.is_active)
  ) {
    return { ok: false as const, error: "Select an active Materials Product Group." };
  }

  return { ok: true as const, subcategory, productGroup };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const [taxonResult, attributeResult, subcategoryMappingResult, attributeMappingResult, listingResult] =
    await Promise.all([
      access.admin
        .from("material_taxons")
        .select("id,parent_id,kind,name,slug,sort_order,is_active,source")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      access.admin
        .from("material_attributes")
        .select("id,name,slug,input_type,unit,scope,sort_order,is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      access.admin
        .from("material_subcategory_product_groups")
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
        .order("created_at", { ascending: true }),
      access.admin
        .from("material_product_group_attributes")
        .select("product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      access.admin
        .from("material_listings")
        .select("id,subcategory_id,product_group_id"),
    ]);

  const error =
    taxonResult.error ||
    attributeResult.error ||
    subcategoryMappingResult.error ||
    attributeMappingResult.error ||
    listingResult.error;
  if (error) return databaseError(error);

  const taxons = taxonResult.data || [];
  const attributes = attributeResult.data || [];
  const subcategoryMappings = subcategoryMappingResult.data || [];
  const attributeMappings = attributeMappingResult.data || [];
  const listings = listingResult.data || [];

  const productGroupListingCounts: Record<string, number> = {};
  const relationshipListingCounts: Record<string, number> = {};
  for (const listing of listings) {
    if (listing.product_group_id) {
      productGroupListingCounts[listing.product_group_id] =
        (productGroupListingCounts[listing.product_group_id] || 0) + 1;
    }
    if (listing.subcategory_id && listing.product_group_id) {
      const key = `${listing.subcategory_id}:${listing.product_group_id}`;
      relationshipListingCounts[key] = (relationshipListingCounts[key] || 0) + 1;
    }
  }

  return reply({
    ok: true,
    role: access.role,
    email: access.user.email || null,
    taxons,
    attributes,
    subcategory_product_groups: subcategoryMappings.map((row) => ({
      ...row,
      listing_count:
        relationshipListingCounts[`${row.subcategory_id}:${row.product_group_id}`] || 0,
    })),
    product_group_attributes: attributeMappings.map((row) => ({
      ...row,
      product_group_listing_count: productGroupListingCounts[row.product_group_id] || 0,
    })),
    counts: {
      product_groups: taxons.filter((row) => row.kind === "product_group").length,
      active_product_groups: taxons.filter(
        (row) => row.kind === "product_group" && row.is_active
      ).length,
      attributes: attributes.length,
      active_attributes: attributes.filter((row) => row.is_active).length,
      subcategory_mappings: subcategoryMappings.length,
      active_subcategory_mappings: subcategoryMappings.filter((row) => row.is_active).length,
      attribute_mappings: attributeMappings.length,
      active_attribute_mappings: attributeMappings.filter((row) => row.is_active).length,
      required_attribute_mappings: attributeMappings.filter(
        (row) => row.is_active && row.is_required
      ).length,
      material_listings: listings.length,
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

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "map_subcategory") {
    const subcategoryId = cleanId(body.subcategory_id);
    const productGroupId = cleanId(body.product_group_id);
    if (!subcategoryId || !productGroupId) {
      return reply({ ok: false, error: "Select a Materials Subcategory and Product Group." }, 400);
    }

    try {
      const parents = await validateTaxonomyParents(
        access.admin,
        subcategoryId,
        productGroupId
      );
      if (!parents.ok) return reply({ ok: false, error: parents.error }, 400);

      const existing = await access.admin
        .from("material_subcategory_product_groups")
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
        .eq("subcategory_id", subcategoryId)
        .maybeSingle();
      if (existing.error) return databaseError(existing.error);

      if (existing.data) {
        if (existing.data.product_group_id !== productGroupId) {
          return reply(
            {
              ok: false,
              error:
                "The permanent Subcategory and Product Group relationship is locked after creation.",
            },
            409
          );
        }
        if (existing.data.is_active) {
          return reply({ ok: false, error: "This relationship is already active." }, 409);
        }

        const reactivated = await access.admin
          .from("material_subcategory_product_groups")
          .update({ is_active: true })
          .eq("subcategory_id", subcategoryId)
          .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
          .single();
        if (reactivated.error) return databaseError(reactivated.error);
        return reply({ ok: true, action: "reactivated", data: reactivated.data });
      }

      const inserted = await access.admin
        .from("material_subcategory_product_groups")
        .insert({ subcategory_id: subcategoryId, product_group_id: productGroupId, is_active: true })
        .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
        .single();
      if (inserted.error) return databaseError(inserted.error);
      return reply({ ok: true, action: "created", data: inserted.data }, 201);
    } catch (error) {
      return databaseError(error as DatabaseError);
    }
  }

  if (action === "map_attribute") {
    const productGroupId = cleanId(body.product_group_id);
    const attributeId = cleanId(body.attribute_id);
    const sortOrder = cleanSortOrder(body.sort_order);

    if (!productGroupId || !attributeId) {
      return reply({ ok: false, error: "Select a Materials Product Group and Attribute." }, 400);
    }
    if (sortOrder === null) {
      return reply(
        { ok: false, error: "Sort order must be a whole number from 0 to 1000000." },
        400
      );
    }

    try {
      const parents = await validateAttributeParents(
        access.admin,
        productGroupId,
        attributeId
      );
      if (!parents.ok) return reply({ ok: false, error: parents.error }, 400);

      const existing = await access.admin
        .from("material_product_group_attributes")
        .select("product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at")
        .eq("product_group_id", productGroupId)
        .eq("attribute_id", attributeId)
        .maybeSingle();
      if (existing.error) return databaseError(existing.error);

      if (existing.data?.is_active) {
        return reply(
          { ok: false, error: "This Materials Attribute is already actively mapped to this Product Group." },
          409
        );
      }

      if (existing.data) {
        const reactivated = await access.admin
          .from("material_product_group_attributes")
          .update({
            sort_order: sortOrder,
            is_required: body.is_required === true,
            is_active: true,
          })
          .eq("product_group_id", productGroupId)
          .eq("attribute_id", attributeId)
          .select("product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at")
          .single();
        if (reactivated.error) return databaseError(reactivated.error);
        return reply({ ok: true, action: "reactivated", data: reactivated.data });
      }

      const inserted = await access.admin
        .from("material_product_group_attributes")
        .insert({
          product_group_id: productGroupId,
          attribute_id: attributeId,
          sort_order: sortOrder,
          is_required: body.is_required === true,
          is_active: true,
        })
        .select("product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at")
        .single();
      if (inserted.error) return databaseError(inserted.error);
      return reply({ ok: true, action: "created", data: inserted.data }, 201);
    } catch (error) {
      return databaseError(error as DatabaseError);
    }
  }

  return reply({ ok: false, error: "Select a supported Materials Mapping action." }, 400);
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

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "subcategory_status") {
    const subcategoryId = cleanId(body.subcategory_id);
    if (!subcategoryId || typeof body.is_active !== "boolean") {
      return reply({ ok: false, error: "Mapping identity and lifecycle status are required." }, 400);
    }

    const existing = await access.admin
      .from("material_subcategory_product_groups")
      .select("subcategory_id,product_group_id,is_active")
      .eq("subcategory_id", subcategoryId)
      .maybeSingle();
    if (existing.error) return databaseError(existing.error);
    if (!existing.data) return reply({ ok: false, error: "The Materials relationship was not found." }, 404);

    if (body.is_active === true) {
      try {
        const parents = await validateTaxonomyParents(
          access.admin,
          subcategoryId,
          existing.data.product_group_id
        );
        if (!parents.ok) return reply({ ok: false, error: parents.error }, 409);
      } catch (error) {
        return databaseError(error as DatabaseError);
      }
    } else {
      const listings = await access.admin
        .from("material_listings")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", subcategoryId)
        .eq("product_group_id", existing.data.product_group_id);
      if (listings.error) return databaseError(listings.error);
      if ((listings.count || 0) > 0) {
        return reply(
          {
            ok: false,
            error: `This relationship is used by ${listings.count} material listing(s) and cannot be deactivated.`,
          },
          409
        );
      }
      if (existing.data.is_active && body.confirmed !== true) {
        return reply(
          {
            ok: false,
            error: "Human confirmation is required before deactivating this relationship.",
            requires_confirmation: true,
            dependency_count: 0,
            confirmation: "No Subcategory or Product Group record will be deleted.",
          },
          409
        );
      }
    }

    const updated = await access.admin
      .from("material_subcategory_product_groups")
      .update({ is_active: body.is_active })
      .eq("subcategory_id", subcategoryId)
      .select("subcategory_id,product_group_id,is_active,created_at,updated_at")
      .single();
    if (updated.error) return databaseError(updated.error);
    return reply({
      ok: true,
      action: body.is_active ? "reactivated" : "deactivated",
      data: updated.data,
      dependency_count: 0,
    });
  }

  if (action === "attribute_mapping") {
    const productGroupId = cleanId(body.product_group_id);
    const attributeId = cleanId(body.attribute_id);
    if (!productGroupId || !attributeId) {
      return reply({ ok: false, error: "Product Group and Attribute mapping identity are required." }, 400);
    }

    const existing = await access.admin
      .from("material_product_group_attributes")
      .select("product_group_id,attribute_id,sort_order,is_required,is_active")
      .eq("product_group_id", productGroupId)
      .eq("attribute_id", attributeId)
      .maybeSingle();
    if (existing.error) return databaseError(existing.error);
    if (!existing.data) return reply({ ok: false, error: "The Materials Attribute mapping was not found." }, 404);

    const update: { sort_order?: number; is_required?: boolean; is_active?: boolean } = {};

    if (Object.prototype.hasOwnProperty.call(body, "sort_order")) {
      const sortOrder = cleanSortOrder(body.sort_order);
      if (sortOrder === null) {
        return reply(
          { ok: false, error: "Sort order must be a whole number from 0 to 1000000." },
          400
        );
      }
      update.sort_order = sortOrder;
    }
    if (Object.prototype.hasOwnProperty.call(body, "is_required")) {
      update.is_required = body.is_required === true;
    }
    if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
      const nextActive = body.is_active === true;
      if (nextActive && !existing.data.is_active) {
        try {
          const parents = await validateAttributeParents(
            access.admin,
            productGroupId,
            attributeId
          );
          if (!parents.ok) return reply({ ok: false, error: parents.error }, 409);
        } catch (error) {
          return databaseError(error as DatabaseError);
        }
      }

      if (!nextActive && existing.data.is_active) {
        const listings = await access.admin
          .from("material_listings")
          .select("id", { count: "exact", head: true })
          .eq("product_group_id", productGroupId);
        if (listings.error) return databaseError(listings.error);
        if (body.confirmed !== true) {
          return reply(
            {
              ok: false,
              error:
                "Human confirmation is required before deactivating this Materials Attribute mapping.",
              requires_confirmation: true,
              dependency_count: listings.count || 0,
              confirmation:
                "The mapping will become unavailable for new listing answers. No catalogue or listing record will be deleted.",
            },
            409
          );
        }
      }
      update.is_active = nextActive;
    }

    if (Object.keys(update).length === 0) {
      return reply({ ok: false, error: "No supported mapping change was supplied." }, 400);
    }

    const updated = await access.admin
      .from("material_product_group_attributes")
      .update(update)
      .eq("product_group_id", productGroupId)
      .eq("attribute_id", attributeId)
      .select("product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at")
      .single();
    if (updated.error) return databaseError(updated.error);

    return reply({
      ok: true,
      action:
        update.is_active === false
          ? "deactivated"
          : update.is_active === true
            ? "reactivated"
            : "updated",
      data: updated.data,
    });
  }

  return reply({ ok: false, error: "Select a supported Materials Mapping change." }, 400);
}
