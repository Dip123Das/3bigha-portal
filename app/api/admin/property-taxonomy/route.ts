import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type TaxonomyKind = "type" | "subtype";

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
  if (!Number.isInteger(number) || number < 0 || number > 1000000) {
    return null;
  }
  return number;
}

function validKind(value: unknown): value is TaxonomyKind {
  return value === "type" || value === "subtype";
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
          "A taxonomy entry with the same name or permanent key already exists.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "This taxonomy entry is connected to other property data and cannot be changed in that way.",
      },
      409
    );
  }

  return reply(
    {
      ok: false,
      error: error.message || "The taxonomy operation failed.",
    },
    400
  );
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  const supabase = access.admin;

  const [typeResult, subtypeResult, listingResult, mappingResult] =
    await Promise.all([
      supabase
        .from("property_types")
        .select(
          "id,name,slug,description,sort_order,is_active,created_at,updated_at"
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("property_subtypes")
        .select(
          "id,type_id,name,slug,description,sort_order,is_active,created_at,updated_at"
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("property_listings")
        .select("id,type_id,subtype_id"),

      supabase
        .from("property_subtype_attributes")
        .select("subtype_id,attribute_id"),
    ]);

  const error =
    typeResult.error ||
    subtypeResult.error ||
    listingResult.error ||
    mappingResult.error;

  if (error) return databaseError(error);

  const typeUsage: Record<string, number> = {};
  const subtypeUsage: Record<string, number> = {};
  const subtypeMappings: Record<string, number> = {};

  for (const row of listingResult.data || []) {
    if (row.type_id) {
      typeUsage[row.type_id] = (typeUsage[row.type_id] || 0) + 1;
    }
    if (row.subtype_id) {
      subtypeUsage[row.subtype_id] =
        (subtypeUsage[row.subtype_id] || 0) + 1;
    }
  }

  for (const row of mappingResult.data || []) {
    if (row.subtype_id) {
      subtypeMappings[row.subtype_id] =
        (subtypeMappings[row.subtype_id] || 0) + 1;
    }
  }

  return reply({
    ok: true,
    types: (typeResult.data || []).map((row) => ({
      ...row,
      listing_count: typeUsage[row.id] || 0,
      subtype_count: (subtypeResult.data || []).filter(
        (subtype) => subtype.type_id === row.id
      ).length,
    })),
    subtypes: (subtypeResult.data || []).map((row) => ({
      ...row,
      listing_count: subtypeUsage[row.id] || 0,
      mapping_count: subtypeMappings[row.id] || 0,
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

  if (!validKind(body.kind)) {
    return reply({ ok: false, error: "Select Type or Subtype." }, 400);
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

  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply(
      { ok: false, error: "Description must not exceed 600 characters." },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply(
      { ok: false, error: "Sort order must be a whole number from 0 to 1000000." },
      400
    );
  }

  const supabase = access.admin;

  if (body.kind === "type") {
    const { data, error } = await supabase
      .from("property_types")
      .insert({
        name,
        slug,
        description,
        sort_order: sortOrder,
        is_active: body.is_active !== false,
      })
      .select(
        "id,name,slug,description,sort_order,is_active,created_at,updated_at"
      )
      .single();

    if (error) return databaseError(error);
    return reply({ ok: true, action: "created", kind: "type", data }, 201);
  }

  const typeId = typeof body.type_id === "string" ? body.type_id.trim() : "";
  if (!typeId) {
    return reply(
      { ok: false, error: "Select the parent property type." },
      400
    );
  }

  const { data: parent } = await supabase
    .from("property_types")
    .select("id")
    .eq("id", typeId)
    .maybeSingle();

  if (!parent) {
    return reply({ ok: false, error: "Parent property type was not found." }, 404);
  }

  const { data, error } = await supabase
    .from("property_subtypes")
    .insert({
      type_id: typeId,
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
    })
    .select(
      "id,type_id,name,slug,description,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);
  return reply({ ok: true, action: "created", kind: "subtype", data }, 201);
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

  if (!validKind(body.kind)) {
    return reply({ ok: false, error: "Select Type or Subtype." }, 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return reply({ ok: false, error: "Entry ID is required." }, 400);

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

  const description = cleanDescription(body.description);
  if (description && description.length > 600) {
    return reply(
      { ok: false, error: "Description must not exceed 600 characters." },
      400
    );
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (sortOrder === null) {
    return reply(
      { ok: false, error: "Sort order must be a whole number from 0 to 1000000." },
      400
    );
  }

  const supabase = access.admin;
  const table =
    body.kind === "type" ? "property_types" : "property_subtypes";

  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select("id,slug")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return databaseError(existingError);
  if (!existing) {
    return reply({ ok: false, error: "Taxonomy entry was not found." }, 404);
  }

  const payload = {
    name,
    description,
    sort_order: sortOrder,
    is_active: body.is_active !== false,
  };

  const columns =
    body.kind === "type"
      ? "id,name,slug,description,sort_order,is_active,created_at,updated_at"
      : "id,type_id,name,slug,description,sort_order,is_active,created_at,updated_at";

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select(columns)
    .single();

  if (error) return databaseError(error);

  return reply({
    ok: true,
    action: "updated",
    kind: body.kind,
    permanent_key: existing.slug,
    data,
  });
}
