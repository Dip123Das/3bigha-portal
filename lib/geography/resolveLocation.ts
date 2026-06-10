import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export type ResolvedLocation = {
  confidence:
    | "none"
    | "state"
    | "district"
    | "subdivision"
    | "block"
    | "place";
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  matched_name: string | null;
  matched_type: string | null;
};

export async function resolveLocation(input: {
  state?: string | null;
  district?: string | null;
  subdivision?: string | null;
  block?: string | null;
  city?: string | null;
  locality?: string | null;
  place?: string | null;
  pincode?: string | null;
}): Promise<ResolvedLocation> {
  const result: ResolvedLocation = {
    confidence: "none",
    geo_state_id: null,
    geo_district_id: null,
    geo_subdivision_id: null,
    geo_block_id: null,
    geo_place_id: null,
    matched_name: null,
    matched_type: null,
  };

  const stateSlug = normalize(input.state);
  const districtSlug = normalize(input.district);
  const subdivisionSlug = normalize(input.subdivision);
  const blockSlug = normalize(input.block);

  const placeCandidates = [
    input.place,
    input.locality,
    input.city,
    input.pincode,
  ].filter(Boolean) as string[];

  if (stateSlug) {
    const { data } = await supabase
      .from("geo_states")
      .select("id,name")
      .eq("slug", stateSlug)
      .maybeSingle();

    if (data?.id) {
      result.geo_state_id = data.id;
      result.confidence = "state";
      result.matched_name = data.name;
      result.matched_type = "state";
    }
  }

  if (districtSlug) {
    let query = supabase
      .from("geo_districts")
      .select("id,state_id,name")
      .eq("slug", districtSlug);

    if (result.geo_state_id) {
      query = query.eq("state_id", result.geo_state_id);
    }

    const { data } = await query.maybeSingle();

    if (data?.id) {
      result.geo_state_id = data.state_id;
      result.geo_district_id = data.id;
      result.confidence = "district";
      result.matched_name = data.name;
      result.matched_type = "district";
    }
  }

  if (subdivisionSlug && result.geo_district_id) {
    const { data } = await supabase
      .from("geo_subdivisions")
      .select("id,name")
      .eq("district_id", result.geo_district_id)
      .eq("slug", subdivisionSlug)
      .maybeSingle();

    if (data?.id) {
      result.geo_subdivision_id = data.id;
      result.confidence = "subdivision";
      result.matched_name = data.name;
      result.matched_type = "subdivision";
    }
  }

  if (blockSlug && result.geo_district_id) {
    let query = supabase
      .from("geo_blocks")
      .select("id,subdivision_id,name")
      .eq("district_id", result.geo_district_id)
      .eq("slug", blockSlug);

    if (result.geo_subdivision_id) {
      query = query.eq("subdivision_id", result.geo_subdivision_id);
    }

    const { data } = await query.maybeSingle();

    if (data?.id) {
      result.geo_block_id = data.id;
      result.geo_subdivision_id = data.subdivision_id ?? result.geo_subdivision_id;
      result.confidence = "block";
      result.matched_name = data.name;
      result.matched_type = "block";
    }
  }

  for (const candidate of placeCandidates) {
    const slug = normalize(candidate);

    if (!slug) continue;

    let query = supabase
      .from("geo_places")
      .select("id,district_id,subdivision_id,block_id,name")
      .or(`slug.eq.${slug},pincode.eq.${candidate}`);

    if (result.geo_district_id) {
      query = query.eq("district_id", result.geo_district_id);
    }

    const { data } = await query.limit(1).maybeSingle();

    if (data?.id) {
      result.geo_place_id = data.id;
      result.geo_district_id = data.district_id ?? result.geo_district_id;
      result.geo_subdivision_id = data.subdivision_id ?? result.geo_subdivision_id;
      result.geo_block_id = data.block_id ?? result.geo_block_id;
      result.confidence = "place";
      result.matched_name = data.name;
      result.matched_type = "place";
      break;
    }
  }

  if (!result.geo_state_id && result.geo_district_id) {
    const { data } = await supabase
      .from("geo_districts")
      .select("state_id")
      .eq("id", result.geo_district_id)
      .maybeSingle();

    result.geo_state_id = data?.state_id ?? result.geo_state_id;
  }

  return result;
}
