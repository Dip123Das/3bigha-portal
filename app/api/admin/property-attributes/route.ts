import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

const inputTypes = [
  "text",
  "number",
  "boolean",
  "single_select",
  "multi_select",
] as const;

type InputType = (typeof inputTypes)[number];

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function cleanName(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
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
  if (!Number.isInteger(number) || number < 0 || number > 1000000) {
    return null;
  }

  return number;
}

function validInputType(value: unknown): value is InputType {
  return inputTypes.includes(value as InputType);
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
          "An attribute with the same name or permanent key already exists.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "This attribute is connected to other property data and cannot be changed in that way.",
      },
      409
    );
  }

  return reply(
    {
      ok: false,
      error: error.message || "The attribute operation failed.",
    },
    400
  );
}

async function usageCounts(
  supabase: SupabaseClient,
  attributeId?: string
) {
  let valuesQuery = supabase
    .from("property_attribute_values")
    .select("id,attribute_id");

  let mappingsQuery = supabase
    .from("property_subtype_attributes")
    .select("subtype_id,attribute_id");

  let answersQuery = supabase
    .from("property_listing_attributes")
    .select("listing_id,attribute_id");

  if (attributeId) {
    valuesQuery = valuesQuery.eq("attribute_id", attributeId);
    mappingsQuery = mappingsQuery.eq("attribute_id", attributeId);
    answersQuery = answersQuery.eq("attribute_id", attributeId);
  }

  const [valuesResult, mappingsResult, answersResult] = await Promise.all([
    valuesQuery,
    mappingsQuery,
    answersQuery,
  ]);

  const error =
    valuesResult.error || mappingsResult.error || answersResult.error;

  if (error) throw error;

  return {
    values: valuesResult.data || [],
    mappings: mappingsResult.data || [],
    answers: answersResult.data || [],
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  const supabase = access.admin;

  const [attributeResult, usage] = await Promise.all([
    supabase
      .from("property_attributes")
      .select(
        "id,name,slug,description,input_type,unit,sort_order,is_active,created_at,updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    usageCounts(supabase),
  ]);

  if (attributeResult.error) return databaseError(attributeResult.error);

  const valueCounts: Record<string, number> = {};
  const mappingCounts: Record<string, number> = {};
  const answerCounts: Record<string, number> = {};

  for (const row of usage.values) {
    valueCounts[row.attribute_id] = (valueCounts[row.attribute_id] || 0) + 1;
  }

  for (const row of usage.mappings) {
    mappingCounts[row.attribute_id] =
      (mappingCounts[row.attribute_id] || 0) + 1;
  }

  for (const row of usage.answers) {
    answerCounts[row.attribute_id] =
      (answerCounts[row.attribute_id] || 0) + 1;
  }

  return reply({
    ok: true,
    attributes: (attributeResult.data || []).map((row) => ({
      ...row,
      value_count: valueCounts[row.id] || 0,
      mapping_count: mappingCounts[row.id] || 0,
      listing_answer_count: answerCounts[row.id] || 0,
    })),
  });
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "A valid JSON request is required." }, 400);
  }

  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply(
      { ok: false, error: "Name must contain 2 to 120 characters." },
      400
    );
  }

  const slug = slugify(typeof body.slug === "string" ? body.slug : name);
  if (slug.length < 2 || slug.length > 120) {
    return reply(
      { ok: false, error: "A valid permanent key is required." },
      400
    );
  }

  if (!validInputType(body.input_type)) {
    return reply({ ok: false, error: "Select a valid input type." }, 400);
  }

  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply(
      { ok: false, error: "Description must not exceed 600 characters." },
      400
    );
  }

  const unit = cleanUnit(body.unit);
  if (unit && unit.length > 30) {
    return reply(
      { ok: false, error: "Unit must not exceed 30 characters." },
      400
    );
  }

  if (body.input_type !== "number" && unit) {
    return reply(
      { ok: false, error: "Only number attributes may have a unit." },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply(
      {
        ok: false,
        error: "Sort order must be a whole number from 0 to 1000000.",
      },
      400
    );
  }

  const { data, error } = await access.admin
    .from("property_attributes")
    .insert({
      name,
      slug,
      description,
      input_type: body.input_type,
      unit,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    })
    .select(
      "id,name,slug,description,input_type,unit,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply(
    {
      ok: true,
      action: "created",
      data: {
        ...data,
        value_count: 0,
        mapping_count: 0,
        listing_answer_count: 0,
      },
    },
    201
  );
}

export async function PATCH(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "A valid JSON request is required." }, 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return reply({ ok: false, error: "Attribute ID is required." }, 400);
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

  const name = cleanName(body.name);
  if (name.length < 2 || name.length > 120) {
    return reply(
      { ok: false, error: "Name must contain 2 to 120 characters." },
      400
    );
  }

  if (!validInputType(body.input_type)) {
    return reply({ ok: false, error: "Select a valid input type." }, 400);
  }

  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply(
      { ok: false, error: "Description must not exceed 600 characters." },
      400
    );
  }

  const unit = cleanUnit(body.unit);
  if (unit && unit.length > 30) {
    return reply(
      { ok: false, error: "Unit must not exceed 30 characters." },
      400
    );
  }

  if (body.input_type !== "number" && unit) {
    return reply(
      { ok: false, error: "Only number attributes may have a unit." },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply(
      {
        ok: false,
        error: "Sort order must be a whole number from 0 to 1000000.",
      },
      400
    );
  }

  const supabase = access.admin;

  const { data: existing, error: existingError } = await supabase
    .from("property_attributes")
    .select("id,slug,input_type,unit")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return databaseError(existingError);
  if (!existing) {
    return reply({ ok: false, error: "Attribute was not found." }, 404);
  }

  let usage;

  try {
    usage = await usageCounts(supabase, id);
  } catch (error) {
    return databaseError(error as { code?: string; message?: string });
  }

  const valueCount = usage.values.length;
  const mappingCount = usage.mappings.length;
  const listingAnswerCount = usage.answers.length;
  const connected = valueCount + mappingCount + listingAnswerCount > 0;

  if (connected && body.input_type !== existing.input_type) {
    return reply(
      {
        ok: false,
        error:
          "Input type is locked because this attribute already has values, mappings or listing answers.",
      },
      409
    );
  }

  if (
    listingAnswerCount > 0 &&
    (unit || null) !== (existing.unit || null)
  ) {
    return reply(
      {
        ok: false,
        error:
          "Unit is locked because existing listing answers depend on it.",
      },
      409
    );
  }

  const { data, error } = await supabase
    .from("property_attributes")
    .update({
      name,
      description,
      input_type: body.input_type,
      unit,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    })
    .eq("id", id)
    .select(
      "id,name,slug,description,input_type,unit,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply({
    ok: true,
    action: "updated",
    permanent_key: existing.slug,
    data: {
      ...data,
      value_count: valueCount,
      mapping_count: mappingCount,
      listing_answer_count: listingAnswerCount,
    },
  });
}
