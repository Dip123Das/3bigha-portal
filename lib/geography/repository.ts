import { createClient } from "@supabase/supabase-js";

export type GeoTable =
  | "geo_states"
  | "geo_districts"
  | "geo_subdivisions"
  | "geo_blocks"
  | "geo_places";

export type GeoRow = {
  id: string;
  name: string;
  slug?: string | null;
  lgd_code?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  subdivision_id?: string | null;
  block_id?: string | null;
  pincode?: string | null;
  place_type?: string | null;
  is_active?: boolean | null;
  search_keywords?: string[] | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function findGeoRows(
  table: GeoTable,
  filters: Record<string, string | undefined | null> = {},
  options: {
    q?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const supabase = getSupabase();
  if (!supabase) {
    return { rows: [] as GeoRow[], hasMore: false, nextOffset: 0 };
  }

  const limit = Math.min(Math.max(Number(options.limit || 50), 1), 500);
  const offset = Math.max(Number(options.offset || 0), 0);

  let query = supabase
    .from(table)
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range(offset, offset + limit);

  Object.entries(filters).forEach(([key, value]) => {
    if (value) query = query.eq(key, value);
  });

  if (options.q) {
    query = query.ilike("name", `%${options.q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as GeoRow[];

  return {
    rows: rows.slice(0, limit),
    hasMore: rows.length > limit,
    nextOffset: offset + Math.min(rows.length, limit),
  };
}

export function getStates(options?: { q?: string; limit?: number; offset?: number }) {
  return findGeoRows("geo_states", {}, options);
}

export function getDistricts(
  stateId: string,
  options?: { q?: string; limit?: number; offset?: number }
) {
  return findGeoRows("geo_districts", { state_id: stateId }, options);
}

export function getSubdivisions(
  districtId: string,
  options?: { q?: string; limit?: number; offset?: number }
) {
  return findGeoRows("geo_subdivisions", { district_id: districtId }, options);
}

export function getBlocks(
  filters: { districtId: string; subdivisionId?: string | null },
  options?: { q?: string; limit?: number; offset?: number }
) {
  return findGeoRows(
    "geo_blocks",
    {
      district_id: filters.districtId,
      subdivision_id: filters.subdivisionId || undefined,
    },
    options
  );
}

export function searchPlaces(
  filters: {
    districtId?: string | null;
    subdivisionId?: string | null;
    blockId?: string | null;
  } = {},
  options?: { q?: string; limit?: number; offset?: number }
) {
  return findGeoRows(
    "geo_places",
    {
      district_id: filters.districtId || undefined,
      subdivision_id: filters.subdivisionId || undefined,
      block_id: filters.blockId || undefined,
    },
    options
  );
}
