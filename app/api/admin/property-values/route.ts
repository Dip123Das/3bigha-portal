import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

const selectInputTypes = ["single_select", "multi_select"] as const;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function cleanLabel(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description || null;
}

function cleanSortOrder(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return 1000;
  }

  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number > 1000000
  ) {
    return null;
  }

  return number;
}

function databaseError(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (error.code === "23505") {
    return reply(
      {
        ok: false,
        error:
          "A value with the same label or permanent key already exists for this attribute.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "This value is connected to property data and cannot be changed in that way.",
      },
      409
    );
  }

  return reply(
    {
      ok: false,
      error: error.message || "The property value operation failed.",
    },
    400
  );
}

async function requireSelectAttribute(
  supabase: SupabaseClient,
  attributeId: string
) {
  const { data, error } = await supabase
    .from("property_attributes")
    .select(
      "id,name,slug,description,input_type,sort_order,is_active"
    )
    .eq("id", attributeId)
    .maybeSingle();

  if (error) throw error;

  if (
    !data ||
    !selectInputTypes.includes(
      data.input_type as (typeof selectInputTypes)[number]
    )
  ) {
    return null;
  }

  return data;
}

async function valueUsage(
  supabase: SupabaseClient,
  valueId?: string
) {
  let mappingQuery = supabase
    .from("property_subtype_attribute_values")
    .select("subtype_id,attribute_id,value_id");

  if (valueId) {
    mappingQuery = mappingQuery.eq("value_id", valueId);
  }

  const [mappingResult, answerResult] = await Promise.all([
    mappingQuery,
    supabase
      .from("property_listing_attributes")
      .select("listing_id,attribute_id,value_ids")
      .not("value_ids", "is", null),
  ]);

  if (mappingResult.error) throw mappingResult.error;
  if (answerResult.error) throw answerResult.error;

  const answerReferences: Array<{
    listing_id: string;
    attribute_id: string;
    value_id: string;
  }> = [];

  for (const answer of answerResult.data || []) {
    const valueIds = Array.isArray(answer.value_ids)
      ? answer.value_ids
      : [];

    for (const answerValueId of valueIds) {
      if (!valueId || answerValueId === valueId) {
        answerReferences.push({
          listing_id: answer.listing_id,
          attribute_id: answer.attribute_id,
          value_id: answerValueId,
        });
      }
    }
  }

  return {
    mappings: mappingResult.data || [],
    answers: answerReferences,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      { ok: false, error: access.error },
      access.status
    );
  }

  const supabase = access.admin;

  try {
    const [attributeResult, valueResult, usage] =
      await Promise.all([
        supabase
          .from("property_attributes")
          .select(
            "id,name,slug,description,input_type,sort_order,is_active"
          )
          .in("input_type", [...selectInputTypes])
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("property_attribute_values")
          .select(
            "id,attribute_id,value,slug,description,sort_order,is_active,created_at,updated_at"
          )
          .order("sort_order", { ascending: true })
          .order("value", { ascending: true }),

        valueUsage(supabase),
      ]);

    if (attributeResult.error) {
      return databaseError(attributeResult.error);
    }

    if (valueResult.error) {
      return databaseError(valueResult.error);
    }

    const mappingCounts: Record<string, number> = {};
    const answerCounts: Record<string, number> = {};

    for (const mapping of usage.mappings) {
      mappingCounts[mapping.value_id] =
        (mappingCounts[mapping.value_id] || 0) + 1;
    }

    for (const answer of usage.answers) {
      answerCounts[answer.value_id] =
        (answerCounts[answer.value_id] || 0) + 1;
    }

    return reply({
      ok: true,
      attributes: attributeResult.data || [],
      values: (valueResult.data || []).map((value) => ({
        ...value,
        subtype_mapping_count: mappingCounts[value.id] || 0,
        listing_answer_count: answerCounts[value.id] || 0,
      })),
    });
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      { ok: false, error: access.error },
      access.status
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return reply(
      { ok: false, error: "A valid JSON request is required." },
      400
    );
  }

  const attributeId =
    typeof body.attribute_id === "string"
      ? body.attribute_id.trim()
      : "";

  if (!attributeId) {
    return reply(
      { ok: false, error: "Select attribute is required." },
      400
    );
  }

  let attribute;

  try {
    attribute = await requireSelectAttribute(
      access.admin,
      attributeId
    );
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }

  if (!attribute) {
    return reply(
      {
        ok: false,
        error:
          "The selected attribute does not accept controlled values.",
      },
      400
    );
  }

  const value = cleanLabel(body.value);

  if (value.length < 1 || value.length > 120) {
    return reply(
      {
        ok: false,
        error: "Value label must contain 1 to 120 characters.",
      },
      400
    );
  }

  const slug = slugify(
    typeof body.slug === "string" ? body.slug : value
  );

  if (slug.length < 1 || slug.length > 120) {
    return reply(
      { ok: false, error: "A valid permanent key is required." },
      400
    );
  }

  const description = cleanDescription(body.description);

  if (description && description.length > 600) {
    return reply(
      {
        ok: false,
        error: "Description must not exceed 600 characters.",
      },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);

  if (sortOrder === null) {
    return reply(
      {
        ok: false,
        error:
          "Sort order must be a whole number from 0 to 1000000.",
      },
      400
    );
  }

  const { data, error } = await access.admin
    .from("property_attribute_values")
    .insert({
      attribute_id: attributeId,
      value,
      slug,
      description,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    })
    .select(
      "id,attribute_id,value,slug,description,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply(
    {
      ok: true,
      action: "created",
      attribute,
      data: {
        ...data,
        subtype_mapping_count: 0,
        listing_answer_count: 0,
      },
    },
    201
  );
}

