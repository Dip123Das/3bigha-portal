import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type ValueRow = {
  id: string;
  attribute_id: string;
  product_group_id: string | null;
  value: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description || null;
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function databaseError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "23505") {
    return reply(
      { ok: false, error: "This controlled Materials Value already exists under the selected Attribute and scope." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "The selected Materials Attribute or Product Group no longer exists." },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      { ok: false, error: error.message || "A permanent Materials Value relationship cannot be changed." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Materials Values operation failed." },
    400
  );
}

async function validateContext(
  supabase: SupabaseClient,
  attributeId: string,
  productGroupId: string | null
) {
  const attribute = await supabase
    .from("material_attributes")
    .select("id,name,slug,input_type,is_active")
    .eq("id", attributeId)
    .maybeSingle();

  if (attribute.error) return { error: databaseError(attribute.error) };
  if (!attribute.data) {
    return { error: reply({ ok: false, error: "The selected Materials Attribute was not found." }, 404) };
  }
  if (!attribute.data.is_active) {
    return { error: reply({ ok: false, error: "Select an active Materials Attribute." }, 409) };
  }
  if (attribute.data.input_type !== "single_select" && attribute.data.input_type !== "multi_select") {
    return {
      error: reply(
        { ok: false, error: "Controlled Values may only be created for one-choice or multiple-choice Materials Attributes." },
        409
      ),
    };
  }

  if (!productGroupId) return { attribute: attribute.data, productGroup: null };

  const [productGroup, mapping] = await Promise.all([
    supabase
      .from("material_taxons")
      .select("id,name,slug,kind,is_active")
      .eq("id", productGroupId)
      .maybeSingle(),
    supabase
      .from("material_product_group_attributes")
      .select("product_group_id,attribute_id")
      .eq("product_group_id", productGroupId)
      .eq("attribute_id", attributeId)
      .maybeSingle(),
  ]);

  const error = productGroup.error || mapping.error;
  if (error) return { error: databaseError(error) };
  if (!productGroup.data || productGroup.data.kind !== "product_group") {
    return { error: reply({ ok: false, error: "The selected Materials Product Group was not found." }, 404) };
  }
  if (!productGroup.data.is_active) {
    return { error: reply({ ok: false, error: "Select an active Materials Product Group." }, 409) };
  }
  if (!mapping.data) {
    return {
      error: reply(
        { ok: false, error: "Map this Materials Attribute to the selected Product Group before creating a Product-Group-specific Value." },
        409
      ),
    };
  }

  return { attribute: attribute.data, productGroup: productGroup.data };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const supabase = access.admin;
  const [attributeResult, productGroupResult, mappingResult, valueResult] =
    await Promise.all([
      supabase
        .from("material_attributes")
        .select("id,name,slug,input_type,is_active,sort_order")
        .in("input_type", ["single_select", "multi_select"])
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("material_taxons")
        .select("id,name,slug,kind,is_active,sort_order")
        .eq("kind", "product_group")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("material_product_group_attributes")
        .select("product_group_id,attribute_id"),
      supabase
        .from("material_attribute_values")
        .select("id,attribute_id,product_group_id,value,slug,description,sort_order,is_active,source,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("value", { ascending: true }),
    ]);

  const error =
    attributeResult.error ||
    productGroupResult.error ||
    mappingResult.error ||
    valueResult.error;
  if (error) return databaseError(error);


  const values = (valueResult.data || []) as ValueRow[];
  return reply({
    ok: true,
    attributes: attributeResult.data || [],
    product_groups: productGroupResult.data || [],
    attribute_mappings: mappingResult.data || [],
    values: values.map((row) => ({
      ...row,
      historical_answer_count: 0,
    })),
    summary: {
      total_values: values.length,
      active_values: values.filter((row) => row.is_active).length,
      inactive_values: values.filter((row) => !row.is_active).length,
      global_values: values.filter((row) => !row.product_group_id).length,
      product_group_values: values.filter((row) => Boolean(row.product_group_id)).length,
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

  const attributeId = cleanId(body.attribute_id);
  const productGroupId = cleanId(body.product_group_id) || null;
  if (!attributeId) {
    return reply({ ok: false, error: "Select the parent Materials Attribute." }, 400);
  }

  const value = cleanText(body.value);
  if (value.length < 1 || value.length > 120) {
    return reply({ ok: false, error: "Controlled Value must contain 1 to 120 characters." }, 400);
  }
  const slug = slugify(typeof body.slug === "string" ? body.slug : value);
  if (slug.length < 1 || slug.length > 120) {
    return reply({ ok: false, error: "A valid permanent Value key is required." }, 400);
  }
  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply({ ok: false, error: "Description must not exceed 600 characters." }, 400);
  }
  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply({ ok: false, error: "Sort order must be a whole number from 0 to 1000000." }, 400);
  }

  const context = await validateContext(access.admin, attributeId, productGroupId);
  if (context.error) return context.error;

  const inserted = await access.admin
    .from("material_attribute_values")
    .insert({
      attribute_id: attributeId,
      product_group_id: productGroupId,
      value,
      slug,
      description,
      sort_order: sortOrder,
      is_active: true,
      source: "admin",
    })
    .select("id,attribute_id,product_group_id,value,slug,description,sort_order,is_active,source,created_at,updated_at")
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

  const id = cleanId(body.id);
  if (!id) return reply({ ok: false, error: "Materials Value ID is required." }, 400);

  for (const field of ["attribute_id", "product_group_id", "slug"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return reply(
        { ok: false, error: "The permanent Value key, parent Attribute and Product Group scope are locked after creation." },
        400
      );
    }
  }

  const value = cleanText(body.value);
  if (value.length < 1 || value.length > 120) {
    return reply({ ok: false, error: "Controlled Value must contain 1 to 120 characters." }, 400);
  }
  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply({ ok: false, error: "Description must not exceed 600 characters." }, 400);
  }
  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null || typeof body.is_active !== "boolean") {
    return reply({ ok: false, error: "Valid sort order and lifecycle status are required." }, 400);
  }

  const existing = await access.admin
    .from("material_attribute_values")
    .select("id,attribute_id,product_group_id,slug,is_active")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (!existing.data) return reply({ ok: false, error: "The Materials Value was not found." }, 404);

  if (!existing.data.is_active && body.is_active === true) {
    const context = await validateContext(
      access.admin,
      existing.data.attribute_id,
      existing.data.product_group_id
    );
    if (context.error) return context.error;
  }

  // No Materials controlled-value answer table exists yet.
  // The catalogue record remains preserved through lifecycle deactivation.
  const updated = await access.admin
    .from("material_attribute_values")
    .update({
      value,
      description,
      sort_order: sortOrder,
      is_active: body.is_active,
    })
    .eq("id", id)
    .select("id,attribute_id,product_group_id,value,slug,description,sort_order,is_active,source,created_at,updated_at")
    .single();

  if (updated.error) return databaseError(updated.error);
  return reply({
    ok: true,
    action: body.is_active ? "updated" : "deactivated",
    permanent_key: existing.data.slug,
    permanent_attribute_id: existing.data.attribute_id,
    permanent_product_group_id: existing.data.product_group_id,
    data: updated.data,
  });
}
