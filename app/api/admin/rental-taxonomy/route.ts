import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type TaxonomyKind =
  | "type"
  | "category"
  | "subcategory"
  | "product_group";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: TaxonomyKind;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
};

const VALID_KINDS: TaxonomyKind[] = [
  "type",
  "category",
  "subcategory",
  "product_group",
];

const EXPECTED_PARENT_KIND: Record<
  Exclude<TaxonomyKind, "type">,
  TaxonomyKind
> = {
  category: "type",
  subcategory: "category",
  product_group: "subcategory",
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function validKind(value: unknown): value is TaxonomyKind {
  return (
    typeof value === "string" &&
    VALID_KINDS.includes(value as TaxonomyKind)
  );
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

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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
          "An active taxonomy entry with the same permanent key or sort order already exists under this parent.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "This taxonomy entry is connected to other rental data and cannot be changed in that way.",
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
          "A permanent taxonomy identity field cannot be changed.",
      },
      400
    );
  }

  return reply(
    {
      ok: false,
      error:
        error.message ||
        "The Rental Taxonomy operation failed.",
    },
    400
  );
}

function countDescendants(
  id: string,
  childrenByParent: Record<string, TaxonRow[]>
) {
  let count = 0;
  const pending = [...(childrenByParent[id] || [])];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const child = pending.pop();

    if (!child || visited.has(child.id)) continue;

    visited.add(child.id);
    count += 1;
    pending.push(...(childrenByParent[child.id] || []));
  }

  return count;
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

  const [
    taxonResult,
    mappingResult,
    listingCountResult,
    categoryCountResult,
    subcategoryCountResult,
    equipmentCountResult,
  ] = await Promise.all([
    supabase
      .from("rental_taxons")
      .select(
        "id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at"
      )
      .order("kind", { ascending: true })
      .order("sort_order", {
        ascending: true,
        nullsFirst: false,
      })
      .order("name", { ascending: true }),

    supabase
      .from("rental_product_group_attributes")
      .select("product_group_id,attribute_id,is_active"),

    supabase
      .from("rental_listings")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("rental_categories")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("rental_subcategories")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("rental_equipment")
      .select("id", { count: "exact", head: true }),
  ]);

  const error =
    taxonResult.error ||
    mappingResult.error ||
    listingCountResult.error ||
    categoryCountResult.error ||
    subcategoryCountResult.error ||
    equipmentCountResult.error;

  if (error) return databaseError(error);

  const taxons = (taxonResult.data || []) as TaxonRow[];
  const childrenByParent: Record<string, TaxonRow[]> = {};
  const mappingCounts: Record<string, number> = {};

  for (const taxon of taxons) {
    if (!taxon.parent_id) continue;

    if (!childrenByParent[taxon.parent_id]) {
      childrenByParent[taxon.parent_id] = [];
    }

    childrenByParent[taxon.parent_id].push(taxon);
  }

  for (const mapping of mappingResult.data || []) {
    if (!mapping.product_group_id) continue;

    mappingCounts[mapping.product_group_id] =
      (mappingCounts[mapping.product_group_id] || 0) + 1;
  }

  return reply({
    ok: true,
    taxons: taxons.map((taxon) => ({
      ...taxon,
      child_count:
        (childrenByParent[taxon.id] || []).length,
      active_child_count:
        (childrenByParent[taxon.id] || []).filter(
          (child) => child.is_active
        ).length,
      descendant_count: countDescendants(
        taxon.id,
        childrenByParent
      ),
      mapping_count: mappingCounts[taxon.id] || 0,
      direct_listing_count: 0,
    })),
    summary: {
      total_taxons: taxons.length,
      active_taxons: taxons.filter(
        (taxon) => taxon.is_active
      ).length,
      inactive_taxons: taxons.filter(
        (taxon) => !taxon.is_active
      ).length,
      type_count: taxons.filter(
        (taxon) => taxon.kind === "type"
      ).length,
      category_count: taxons.filter(
        (taxon) => taxon.kind === "category"
      ).length,
      subcategory_count: taxons.filter(
        (taxon) => taxon.kind === "subcategory"
      ).length,
      product_group_count: taxons.filter(
        (taxon) => taxon.kind === "product_group"
      ).length,
      legacy_listing_count:
        listingCountResult.count || 0,
      legacy_category_count:
        categoryCountResult.count || 0,
      legacy_subcategory_count:
        subcategoryCountResult.count || 0,
      legacy_equipment_count:
        equipmentCountResult.count || 0,
    },
    compatibility: {
      direct_taxon_listing_relationship: false,
      legacy_catalogue_preserved: true,
      message:
        "Existing rental listings use the legacy category, subcategory and equipment catalogue. Those records remain preserved.",
    },
  });
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
      {
        ok: false,
        error: "A valid JSON request is required.",
      },
      400
    );
  }

  if (!validKind(body.kind)) {
    return reply(
      {
        ok: false,
        error: "Select a valid taxonomy level.",
      },
      400
    );
  }

  const name = cleanName(body.name);

  if (name.length < 2 || name.length > 120) {
    return reply(
      {
        ok: false,
        error:
          "Name must contain 2 to 120 characters.",
      },
      400
    );
  }

  const slug = slugify(
    typeof body.slug === "string"
      ? body.slug
      : name
  );

  if (slug.length < 2 || slug.length > 120) {
    return reply(
      {
        ok: false,
        error:
          "A valid permanent key is required.",
      },
      400
    );
  }

  const description = cleanDescription(
    body.description
  );

  if (description && description.length > 600) {
    return reply(
      {
        ok: false,
        error:
          "Description must not exceed 600 characters.",
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
  let parentId: string | null = null;

  if (body.kind === "type") {
    if (
      typeof body.parent_id === "string" &&
      body.parent_id.trim()
    ) {
      return reply(
        {
          ok: false,
          error:
            "A top-level rental type cannot have a parent.",
        },
        400
      );
    }
  } else {
    parentId =
      typeof body.parent_id === "string"
        ? body.parent_id.trim()
        : "";

    if (!parentId) {
      return reply(
        {
          ok: false,
          error:
            "Select the required parent taxonomy entry.",
        },
        400
      );
    }

    const { data: parent, error: parentError } =
      await supabase
        .from("rental_taxons")
        .select("id,kind,is_active")
        .eq("id", parentId)
        .maybeSingle();

    if (parentError) return databaseError(parentError);

    if (!parent) {
      return reply(
        {
          ok: false,
          error:
            "The selected parent taxonomy entry was not found.",
        },
        404
      );
    }

    const expectedParent =
      EXPECTED_PARENT_KIND[body.kind];

    if (parent.kind !== expectedParent) {
      return reply(
        {
          ok: false,
          error:
            `A ${body.kind} must belong to an active ${expectedParent}.`,
        },
        400
      );
    }

    if (!parent.is_active) {
      return reply(
        {
          ok: false,
          error:
            "The selected parent is inactive.",
        },
        409
      );
    }
  }

  const { data, error } = await supabase
    .from("rental_taxons")
    .insert({
      parent_id: parentId,
      kind: body.kind,
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: body.is_active !== false,
      source: "admin",
    })
    .select(
      "id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply(
    {
      ok: true,
      action: "created",
      kind: body.kind,
      data,
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
      {
        ok: false,
        error: "A valid JSON request is required.",
      },
      400
    );
  }

  const id =
    typeof body.id === "string"
      ? body.id.trim()
      : "";

  if (!id) {
    return reply(
      {
        ok: false,
        error: "Taxonomy entry ID is required.",
      },
      400
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "slug"
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      "parent_id"
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      "kind"
    )
  ) {
    return reply(
      {
        ok: false,
        error:
          "The permanent key, hierarchy level and parent relationship are locked.",
      },
      400
    );
  }

  const name = cleanName(body.name);

  if (name.length < 2 || name.length > 120) {
    return reply(
      {
        ok: false,
        error:
          "Name must contain 2 to 120 characters.",
      },
      400
    );
  }

  const description = cleanDescription(
    body.description
  );

  if (description && description.length > 600) {
    return reply(
      {
        ok: false,
        error:
          "Description must not exceed 600 characters.",
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
      .from("rental_taxons")
      .select(
        "id,parent_id,kind,name,slug,is_active"
      )
      .eq("id", id)
      .maybeSingle();

  if (existingError) {
    return databaseError(existingError);
  }

  if (!existing) {
    return reply(
      {
        ok: false,
        error:
          "The Rental Taxonomy entry was not found.",
      },
      404
    );
  }

  const nextActive = body.is_active !== false;

  if (!nextActive && existing.is_active) {
    const { count: childCount, error: childError } =
      await supabase
        .from("rental_taxons")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("parent_id", id)
        .eq("is_active", true);

    if (childError) return databaseError(childError);

    if ((childCount || 0) > 0) {
      return reply(
        {
          ok: false,
          error:
            `Deactivate the ${childCount} active child entries first.`,
        },
        409
      );
    }

    if (existing.kind === "product_group") {
      const {
        count: mappingCount,
        error: mappingError,
      } = await supabase
        .from("rental_product_group_attributes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_group_id", id)
        .eq("is_active", true);

      if (mappingError) {
        return databaseError(mappingError);
      }

      if ((mappingCount || 0) > 0) {
        return reply(
          {
            ok: false,
            error:
              `Deactivate the ${mappingCount} active attribute mappings first.`,
          },
          409
        );
      }
    }
  }

  if (
    nextActive &&
    !existing.is_active &&
    existing.parent_id
  ) {
    const { data: parent, error: parentError } =
      await supabase
        .from("rental_taxons")
        .select("id,is_active")
        .eq("id", existing.parent_id)
        .maybeSingle();

    if (parentError) return databaseError(parentError);

    if (!parent || !parent.is_active) {
      return reply(
        {
          ok: false,
          error:
            "Reactivate the parent taxonomy entry first.",
        },
        409
      );
    }
  }

  const { data, error } = await supabase
    .from("rental_taxons")
    .update({
      name,
      description,
      sort_order: sortOrder,
      is_active: nextActive,
    })
    .eq("id", id)
    .select(
      "id,parent_id,kind,name,slug,description,sort_order,is_active,source,created_at,updated_at"
    )
    .single();

  if (error) return databaseError(error);

  return reply({
    ok: true,
    action: "updated",
    permanent_key: existing.slug,
    permanent_kind: existing.kind,
    permanent_parent_id: existing.parent_id,
    data,
  });
}
