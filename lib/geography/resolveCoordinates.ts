type SupabaseLike = {
  from: (table: string) => any;
};

export type ResolvedCoordinates = {
  latitude: number;
  longitude: number;
  precision: "place" | "block" | "subdivision" | "district" | "state";
  source: string;
} | null;

function validCoord(row: any) {
  const latitude = Number(row?.latitude);
  const longitude = Number(row?.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 6 &&
    latitude <= 38 &&
    longitude >= 68 &&
    longitude <= 98
  ) {
    return { latitude, longitude };
  }

  return null;
}

async function resolveFromTable(
  supabase: SupabaseLike,
  table: string,
  id: any,
  precision: NonNullable<ResolvedCoordinates>["precision"]
): Promise<ResolvedCoordinates> {
  if (!id) return null;

  const { data, error } = await supabase
    .from(table)
    .select("id,latitude,longitude")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const coord = validCoord(data);
  if (!coord) return null;

  return {
    ...coord,
    precision,
    source: table,
  };
}

export async function resolveGeoCoordinates({
  supabase,
  geo_place_id,
  geo_block_id,
  geo_subdivision_id,
  geo_district_id,
  geo_state_id,
}: {
  supabase: SupabaseLike;
  geo_place_id?: any;
  geo_block_id?: any;
  geo_subdivision_id?: any;
  geo_district_id?: any;
  geo_state_id?: any;
}): Promise<ResolvedCoordinates> {
  return (
    (await resolveFromTable(supabase, "geo_places", geo_place_id, "place")) ||
    (await resolveFromTable(supabase, "geo_blocks", geo_block_id, "block")) ||
    (await resolveFromTable(supabase, "geo_subdivisions", geo_subdivision_id, "subdivision")) ||
    (await resolveFromTable(supabase, "geo_districts", geo_district_id, "district")) ||
    (await resolveFromTable(supabase, "geo_states", geo_state_id, "state"))
  );
}
