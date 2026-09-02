import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
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
          "This attribute is already mapped to the selected subtype.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "The selected subtype, attribute or connected value no longer exists.",
      },
      409
    );
  }

  return reply(
    {
      ok: false,
      error: error.message || "The mapping operation failed.",
    },
    400
  );
}

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function cleanGroupName(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") return undefined;

  const groupName = value.trim().replace(/\s+/g, " ");

  if (!groupName) return null;
  if (groupName.length > 80) return undefined;

  return groupName;
}

async function requireActiveSubtype(
  supabase: SupabaseClient,
  subtypeId: string
) {
  const { data, error } = await supabase
    .from("property_subtypes")
    .select("id,type_id,name,slug,sort_order,is_active")
    .eq("id", subtypeId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.is_active === false) return null;

  return data;
}

async function requireActiveAttribute(
  supabase: SupabaseClient,
  attributeId: string
) {
  const { data, error } = await supabase
    .from("property_attributes")
    .select(
      "id,name,slug,description,input_type,unit,sort_order,is_active"
    )
    .eq("id", attributeId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.is_active === false) return null;

  return data;
}

async function listingAnswerCount(
  supabase: SupabaseClient,
  subtypeId: string,
  attributeId: string
) {
  const { data: listings, error: listingError } = await supabase
    .from("property_listings")
    .select("id")
    .eq("subtype_id", subtypeId);

  if (listingError) throw listingError;

  const listingIds = (listings || []).map((listing) => listing.id);

  if (listingIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("property_listing_attributes")
    .select("listing_id", {
      count: "exact",
      head: true,
    })
    .eq("attribute_id", attributeId)
    .in("listing_id", listingIds);

  if (error) throw error;

  return count || 0;
}

async function restrictionCount(
  supabase: SupabaseClient,
  subtypeId: string,
  attributeId: string
) {
  const { count, error } = await supabase
    .from("property_subtype_attribute_values")
    .select("value_id", {
      count: "exact",
      head: true,
    })
    .eq("subtype_id", subtypeId)
    .eq("attribute_id", attributeId);

  if (error) throw error;

  return count || 0;
}

async function parseBody(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readMappingInput(body: Record<string, unknown>) {
  const subtypeId = cleanId(body.subtype_id);
  const attributeId = cleanId(body.attribute_id);
  const sortOrder = cleanSortOrder(body.sort_order);
  const groupName = cleanGroupName(body.group_name);

  if (!subtypeId || !attributeId) {
    return {
      error: "Subtype and attribute are required.",
    } as const;
  }

  if (sortOrder === null) {
    return {
      error:
        "Sort order must be a whole number from 0 to 1000000.",
    } as const;
  }

  if (groupName === undefined) {
    return {
      error: "Group name must not exceed 80 characters.",
    } as const;
  }

  return {
    subtypeId,
    attributeId,
    sortOrder,
    groupName,
    isRequired: body.is_required === true,
    isFilterable: body.is_filterable !== false,
  } as const;
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
  const subtypeId = new URL(request.url).searchParams
    .get("subtype_id")
    ?.trim();

  try {
    if (!subtypeId) {
      const [typeResult, subtypeResult, attributeResult, valueResult] =
        await Promise.all([
          supabase
            .from("property_types")
            .select("id,name,slug,sort_order,is_active")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("property_subtypes")
            .select(
              "id,type_id,name,slug,sort_order,is_active"
            )
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("property_attributes")
            .select(
              "id,name,slug,description,input_type,unit,sort_order,is_active"
            )
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("property_attribute_values")
            .select("id,attribute_id,is_active"),
        ]);

      for (const result of [
        typeResult,
        subtypeResult,
        attributeResult,
        valueResult,
      ]) {
        if (result.error) return databaseError(result.error);
      }

      const valueCounts: Record<string, number> = {};

      for (const value of valueResult.data || []) {
        if (value.is_active === false) continue;

        valueCounts[value.attribute_id] =
          (valueCounts[value.attribute_id] || 0) + 1;
      }

      return reply({
        ok: true,
        types: typeResult.data || [],
        subtypes: subtypeResult.data || [],
        attributes: (attributeResult.data || []).map(
          (attribute) => ({
            ...attribute,
            active_value_count: valueCounts[attribute.id] || 0,
          })
        ),
      });
    }

    const subtype = await requireActiveSubtype(
      supabase,
      subtypeId
    );

    if (!subtype) {
      return reply(
        {
          ok: false,
          error: "The selected active subtype was not found.",
        },
        404
      );
    }

    const { data: mappings, error: mappingError } = await supabase
      .from("property_subtype_attributes")
      .select(
        "subtype_id,attribute_id,is_required,sort_order,is_filterable,group_name,created_at"
      )
      .eq("subtype_id", subtypeId)
      .order("sort_order", { ascending: true });

    if (mappingError) return databaseError(mappingError);

    const enrichedMappings = await Promise.all(
      (mappings || []).map(async (mapping) => {
        const [answers, restrictions] = await Promise.all([
          listingAnswerCount(
            supabase,
            mapping.subtype_id,
            mapping.attribute_id
          ),
          restrictionCount(
            supabase,
            mapping.subtype_id,
            mapping.attribute_id
          ),
        ]);

        return {
          ...mapping,
          listing_answer_count: answers,
          restricted_value_count: restrictions,
        };
      })
    );

    return reply({
      ok: true,
      subtype,
      mappings: enrichedMappings,
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

  const body = await parseBody(request);

  if (!body) {
    return reply(
      { ok: false, error: "A valid JSON request is required." },
      400
    );
  }

  const input = readMappingInput(body);

  if ("error" in input) {
    return reply({ ok: false, error: input.error }, 400);
  }

  try {
    const [subtype, attribute] = await Promise.all([
      requireActiveSubtype(access.admin, input.subtypeId),
      requireActiveAttribute(access.admin, input.attributeId),
    ]);

    if (!subtype) {
      return reply(
        { ok: false, error: "Select an active subtype." },
        400
      );
    }

    if (!attribute) {
      return reply(
        { ok: false, error: "Select an active attribute." },
        400
      );
    }

    const { data, error } = await access.admin
      .from("property_subtype_attributes")
      .insert({
        subtype_id: input.subtypeId,
        attribute_id: input.attributeId,
        sort_order: input.sortOrder,
        group_name: input.groupName,
        is_required: input.isRequired,
        is_filterable: input.isFilterable,
      })
      .select(
        "subtype_id,attribute_id,is_required,sort_order,is_filterable,group_name,created_at"
      )
      .single();

    if (error) return databaseError(error);

    return reply(
      {
        ok: true,
        action: "created",
        subtype,
        attribute,
        data: {
          ...data,
          listing_answer_count: 0,
          restricted_value_count: 0,
        },
      },
      201
    );
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      { ok: false, error: access.error },
      access.status
    );
  }

  const body = await parseBody(request);

  if (!body) {
    return reply(
      { ok: false, error: "A valid JSON request is required." },
      400
    );
  }

  const input = readMappingInput(body);

  if ("error" in input) {
    return reply({ ok: false, error: input.error }, 400);
  }

  const supabase = access.admin;

  try {
    const { data: existing, error: existingError } =
      await supabase
        .from("property_subtype_attributes")
        .select("subtype_id,attribute_id")
        .eq("subtype_id", input.subtypeId)
        .eq("attribute_id", input.attributeId)
        .maybeSingle();

    if (existingError) return databaseError(existingError);

    if (!existing) {
      return reply(
        { ok: false, error: "Property mapping was not found." },
        404
      );
    }

    const [answers, restrictions] = await Promise.all([
      listingAnswerCount(
        supabase,
        input.subtypeId,
        input.attributeId
      ),
      restrictionCount(
        supabase,
        input.subtypeId,
        input.attributeId
      ),
    ]);

    const { data, error } = await supabase
      .from("property_subtype_attributes")
      .update({
        sort_order: input.sortOrder,
        group_name: input.groupName,
        is_required: input.isRequired,
        is_filterable: input.isFilterable,
      })
      .eq("subtype_id", input.subtypeId)
      .eq("attribute_id", input.attributeId)
      .select(
        "subtype_id,attribute_id,is_required,sort_order,is_filterable,group_name,created_at"
      )
      .single();

    if (error) return databaseError(error);

    return reply({
      ok: true,
      action: "updated",
      data: {
        ...data,
        listing_answer_count: answers,
        restricted_value_count: restrictions,
      },
    });
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }
}

export async function DELETE(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      { ok: false, error: access.error },
      access.status
    );
  }

  const body = await parseBody(request);

  if (!body) {
    return reply(
      { ok: false, error: "A valid JSON request is required." },
      400
    );
  }

  const subtypeId = cleanId(body.subtype_id);
  const attributeId = cleanId(body.attribute_id);

  if (!subtypeId || !attributeId) {
    return reply(
      {
        ok: false,
        error: "Subtype and attribute are required.",
      },
      400
    );
  }

  const supabase = access.admin;

  try {
    const { data: existing, error: existingError } =
      await supabase
        .from("property_subtype_attributes")
        .select("subtype_id,attribute_id")
        .eq("subtype_id", subtypeId)
        .eq("attribute_id", attributeId)
        .maybeSingle();

    if (existingError) return databaseError(existingError);

    if (!existing) {
      return reply(
        { ok: false, error: "Property mapping was not found." },
        404
      );
    }

    const [answers, restrictions] = await Promise.all([
      listingAnswerCount(supabase, subtypeId, attributeId),
      restrictionCount(supabase, subtypeId, attributeId),
    ]);

    if (answers > 0) {
      return reply(
        {
          ok: false,
          error:
            `This mapping has ${answers} listing answer` +
            `${answers === 1 ? "" : "s"} and cannot be removed.`,
        },
        409
      );
    }

    if (restrictions > 0) {
      return reply(
        {
          ok: false,
          error:
            `This mapping has ${restrictions} subtype value restriction` +
            `${restrictions === 1 ? "" : "s"}. Clear those restrictions before removing it.`,
        },
        409
      );
    }

    const { error } = await supabase
      .from("property_subtype_attributes")
      .delete()
      .eq("subtype_id", subtypeId)
      .eq("attribute_id", attributeId);

    if (error) return databaseError(error);

    return reply({
      ok: true,
      action: "removed",
      subtype_id: subtypeId,
      attribute_id: attributeId,
      listing_answer_count: 0,
      restricted_value_count: 0,
    });
  } catch (error) {
    return databaseError(
      error as { code?: string; message?: string }
    );
  }
}
