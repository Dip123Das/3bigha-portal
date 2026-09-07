import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: "category" | "subcategory" | "service";
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

type AttributeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  input_type: string;
  unit: string | null;
  scope: string;
  is_active: boolean;
  sort_order: number;
};

type MappingRow = {
  id: string;
  service_taxon_id: string;
  attribute_id: string;
  is_required: boolean;
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

function cleanSortOrder(value: unknown) {
  if (value === "" || value === null || value === undefined) return 1000;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 1000000
    ? number
    : null;
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function databaseError(error: { code?: string | null; message?: string | null }) {
  if (error.code === "23505") {
    return reply(
      { ok: false, error: "This Attribute is already mapped to the selected individual Service." },
      409
    );
  }
  if (error.code === "23503") {
    return reply(
      { ok: false, error: "The selected Service or Attribute no longer exists." },
      409
    );
  }
  if (error.code === "22023") {
    return reply(
      { ok: false, error: error.message || "The permanent Services Mapping identity cannot be changed." },
      400
    );
  }
  return reply(
    { ok: false, error: error.message || "The Services Mapping operation failed." },
    400
  );
}

async function validateContext(
  supabase: SupabaseClient,
  serviceTaxonId: string,
  attributeId: string,
  requireActive: boolean
) {
  const [serviceResult, attributeResult] = await Promise.all([
    supabase
      .from("service_taxons")
      .select("id,parent_id,kind,name,slug,is_active")
      .eq("id", serviceTaxonId)
      .maybeSingle(),
    supabase
      .from("service_attributes")
      .select("id,name,slug,input_type,scope,is_active")
      .eq("id", attributeId)
      .maybeSingle(),
  ]);

  const error = serviceResult.error || attributeResult.error;
  if (error) return { error: databaseError(error) };

  if (!serviceResult.data || serviceResult.data.kind !== "service") {
    return {
      error: reply(
        { ok: false, error: "Select a valid individual Service. Categories and Subcategories cannot receive Attribute mappings." },
        409
      ),
    };
  }

  if (!attributeResult.data) {
    return {
      error: reply({ ok: false, error: "Select a valid Services Attribute." }, 409),
    };
  }

  if (requireActive && !serviceResult.data.is_active) {
    return {
      error: reply({ ok: false, error: "An active mapping requires an active individual Service." }, 409),
    };
  }

  if (requireActive && !attributeResult.data.is_active) {
    return {
      error: reply({ ok: false, error: "An active mapping requires an active Services Attribute." }, 409),
    };
  }

  return {
    service: serviceResult.data,
    attribute: attributeResult.data,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) return reply({ ok: false, error: access.error }, access.status);

  const supabase = access.admin;
  const [taxonResult, attributeResult, mappingResult, providerResult, answerResult] =
    await Promise.all([
      supabase
        .from("service_taxons")
        .select("id,parent_id,kind,name,slug,is_active,sort_order")
        .in("kind", ["category", "subcategory", "service"])
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("service_attributes")
        .select("id,name,slug,description,input_type,unit,scope,is_active,sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("service_attribute_mappings")
        .select("id,service_taxon_id,attribute_id,is_required,sort_order,is_active,source,created_at,updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("provider_services").select("id,service_taxon_id"),
      supabase
        .from("provider_service_attribute_values")
        .select("provider_service_id,attribute_id"),
    ]);

  const error =
    taxonResult.error ||
    attributeResult.error ||
    mappingResult.error ||
    providerResult.error ||
    answerResult.error;
  if (error) return databaseError(error);

  const taxons = (taxonResult.data || []) as TaxonRow[];
  const attributes = (attributeResult.data || []) as AttributeRow[];
  const mappings = (mappingResult.data || []) as MappingRow[];

  const providerServiceTaxon = new Map<string, string>();
  const providerCounts = new Map<string, number>();
  for (const provider of providerResult.data || []) {
    if (!provider.id || !provider.service_taxon_id) continue;
    providerServiceTaxon.set(provider.id, provider.service_taxon_id);
    providerCounts.set(
      provider.service_taxon_id,
      (providerCounts.get(provider.service_taxon_id) || 0) + 1
    );
  }

  const answerCounts = new Map<string, number>();
  for (const answer of answerResult.data || []) {
    const serviceTaxonId = providerServiceTaxon.get(answer.provider_service_id);
    if (!serviceTaxonId || !answer.attribute_id) continue;
    const key = `${serviceTaxonId}:${answer.attribute_id}`;
    answerCounts.set(key, (answerCounts.get(key) || 0) + 1);
  }

  const categories = taxons.filter((row) => row.kind === "category");
  const subcategories = taxons.filter((row) => row.kind === "subcategory");
  const services = taxons.filter((row) => row.kind === "service");

  return reply({
    ok: true,
    categories,
    subcategories,
    services: services.map((service) => ({
      ...service,
      provider_service_count: providerCounts.get(service.id) || 0,
    })),
    attributes,
    mappings: mappings.map((mapping) => ({
      ...mapping,
      historical_answer_count:
        answerCounts.get(`${mapping.service_taxon_id}:${mapping.attribute_id}`) || 0,
    })),
    summary: {
      category_count: categories.length,
      subcategory_count: subcategories.length,
      service_count: services.length,
      attribute_count: attributes.length,
      mapping_count: mappings.length,
      active_mapping_count: mappings.filter((row) => row.is_active).length,
      inactive_mapping_count: mappings.filter((row) => !row.is_active).length,
      provider_service_count: providerResult.data?.length || 0,
      historical_answer_count: answerResult.data?.length || 0,
      legacy_product_group_mapping_supported: false,
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

  const serviceTaxonId =
    typeof body.service_taxon_id === "string" ? body.service_taxon_id.trim() : "";
  const attributeId =
    typeof body.attribute_id === "string" ? body.attribute_id.trim() : "";
  if (!serviceTaxonId || !attributeId) {
    return reply(
      { ok: false, error: "Select an individual Service and a Services Attribute." },
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
  const context = await validateContext(supabase, serviceTaxonId, attributeId, true);
  if ("error" in context) return context.error;

  const existing = await supabase
    .from("service_attribute_mappings")
    .select("id,is_active")
    .eq("service_taxon_id", serviceTaxonId)
    .eq("attribute_id", attributeId)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (existing.data) {
    return reply(
      {
        ok: false,
        error: existing.data.is_active
          ? "This Attribute is already mapped to the selected individual Service."
          : "This permanent mapping already exists but is inactive. Reactivate it from Existing Mappings.",
      },
      409
    );
  }

  const inserted = await supabase
    .from("service_attribute_mappings")
    .insert({
      service_taxon_id: serviceTaxonId,
      attribute_id: attributeId,
      is_required: cleanBoolean(body.is_required),
      sort_order: sortOrder,
      is_active: true,
      source: "admin",
    })
    .select("id,service_taxon_id,attribute_id,is_required,sort_order,is_active,source,created_at,updated_at")
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
  if (!id) return reply({ ok: false, error: "Services Mapping ID is required." }, 400);

  for (const field of [
    "service_taxon_id",
    "attribute_id",
    "source",
    "created_at",
  ]) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return reply(
        { ok: false, error: "The individual Service and parent Attribute are permanent for this mapping." },
        400
      );
    }
  }

  const sortOrder = cleanSortOrder(body.sort_order);
  if (
    sortOrder === null ||
    typeof body.is_required !== "boolean" ||
    typeof body.is_active !== "boolean"
  ) {
    return reply(
      { ok: false, error: "Valid sort order, requirement status and lifecycle status are required." },
      400
    );
  }

  const supabase = access.admin;
  const existing = await supabase
    .from("service_attribute_mappings")
    .select("id,service_taxon_id,attribute_id,is_active")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return databaseError(existing.error);
  if (!existing.data) {
    return reply({ ok: false, error: "The Services Mapping was not found." }, 404);
  }

  if (body.is_active) {
    const context = await validateContext(
      supabase,
      existing.data.service_taxon_id,
      existing.data.attribute_id,
      true
    );
    if ("error" in context) return context.error;
  }

  const updated = await supabase
    .from("service_attribute_mappings")
    .update({
      is_required: body.is_required,
      sort_order: sortOrder,
      is_active: body.is_active,
    })
    .eq("id", id)
    .select("id,service_taxon_id,attribute_id,is_required,sort_order,is_active,source,created_at,updated_at")
    .single();
  if (updated.error) return databaseError(updated.error);

  return reply({
    ok: true,
    action: "updated",
    permanent_service_taxon_id: existing.data.service_taxon_id,
    permanent_attribute_id: existing.data.attribute_id,
    data: updated.data,
  });
}
