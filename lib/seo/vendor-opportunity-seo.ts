import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type VendorOpportunitySeoRow = {
  id: string;
  module: string;
  category: string | null;
  recommended_vendor_count: number | null;
  priority: string | null;
  state: string;
  stateSlug: string;
  district: string;
  districtSlug: string;
  place: string;
  placeSlug: string;
};

export async function getVendorOpportunityRows(limit = 1000): Promise<VendorOpportunitySeoRow[]> {
  const { data, error } = await supabase
    .from("marketplace_vendor_recruitment_queue")
    .select(`
      id,
      module,
      category,
      recommended_vendor_count,
      priority,
      geo_states:geo_state_id(name,slug),
      geo_districts:geo_district_id(name,slug),
      geo_places:geo_place_id(name,slug)
    `)
    .not("geo_state_id", "is", null)
    .order("recommended_vendor_count", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => {
    const state = Array.isArray(row.geo_states) ? row.geo_states[0] : row.geo_states;
    const district = Array.isArray(row.geo_districts) ? row.geo_districts[0] : row.geo_districts;
    const place = Array.isArray(row.geo_places) ? row.geo_places[0] : row.geo_places;

    return {
      id: row.id,
      module: row.module,
      category: row.category,
      recommended_vendor_count: row.recommended_vendor_count,
      priority: row.priority,
      state: state?.name || "",
      stateSlug: state?.slug || "",
      district: district?.name || "",
      districtSlug: district?.slug || "",
      place: place?.name || "",
      placeSlug: place?.slug || "",
    };
  }).filter((row) => row.stateSlug && row.districtSlug);
}

export async function getVendorOpportunityUrls() {
  const rows = await getVendorOpportunityRows();

  const urls = new Set<string>();

  for (const row of rows) {
    urls.add(`/vendor-opportunities/${row.stateSlug}`);
    urls.add(`/vendor-opportunities/${row.stateSlug}/${row.districtSlug}`);
    if (row.placeSlug) {
      urls.add(`/vendor-opportunities/${row.stateSlug}/${row.districtSlug}/${row.placeSlug}`);
    }
  }

  return Array.from(urls);
}

export function opportunityTitle(row: VendorOpportunitySeoRow) {
  const category = row.category || row.module;
  const location = row.place || row.district || row.state;
  return `Need ${category} vendors in ${location}`;
}
