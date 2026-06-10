import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

async function findBySlug(
  table: string,
  slug: string,
  extra: Record<string, string | null> = {}
) {
  let query: any = supabase.from(table).select("*").eq("slug", slug);

  for (const [key, value] of Object.entries(extra)) {
    if (value) {
      query = query.eq(key, value);
    }
  }

  const { data } = await query.limit(1).maybeSingle();
  return data;
}

export async function POST(request: Request) {
  const body = await request.json();

  const type = String(body.type || "");
  const name = String(body.name || "").trim();

  if (!type || !name) {
    return NextResponse.json(
      { ok: false, error: "type and name are required" },
      { status: 400 }
    );
  }

  const slug = slugify(body.slug || name);

  if (type === "state") {
    const countryRow = await supabase
      .from("geo_countries")
      .select("id")
      .eq("slug", "india")
      .limit(1)
      .maybeSingle();

    const countryId = countryRow.data?.id || null;

    const existing = await findBySlug("geo_states", slug);

    const payload = {
      country_id: countryId,
      name,
      slug,
      is_active: body.is_active ?? true,
      sort_order: Number(body.sort_order || 999),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("geo_states")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      return NextResponse.json({ ok: !error, action: "updated", data, error: error?.message ?? null });
    }

    const { data, error } = await supabase
      .from("geo_states")
      .insert(payload)
      .select("*")
      .single();

    return NextResponse.json({ ok: !error, action: "inserted", data, error: error?.message ?? null });
  }

  if (type === "district") {
    const stateId = body.state_id;

    if (!stateId) {
      return NextResponse.json({ ok: false, error: "state_id required" }, { status: 400 });
    }

    const existing = await findBySlug("geo_districts", slug, { state_id: stateId });

    const payload = {
      state_id: stateId,
      name,
      slug,
      is_active: body.is_active ?? true,
      sort_order: Number(body.sort_order || 999),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("geo_districts")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      return NextResponse.json({ ok: !error, action: "updated", data, error: error?.message ?? null });
    }

    const { data, error } = await supabase
      .from("geo_districts")
      .insert(payload)
      .select("*")
      .single();

    return NextResponse.json({ ok: !error, action: "inserted", data, error: error?.message ?? null });
  }

  if (type === "subdivision") {
    const districtId = body.district_id;

    if (!districtId) {
      return NextResponse.json({ ok: false, error: "district_id required" }, { status: 400 });
    }

    const existing = await findBySlug("geo_subdivisions", slug, { district_id: districtId });

    const payload = {
      district_id: districtId,
      name,
      slug,
      subdivision_type: body.subdivision_type || "subdivision",
      is_active: body.is_active ?? true,
      sort_order: Number(body.sort_order || 999),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("geo_subdivisions")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      return NextResponse.json({ ok: !error, action: "updated", data, error: error?.message ?? null });
    }

    const { data, error } = await supabase
      .from("geo_subdivisions")
      .insert(payload)
      .select("*")
      .single();

    return NextResponse.json({ ok: !error, action: "inserted", data, error: error?.message ?? null });
  }

  if (type === "block") {
    const districtId = body.district_id;
    const subdivisionId = body.subdivision_id || null;

    if (!districtId) {
      return NextResponse.json({ ok: false, error: "district_id required" }, { status: 400 });
    }

    const existing = await findBySlug("geo_blocks", slug, { district_id: districtId });

    const payload = {
      district_id: districtId,
      subdivision_id: subdivisionId,
      name,
      slug,
      block_type: body.block_type || "block",
      is_active: body.is_active ?? true,
      sort_order: Number(body.sort_order || 999),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("geo_blocks")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      return NextResponse.json({ ok: !error, action: "updated", data, error: error?.message ?? null });
    }

    const { data, error } = await supabase
      .from("geo_blocks")
      .insert(payload)
      .select("*")
      .single();

    return NextResponse.json({ ok: !error, action: "inserted", data, error: error?.message ?? null });
  }

  if (type === "place") {
    const districtId = body.district_id;
    const subdivisionId = body.subdivision_id || null;
    const blockId = body.block_id || null;

    if (!districtId) {
      return NextResponse.json({ ok: false, error: "district_id required" }, { status: 400 });
    }

    const existing = await findBySlug("geo_places", slug, { district_id: districtId });

    const payload = {
      district_id: districtId,
      subdivision_id: subdivisionId,
      block_id: blockId,
      name,
      slug,
      place_type: body.place_type || "locality",
      pincode: body.pincode || null,
      is_verified: body.is_verified ?? true,
      is_active: body.is_active ?? true,
      sort_order: Number(body.sort_order || 999),
      search_keywords: [
        slug,
        name.toLowerCase(),
        String(body.pincode || "").toLowerCase(),
      ].filter(Boolean),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("geo_places")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      return NextResponse.json({ ok: !error, action: "updated", data, error: error?.message ?? null });
    }

    const { data, error } = await supabase
      .from("geo_places")
      .insert(payload)
      .select("*")
      .single();

    return NextResponse.json({ ok: !error, action: "inserted", data, error: error?.message ?? null });
  }

  return NextResponse.json(
    { ok: false, error: "Unsupported type. Use district, subdivision, block, or place." },
    { status: 400 }
  );
}
