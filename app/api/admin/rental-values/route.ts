import { NextResponse } from "next/server";
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

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return null;
  const description = value.trim();
  return description || null;
}

function cleanId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  )
    ? id
    : "";
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function cleanSortOrder(value: unknown) {
  if (value === "" || value === null || value === undefined) return 1000;

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0 || number > 1000000) {
    return null;
  }

  return number;
}

function databaseError(error: DatabaseError) {
  if (error.code === "23505") {
    return reply(
      {
        ok: false,
        error:
          "This rental attribute already has a value with the same label or permanent key.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "This value is connected to protected rental data and cannot be changed in that way.",
      },
      409
    );
  }

  if (error.code === "22023") {
    return reply(
      {
        ok: false,
        error:
          error.message ||
          "The permanent Rental Value identity cannot be changed.",
      },
      409
    );
  }

  return reply(
    {
      ok: false,
      error: error.message || "The Rental Value operation failed.",
    },
    400
  );
}

async function readBody(request: Request) {
  const raw = await request.text();

  if (raw.length > 12000) {
    return {
      error: reply({ ok: false, error: "Request is too long." }, 413),
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        error: reply(
          { ok: false, error: "A JSON object is required." },
          400
        ),
      };
    }

    return { body: parsed as Record<string, unknown> };
  } catch {
    return {
      error: reply(
        { ok: false, error: "A valid JSON request is required." },
        400
      ),
    };
  }
}

async function findAttribute(supabase: any, attributeId: string) {
  return supabase
    .from("rental_attributes")
    .select("id,name,slug,input_type,is_active")
    .eq("id", attributeId)
    .maybeSingle();
}

