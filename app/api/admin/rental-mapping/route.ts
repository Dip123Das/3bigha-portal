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
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
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

function databaseError(error: DatabaseError) {
  if (error.code === "23505") {
    return reply(
      {
        ok: false,
        error:
          "This Rental Attribute is already mapped to the selected Product Group, or the active sort order is already in use.",
      },
      409
    );
  }

  if (error.code === "23503") {
    return reply(
      {
        ok: false,
        error:
          "The selected Rental Product Group or Rental Attribute no longer exists.",
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
          "The Rental Mapping relationship is invalid.",
      },
      400
    );
  }

  return reply(
    {
      ok: false,
      error:
        error.message ||
        "The Rental Mapping operation failed.",
    },
    400
  );
}

async function verifyParents(
  admin: Awaited<
    ReturnType<typeof requireMasterAdmin>
  > extends infer Result
    ? Result extends { admin: infer Client }
      ? Client
      : never
    : never,
  productGroupId: string,
  attributeId: string
) {
  const [productGroupResult, attributeResult] =
    await Promise.all([
      admin
        .from("rental_taxons")
        .select("id,name,slug,kind,is_active")
        .eq("id", productGroupId)
        .maybeSingle(),
      admin
        .from("rental_attributes")
        .select(
          "id,name,slug,input_type,unit,is_active"
        )
        .eq("id", attributeId)
        .maybeSingle(),
    ]);

  const error =
    productGroupResult.error ||
    attributeResult.error;

  if (error) throw error;

  if (
    !productGroupResult.data ||
    productGroupResult.data.kind !== "product_group"
  ) {
    return {
      ok: false as const,
      error:
        "Select a valid Rental Product Group.",
    };
  }

  if (!attributeResult.data) {
    return {
      ok: false as const,
      error:
        "Select a valid Rental Attribute.",
    };
  }

  return {
    ok: true as const,
    productGroup: productGroupResult.data,
    attribute: attributeResult.data,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      {
        ok: false,
        error: access.error,
      },
      access.status
    );
  }

  const [taxonResult, attributeResult, mappingResult] =
    await Promise.all([
      access.admin
        .from("rental_taxons")
        .select(
          "id,parent_id,kind,name,slug,sort_order,is_active,source"
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      access.admin
        .from("rental_attributes")
        .select(
          "id,name,slug,input_type,unit,sort_order,is_active"
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      access.admin
        .from("rental_product_group_attributes")
        .select(
          "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  const error =
    taxonResult.error ||
    attributeResult.error ||
    mappingResult.error;

  if (error) return databaseError(error);

  const taxons = taxonResult.data || [];
  const attributes = attributeResult.data || [];
  const mappings = mappingResult.data || [];

  return reply({
    ok: true,
    role: access.role,
    email: access.user.email || null,
    taxons,
    attributes,
    mappings,
    counts: {
      product_groups: taxons.filter(
        (row) => row.kind === "product_group"
      ).length,
      active_product_groups: taxons.filter(
        (row) =>
          row.kind === "product_group" &&
          row.is_active
      ).length,
      attributes: attributes.length,
      active_attributes: attributes.filter(
        (row) => row.is_active
      ).length,
      mappings: mappings.length,
      active_mappings: mappings.filter(
        (row) => row.is_active
      ).length,
      inactive_mappings: mappings.filter(
        (row) => !row.is_active
      ).length,
      required_mappings: mappings.filter(
        (row) => row.is_required
      ).length,
    },
  });
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      {
        ok: false,
        error: access.error,
      },
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

  const productGroupId = cleanId(
    body.product_group_id
  );
  const attributeId = cleanId(body.attribute_id);

  if (!productGroupId) {
    return reply(
      {
        ok: false,
        error: "Select a Rental Product Group.",
      },
      400
    );
  }

  if (!attributeId) {
    return reply(
      {
        ok: false,
        error: "Select a Rental Attribute.",
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

  try {
    const parents = await verifyParents(
      access.admin,
      productGroupId,
      attributeId
    );

    if (!parents.ok) {
      return reply(
        {
          ok: false,
          error: parents.error,
        },
        400
      );
    }

    const existingResult = await access.admin
      .from("rental_product_group_attributes")
      .select(
        "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
      )
      .eq("product_group_id", productGroupId)
      .eq("attribute_id", attributeId)
      .maybeSingle();

    if (existingResult.error) {
      return databaseError(existingResult.error);
    }

    if (
      existingResult.data &&
      existingResult.data.is_active
    ) {
      return reply(
        {
          ok: false,
          error:
            "This Rental Attribute is already actively mapped to the selected Product Group.",
        },
        409
      );
    }

    if (existingResult.data) {
      const reactivated = await access.admin
        .from("rental_product_group_attributes")
        .update({
          sort_order: sortOrder,
          is_required: body.is_required === true,
          is_active: true,
        })
        .eq("id", existingResult.data.id)
        .select(
          "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
        )
        .single();

      if (reactivated.error) {
        return databaseError(reactivated.error);
      }

      return reply({
        ok: true,
        action: "reactivated",
        data: reactivated.data,
      });
    }

    const inserted = await access.admin
      .from("rental_product_group_attributes")
      .insert({
        product_group_id: productGroupId,
        attribute_id: attributeId,
        sort_order: sortOrder,
        is_required: body.is_required === true,
        is_active: true,
        created_by: access.user.id,
      })
      .select(
        "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
      )
      .single();

    if (inserted.error) {
      return databaseError(inserted.error);
    }

    return reply(
      {
        ok: true,
        action: "created",
        data: inserted.data,
      },
      201
    );
  } catch (error) {
    return databaseError(error as DatabaseError);
  }
}

export async function PATCH(request: Request) {
  const access = await requireMasterAdmin(request);

  if ("error" in access) {
    return reply(
      {
        ok: false,
        error: access.error,
      },
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

  const id = cleanId(body.id);

  if (!id) {
    return reply(
      {
        ok: false,
        error: "Rental Mapping ID is required.",
      },
      400
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "product_group_id"
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      "attribute_id"
    )
  ) {
    return reply(
      {
        ok: false,
        error:
          "The Product Group and Rental Attribute relationships are permanent.",
      },
      400
    );
  }

  const existingResult = await access.admin
    .from("rental_product_group_attributes")
    .select(
      "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (existingResult.error) {
    return databaseError(existingResult.error);
  }

  if (!existingResult.data) {
    return reply(
      {
        ok: false,
        error: "Rental Mapping was not found.",
      },
      404
    );
  }

  const update: {
    sort_order?: number;
    is_required?: boolean;
    is_active?: boolean;
  } = {};

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "sort_order"
    )
  ) {
    const sortOrder = cleanSortOrder(
      body.sort_order
    );

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

    update.sort_order = sortOrder;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "is_required"
    )
  ) {
    update.is_required =
      body.is_required === true;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "is_active"
    )
  ) {
    const nextActive = body.is_active === true;

    if (
      !nextActive &&
      existingResult.data.is_active &&
      body.confirmed !== true
    ) {
      return reply(
        {
          ok: false,
          error:
            "Human confirmation is required before deactivating this Rental Mapping.",
          requires_confirmation: true,
          dependency_count: 0,
          confirmation:
            "No historical mapping record will be deleted.",
        },
        409
      );
    }

    update.is_active = nextActive;
  }

  if (Object.keys(update).length === 0) {
    return reply(
      {
        ok: false,
        error: "No supported change was supplied.",
      },
      400
    );
  }

  const updated = await access.admin
    .from("rental_product_group_attributes")
    .update(update)
    .eq("id", id)
    .select(
      "id,product_group_id,attribute_id,sort_order,is_required,is_active,created_at,updated_at"
    )
    .single();

  if (updated.error) {
    return databaseError(updated.error);
  }

  return reply({
    ok: true,
    action:
      update.is_active === false
        ? "deactivated"
        : update.is_active === true
          ? "activated"
          : "updated",
    data: updated.data,
    dependency_count: 0,
  });
}
