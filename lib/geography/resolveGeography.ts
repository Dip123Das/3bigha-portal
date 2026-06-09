import { createClient } from "@supabase/supabase-js";
import type { GeographyNode } from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type GeographyResolverInput = {
  state?: string | null;
  district?: string | null;
  subdivision?: string | null;
  block?: string | null;
  city?: string | null;
  locality?: string | null;
  village?: string | null;
  place?: string | null;
  location?: string | null;
  address?: string | null;
};

export type GeographyResolverResult = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  confidence: "none" | "low" | "medium" | "high";
  matched: {
    state?: GeographyNode | null;
    district?: GeographyNode | null;
    subdivision?: GeographyNode | null;
    block?: GeographyNode | null;
    place?: GeographyNode | null;
  };
};

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(value?: string | null) {
  return normalize(value).replace(/\s+/g, "-");
}

async function findOne(table: string, value?: string | null) {
  const clean = normalize(value);
  const slug = slugify(value);

  if (!clean) return null;

  const { data, error } = await supabase
    .from(table)
    .select("id,name,slug")
    .or(`slug.eq.${slug},name.ilike.${clean}`)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

export async function resolveGeography(
  input: GeographyResolverInput
): Promise<GeographyResolverResult> {
  const state = await findOne("geo_states", input.state);
  const district = await findOne("geo_districts", input.district);

  const subdivision = await findOne("geo_subdivisions", input.subdivision);
  const block = await findOne("geo_blocks", input.block);

  const placeCandidate =
    input.place ||
    input.locality ||
    input.village ||
    input.city ||
    input.location ||
    input.address;

  const place = await findOne("geo_places", placeCandidate);

  const matchedCount = [state, district, subdivision, block, place].filter(Boolean).length;

  const confidence =
    matchedCount >= 3 ? "high" :
    matchedCount === 2 ? "medium" :
    matchedCount === 1 ? "low" :
    "none";

  return {
    geo_state_id: state?.id ?? null,
    geo_district_id: district?.id ?? null,
    geo_subdivision_id: subdivision?.id ?? null,
    geo_block_id: block?.id ?? null,
    geo_place_id: place?.id ?? null,
    confidence,
    matched: {
      state,
      district,
      subdivision,
      block,
      place,
    },
  };
}