function validateValueInput(body: Record<string, unknown>) {
  const value = cleanText(body.value);

  if (value.length < 1 || value.length > 120) {
    return {
      error: reply(
        {
          ok: false,
          error: "Value label must contain 1 to 120 characters.",
        },
        400
      ),
    };
  }

  const description = cleanDescription(body.description);

  if (description && description.length > 600) {
    return {
      error: reply(
        {
          ok: false,
          error: "Description must not exceed 600 characters.",
        },
        400
      ),
    };
  }

  const sortOrder = cleanSortOrder(body.sort_order);

  if (sortOrder === null) {
    return {
      error: reply(
        {
          ok: false,
          error: "Sort order must be a whole number from 0 to 1000000.",
        },
        400
      ),
    };
  }

  return {
    value,
    description,
    sortOrder,
    isActive: body.is_active !== false,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  const supabase: any = access.admin;

  const [attributeResult, valueResult] = await Promise.all([
    supabase
      .from("rental_attributes")
      .select(
        "id,name,slug,input_type,is_active,sort_order"
      )
      .in("input_type", ["single_select", "multi_select"])
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("rental_attribute_values")
      .select(
        "id,attribute_id,value,slug,description,sort_order,is_active,created_at,updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("value", { ascending: true }),
  ]);

  if (attributeResult.error) {
    return databaseError(attributeResult.error);
  }

  if (valueResult.error) {
    return databaseError(valueResult.error);
  }

  const values = (valueResult.data || []).map((row: any) => ({
    ...row,
    mapping_count: 0,
    listing_answer_count: 0,
    dependency_count: 0,
  }));

  const valueCounts: Record<string, number> = {};
  const activeValueCounts: Record<string, number> = {};

  for (const row of values) {
    valueCounts[row.attribute_id] =
      (valueCounts[row.attribute_id] || 0) + 1;

    if (row.is_active) {
      activeValueCounts[row.attribute_id] =
        (activeValueCounts[row.attribute_id] || 0) + 1;
    }
  }

  return reply({
    ok: true,
    attributes: (attributeResult.data || []).map((row: any) => ({
      ...row,
      value_count: valueCounts[row.id] || 0,
      active_value_count: activeValueCounts[row.id] || 0,
    })),
    values,
    totals: {
      attributes: (attributeResult.data || []).length,
      values: values.length,
      active_values: values.filter((row: any) => row.is_active).length,
      inactive_values: values.filter((row: any) => !row.is_active).length,
    },
    scope: "global_attribute_values",
    product_group_scoped_values_supported: false,
  });
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply({ ok: false, error: access.error }, access.status);
  }

  const parsed = await readBody(request);
  if (parsed.error) return parsed.error;

  const body = parsed.body!;
  const attributeId = cleanId(body.attribute_id);

  if (!attributeId) {
    return reply(
      { ok: false, error: "Select a valid parent rental attribute." },
      400
    );
  }

  const validated = validateValueInput(body);
  if (validated.error) return validated.error;

  const slug = slugify(
    typeof body.slug === "string" ? body.slug : validated.value
  );

  if (slug.length < 1 || slug.length > 120) {
    return reply(
      { ok: false, error: "A valid permanent key is required." },
      400
    );
  }

  const supabase: any = access.admin;
  const attributeResult = await findAttribute(supabase, attributeId);

  if (attributeResult.error) {
    return databaseError(attributeResult.error);
  }

  if (!attributeResult.data) {
    return reply(
      { ok: false, error: "The parent rental attribute was not found." },
      404
    );
  }

  if (
    attributeResult.data.input_type !== "single_select" &&
    attributeResult.data.input_type !== "multi_select"
  ) {
    return reply(
      {
        ok: false,
        error:
          "Controlled values may only be added to single-select or multi-select attributes.",
      },
      409
    );
  }

  if (!attributeResult.data.is_active) {
    return reply(
      {
        ok: false,
        error:
          "Activate the parent rental attribute before adding a value.",
      },
      409
    );
  }

  const { data, error } = await supabase
    .from("rental_attribute_values")
    .insert({
      attribute_id: attributeId,
      value: validated.value,
      slug,
      description: validated.description,
      sort_order: validated.sortOrder,
      is_active: validated.isActive,
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
      parent_attribute_id: attributeId,
      parent_attribute_name: attributeResult.data.name,
      databaseWritePerformed: true,
      data: {
        ...data,
        mapping_count: 0,
        listing_answer_count: 0,
        dependency_count: 0,
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

  const parsed = await readBody(request);
  if (parsed.error) return parsed.error;

  const body = parsed.body!;
  const id = cleanId(body.id);

  if (!id) {
    return reply({ ok: false, error: "Rental Value ID is required." }, 400);
  }

  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    return reply(
      {
        ok: false,
        error: "The permanent key is locked and cannot be edited.",
      },
      409
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "attribute_id")) {
    return reply(
      {
        ok: false,
        error:
          "The parent rental attribute is locked and cannot be changed.",
      },
      409
    );
  }

  const validated = validateValueInput(body);
  if (validated.error) return validated.error;

  const supabase: any = access.admin;

  const { data: existing, error: existingError } = await supabase
    .from("rental_attribute_values")
    .select(
      "id,attribute_id,value,slug,description,sort_order,is_active"
    )
    .eq("id", id)
    .maybeSingle();

  if (existingError) return databaseError(existingError);

  if (!existing) {
    return reply({ ok: false, error: "Rental Value was not found." }, 404);
  }

  const attributeResult = await findAttribute(
    supabase,
    existing.attribute_id
  );

  if (attributeResult.error) {
    return databaseError(attributeResult.error);
  }

  if (!attributeResult.data) {
    return reply(
      {
        ok: false,
        error: "The permanent parent rental attribute was not found.",
      },
      409
    );
  }

  const lifecycleChanging =
    validated.isActive !== existing.is_active;

  if (lifecycleChanging && body.confirm_lifecycle !== true) {
    return reply(
      {
        ok: false,
        requires_confirmation: true,
        error:
          validated.isActive
            ? "Review the dependency counts before activating this value."
            : "Review the dependency counts before deactivating this value.",
        lifecycle: validated.isActive ? "activate" : "deactivate",
        value_id: existing.id,
        parent_attribute_id: existing.attribute_id,
        dependency_counts: {
          mappings: 0,
          listing_answers: 0,
          total: 0,
        },
      },
      409
    );
  }

  const { data, error } = await supabase
    .from("rental_attribute_values")
    .update({
      value: validated.value,
      description: validated.description,
      sort_order: validated.sortOrder,
      is_active: validated.isActive,
    })
    .eq("id", id)
    .select(
      "id,attribute_id,value,slug,description,sort_order,is_active,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply({
    ok: true,
    action:
      lifecycleChanging
        ? validated.isActive
          ? "activated"
          : "deactivated"
        : "updated",
    permanent_key: existing.slug,
    parent_attribute_id: existing.attribute_id,
    parent_attribute_name: attributeResult.data.name,
    databaseWritePerformed: true,
    data: {
      ...data,
      mapping_count: 0,
      listing_answer_count: 0,
      dependency_count: 0,
    },
  });
}
