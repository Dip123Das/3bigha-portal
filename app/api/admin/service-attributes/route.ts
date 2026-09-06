import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

const INPUT_TYPES = [
  "text",
  "number",
  "boolean",
  "single_select",
  "multi_select",
] as const;
const SCOPES = ["global", "product_specific"] as const;

type InputType = (typeof INPUT_TYPES)[number];
type Scope = (typeof SCOPES)[number];

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: InputType;
  unit: string | null;
  scope: Scope;
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

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description || null;
}

function cleanUnit(value: unknown) {
  if (typeof value !== "string") return null;
  const unit = value.trim().replace(/\s+/g, " ");
  return unit || null;
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

function validInputType(value: unknown): value is InputType {
  return typeof value === "string" && INPUT_TYPES.includes(value as InputType);
}

function validScope(value: unknown): value is Scope {
  return typeof value === "string" && SCOPES.includes(value as Scope);
}

function databaseError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "23505") {
    return reply(
      { ok: false, error: "A Services Attribute with this name or permanent key already exists." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "This Services Attribute is connected to preserved data and cannot be changed in that way." },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      { ok: false, error: error.message || "A permanent Services Attribute identity cannot be changed." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Services Attributes operation failed." },
    400
  );
}

function increment(counts: Record<string, number>, id: string | null | undefined) {
  if (id) counts[id] = (counts[id] || 0) + 1;
}

async function dependencyCounts(
  supabase: SupabaseClient,
  attributeId?: string
) {
  let directMappings = supabase
    .from("service_attribute_mappings")
    .select("attribute_id");
  let productGroupMappings = supabase
    .from("service_product_group_attributes")
    .select("attribute_id");
  let values = supabase
    .from("service_attribute_values")
    .select("attribute_id,is_active");
  let answers = supabase
    .from("provider_service_attribute_values")
    .select("attribute_id");

  if (attributeId) {
    directMappings = directMappings.eq("attribute_id", attributeId);
    productGroupMappings = productGroupMappings.eq("attribute_id", attributeId);
    values = values.eq("attribute_id", attributeId);
    answers = answers.eq("attribute_id", attributeId);
  }

  const [directMappingResult, productGroupMappingResult, valueResult, answerResult] =
    await Promise.all([directMappings, productGroupMappings, values, answers]);

  return {
    directMappingResult,
    productGroupMappingResult,
    valueResult,
    answerResult,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const supabase = access.admin;
  const [attributeResult, dependencies] = await Promise.all([
    supabase
      .from("service_attributes")
      .select(
        "id,name,slug,description,input_type,unit,scope,sort_order,is_active,source,created_at,updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    dependencyCounts(supabase),
  ]);

  const error =
    attributeResult.error ||
    dependencies.directMappingResult.error ||
    dependencies.productGroupMappingResult.error ||
    dependencies.valueResult.error ||
    dependencies.answerResult.error;
  if (error) return databaseError(error);

  const directMappingCounts: Record<string, number> = {};
  const productGroupMappingCounts: Record<string, number> = {};
  const valueCounts: Record<string, number> = {};
  const activeValueCounts: Record<string, number> = {};
  const answerCounts: Record<string, number> = {};

  for (const row of dependencies.directMappingResult.data || []) {
    increment(directMappingCounts, row.attribute_id);
  }
  for (const row of dependencies.productGroupMappingResult.data || []) {
    increment(productGroupMappingCounts, row.attribute_id);
  }
  for (const row of dependencies.valueResult.data || []) {
    increment(valueCounts, row.attribute_id);
    if (row.is_active !== false) increment(activeValueCounts, row.attribute_id);
  }
  for (const row of dependencies.answerResult.data || []) {
    increment(answerCounts, row.attribute_id);
  }

  const attributes = (attributeResult.data || []) as AttributeRow[];
  return reply({
    ok: true,
    attributes: attributes.map((attribute) => ({
      ...attribute,
      direct_mapping_count: directMappingCounts[attribute.id] || 0,
      product_group_mapping_count: productGroupMappingCounts[attribute.id] || 0,
      mapping_count:
        (directMappingCounts[attribute.id] || 0) +
        (productGroupMappingCounts[attribute.id] || 0),
      value_count: valueCounts[attribute.id] || 0,
      active_value_count: activeValueCounts[attribute.id] || 0,
      historical_answer_count: answerCounts[attribute.id] || 0,
    })),
    summary: {
      total_attributes: attributes.length,
      active_attributes: attributes.filter((row) => row.is_active).length,
      inactive_attributes: attributes.filter((row) => !row.is_active).length,
      global_attributes: attributes.filter((row) => row.scope === "global").length,
      product_specific_attributes: attributes.filter(
        (row) => row.scope === "product_specific"
      ).length,
      numeric_attributes: attributes.filter((row) => row.input_type === "number").length,
      controlled_choice_attributes: attributes.filter(
        (row) => row.input_type === "single_select" || row.input_type === "multi_select"
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

  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply({ ok: false, error: "Attribute name must contain 2 to 120 characters." }, 400);
  }

  const forbiddenName = /\b(price|pricing|availability|owner|ownership|address|contact|phone|email|listing title|provider name)\b/i;
  if (forbiddenName.test(name)) {
    return reply(
      { ok: false, error: "Use a reusable service question, not pricing, availability, ownership, contact or listing information." },
      400
    );
  }

  if (!validInputType(body.input_type)) {
    return reply({ ok: false, error: "Select a valid Services Attribute answer type." }, 400);
  }
  if (!validScope(body.scope)) {
    return reply({ ok: false, error: "Select Global or Product-specific scope." }, 400);
  }

  const slug = slugify(typeof body.slug === "string" ? body.slug : name);
  if (slug.length < 2 || slug.length > 120) {
    return reply({ ok: false, error: "A valid permanent key is required." }, 400);
  }

  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply({ ok: false, error: "Description must not exceed 600 characters." }, 400);
  }

  const unit = cleanUnit(body.unit);
  if (body.input_type === "number" && !unit) {
    return reply({ ok: false, error: "A measurable numeric Services Attribute requires an accurate unit." }, 400);
  }
  if (body.input_type !== "number" && unit) {
    return reply({ ok: false, error: "Only numeric Services Attributes may have a unit." }, 400);
  }
  if (unit && unit.length > 30) {
    return reply({ ok: false, error: "Unit must not exceed 30 characters." }, 400);
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply({ ok: false, error: "Sort order must be a whole number from 0 to 1000000." }, 400);
  }

  const inserted = await access.admin
    .from("service_attributes")
    .insert({
      name,
      slug,
      description,
      input_type: body.input_type,
      unit,
      scope: body.scope,
      sort_order: sortOrder,
      is_active: true,
      source: "admin",
    })
    .select(
      "id,name,slug,description,input_type,unit,scope,sort_order,is_active,source,created_at,updated_at"
    )
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
  if (!id) return reply({ ok: false, error: "Services Attribute ID is required." }, 400);

  for (const field of ["slug", "input_type", "unit", "scope"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return reply(
        { ok: false, error: "The permanent key, answer type, unit and scope are locked after creation." },
        400
      );
    }
  }

  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply({ ok: false, error: "Attribute name must contain 2 to 120 characters." }, 400);
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
    .from("service_attributes")
    .select("id,slug,input_type,unit,scope,is_active")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (!existing.data) return reply({ ok: false, error: "The Services Attribute was not found." }, 404);

  if (existing.data.is_active && body.is_active === false) {
    const dependencies = await dependencyCounts(access.admin, id);
    const error =
      dependencies.directMappingResult.error ||
      dependencies.productGroupMappingResult.error ||
      dependencies.valueResult.error ||
      dependencies.answerResult.error;
    if (error) return databaseError(error);

    const directMappingCount = dependencies.directMappingResult.data?.length || 0;
    const productGroupMappingCount =
      dependencies.productGroupMappingResult.data?.length || 0;
    const valueCount = dependencies.valueResult.data?.length || 0;
    const answerCount = dependencies.answerResult.data?.length || 0;
    if (directMappingCount || productGroupMappingCount || valueCount || answerCount) {
      return reply(
        {
          ok: false,
          error: `This Attribute has ${directMappingCount} direct mapping(s), ${productGroupMappingCount} product-group mapping(s), ${valueCount} controlled value(s) and ${answerCount} historical answer(s). Deactivate connected records first; preserved history cannot be deleted.`,
        },
        409
      );
    }
  }

  const updated = await access.admin
    .from("service_attributes")
    .update({
      name,
      description,
      sort_order: sortOrder,
      is_active: body.is_active,
    })
    .eq("id", id)
    .select(
      "id,name,slug,description,input_type,unit,scope,sort_order,is_active,source,created_at,updated_at"
    )
    .single();

  if (updated.error) return databaseError(updated.error);
  return reply({
    ok: true,
    action: body.is_active ? "updated" : "deactivated",
    permanent_key: existing.data.slug,
    permanent_input_type: existing.data.input_type,
    permanent_unit: existing.data.unit,
    permanent_scope: existing.data.scope,
    data: updated.data,
  });
}