export async function PATCH(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      { ok: false, error: access.error },
      access.status
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return reply(
      { ok: false, error: "A valid JSON request is required." },
      400
    );
  }

  const id =
    typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return reply(
      { ok: false, error: "Property value ID is required." },
      400
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    return reply(
      {
        ok: false,
        error: "The permanent key is locked and cannot be edited.",
      },
      400
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "attribute_id")
  ) {
    return reply(
      {
        ok: false,
        error:
          "The parent attribute is locked and cannot be changed.",
      },
      400
    );
  }

  const value = cleanLabel(body.value);

  if (value.length < 1 || value.length > 120) {
    return reply(
      {
        ok: false,
        error: "Value label must contain 1 to 120 characters.",
      },
      400
    );
  }

  const description = cleanDescription(body.description);

  if (description && description.length > 600) {
    return reply(
      {
        ok: false,
        error: "Description must not exceed 600 characters.",
      },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);

  if (sortOrder === null) {
    return reply(
      {
        ok: false,
        error:
          "Sort order must be a whole number from 0 to 1000000.",
      },
      400
    );
  }

  const supabase = access.admin;

  const { data: existing, error: existingError } =
    await supabase
      .from("property_attribute_values")
      .select("id,attribute_id,slug")
      .eq("id", id)
      .maybeSingle();

  if (existingError) return databaseError(existingError);

  if (!existing) {
    return reply(
      { ok: false, error: "Property value was not found." },
      404
    );
  }

  let usage;

  try {
    usage = await valueUsage(supabase, id);
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }

  const { data, error } = await supabase
    .from("property_attribute_values")
    .update({
      value,
      description,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    })
    .eq("id", id)
    .select(
      "id,attribute_id,value,slug,description,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply({
    ok: true,
    action: "updated",
    permanent_key: existing.slug,
    parent_attribute_id: existing.attribute_id,
    data: {
      ...data,
      subtype_mapping_count: usage.mappings.length,
      listing_answer_count: usage.answers.length,
    },
  });
}
