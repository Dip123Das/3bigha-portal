import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type ValueRow = {
  id: string;
  attribute_id: string;
  service_taxon_id: string | null;
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
      {
        ok: false,
        error:
          "This controlled Services Value already exists under the selected Attribute and Service scope.",
      },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error: "The selected Services Attribute or individual Service no longer exists.",
      },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      {
        ok: false,
        error:
          error.message || "A permanent Services Value relationship cannot be changed.",
      },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Services Values operation failed." },
    400
  );
}

async function validateContext(
  supabase: SupabaseClient,
  attributeId: string,
  serviceTaxonId: string | null
) {
  const attribute = await supabase
    .from("service_attributes")
    .select("id,name,slug,input_type,is_active")
    .eq("id", attributeId)
    .maybeSingle();

  if (attribute.error) return { error: databaseError(attribute.error) };
  if (!attribute.data) {
    return {
      error: reply({ ok: false, error: "The selected Services Attribute was not found." }, 404),
    };
  }
  if (!attribute.data.is_active) {
    return {
      error: reply({ ok: false, error: "Select an active Services Attribute." }, 409),
    };
  }
  if (
    attribute.data.input_type !== "single_select" &&
    attribute.data.input_type !== "multi_select"
  ) {
    return {
      error: reply(
        {
          ok: false,
          error:
            "Controlled Values may only be created for one-choice or multiple-choice Services Attributes.",
        },
        409
      ),
    };
  }

  if (!serviceTaxonId) return { attribute: attribute.data, service: null };

  const service = await supabase
    .from("service_taxons")
    .select("id,name,slug,kind,is_active")
    .eq("id", serviceTaxonId)
    .maybeSingle();

  if (service.error) return { error: databaseError(service.error) };
  if (!service.data || service.data.kind !== "service") {
    return {
      error: reply({ ok: false, error: "The selected individual Service was not found." }, 404),
    };
  }
  if (!service.data.is_active) {
    return {
      error: reply({ ok: false, error: "Select an active individual Service." }, 409),
    };
  }

  return { attribute: attribute.data, service: service.data };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const supabase = access.admin;
  const [attributeResult, serviceResult, valueResult, answerResult] = await Promise.all([
    supabase
      .from("service_attributes")
      .select("id,name,slug,input_type,scope,is_active,sort_order")
      .in("input_type", ["single_select", "multi_select"])
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("service_taxons")
      .select("id,parent_id,name,slug,kind,is_active,sort_order")
      .eq("kind", "service")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("service_attribute_values")
      .select(
        "id,attribute_id,service_taxon_id,value,slug,description,sort_order,is_active,source,created_at,updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("value", { ascending: true }),
    supabase.from("provider_service_attribute_values").select("value_ids"),
  ]);

  const error =
    attributeResult.error || serviceResult.error || valueResult.error || answerResult.error;
  if (error) return databaseError(error);

  const historicalCounts: Record<string, number> = {};
  for (const answer of answerResult.data || []) {
    if (!Array.isArray(answer.value_ids)) continue;
    for (const valueId of answer.value_ids) {
      if (typeof valueId === "string") {
        historicalCounts[valueId] = (historicalCounts[valueId] || 0) + 1;
      }
    }
  }

  const values = (valueResult.data || []) as ValueRow[];
  return reply({
    ok: true,
    attributes: attributeResult.data || [],
    services: serviceResult.data || [],
    values: values.map((row) => ({
      ...row,
      historical_answer_count: historicalCounts[row.id] || 0,
    })),
    summary: {
      total_values: values.length,
      active_values: values.filter((row) => row.is_active).length,
      inactive_values: values.filter((row) => !row.is_active).length,
      global_values: values.filter((row) => !row.service_taxon_id).length,
      service_specific_values: values.filter((row) => Boolean(row.service_taxon_id)).length,
      historical_references: Object.values(historicalCounts).reduce(
        (total, count) => total + count,
        0
      ),
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
  const serviceTaxonId = cleanId(body.service_taxon_id) || null;
  if (!attributeId) {
    return reply({ ok: false, error: "Select the parent Services Attribute." }, 400);
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
    return reply(
      { ok: false, error: "Sort order must be a whole number from 0 to 1000000." },
      400
    );
  }

  const context = await validateContext(access.admin, attributeId, serviceTaxonId);
  if (context.error) return context.error;

  const inserted = await access.admin
    .from("service_attribute_values")
    .insert({
      attribute_id: attributeId,
      service_taxon_id: serviceTaxonId,
      value,
      slug,
      description,
      sort_order: sortOrder,
      is_active: true,
      source: "admin",
    })
    .select(
      "id,attribute_id,service_taxon_id,value,slug,description,sort_order,is_active,source,created_at,updated_at"
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

  const id = cleanId(body.id);
  if (!id) return reply({ ok: false, error: "Services Value ID is required." }, 400);

  for (const field of ["attribute_id", "service_taxon_id", "slug"]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return reply(
        {
          ok: false,
          error:
            "The permanent Value key, parent Attribute and Service scope are locked after creation.",
        },
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
    .from("service_attribute_values")
    .select("id,attribute_id,service_taxon_id,slug,is_active")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) return databaseError(existing.error);
  if (!existing.data) {
    return reply({ ok: false, error: "The Services Value was not found." }, 404);
  }

  if (!existing.data.is_active && body.is_active === true) {
    const context = await validateContext(
      access.admin,
      existing.data.attribute_id,
      existing.data.service_taxon_id
    );
    if (context.error) return context.error;
  }

  const updated = await access.admin
    .from("service_attribute_values")
    .update({
      value,
      description,
      sort_order: sortOrder,
      is_active: body.is_active,
    })
    .eq("id", id)
    .select(
      "id,attribute_id,service_taxon_id,value,slug,description,sort_order,is_active,source,created_at,updated_at"
    )
    .single();

  if (updated.error) return databaseError(updated.error);
  return reply({
    ok: true,
    action: body.is_active ? "updated" : "deactivated",
    permanent_key: existing.data.slug,
    permanent_attribute_id: existing.data.attribute_id,
    permanent_service_taxon_id: existing.data.service_taxon_id,
    data: updated.data,
  });
}
