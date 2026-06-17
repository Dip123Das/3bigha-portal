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
  opportunity_title?: string | null;
  opportunity_description?: string | null;
  state: string;
  stateSlug: string;
  district: string;
  districtSlug: string;
  place: string;
  placeSlug: string;
};

type GeoNameSlug = {
  name: string;
  slug: string;
};

async function loadGeoMap(table: string) {
  const { data } = await supabase.from(table).select("id,name,slug").limit(5000);
  const map = new Map<string, GeoNameSlug>();

  for (const row of data || []) {
    if (row?.id) {
      map.set(String(row.id), {
        name: String(row.name || ""),
        slug: String(row.slug || ""),
      });
    }
  }

  return map;
}

export async function getVendorOpportunityRows(
  limit = 1000
): Promise<VendorOpportunitySeoRow[]> {
  const [queueRes, states, districts, places] = await Promise.all([
    supabase
      .from("marketplace_vendor_recruitment_queue")
      .select(
        "id,module,category,recommended_vendor_count,priority,opportunity_title,opportunity_description,geo_state_id,geo_district_id,geo_place_id"
      )
      .not("geo_state_id", "is", null)
      .order("recommended_vendor_count", { ascending: false })
      .limit(limit),
    loadGeoMap("geo_states"),
    loadGeoMap("geo_districts"),
    loadGeoMap("geo_places"),
  ]);

  if (queueRes.error || !queueRes.data) return [];

  return queueRes.data
    .map((row: any) => {
      const state = states.get(String(row.geo_state_id || ""));
      const district = districts.get(String(row.geo_district_id || ""));
      const place = places.get(String(row.geo_place_id || ""));

      return {
        id: row.id,
        module: row.module,
        category: row.category,
        recommended_vendor_count: row.recommended_vendor_count,
        priority: row.priority,
        opportunity_title: row.opportunity_title,
        opportunity_description: row.opportunity_description,
        state: state?.name || "",
        stateSlug: state?.slug || "",
        district: district?.name || "",
        districtSlug: district?.slug || "",
        place: place?.name || "",
        placeSlug: place?.slug || "",
      };
    })
    .filter((row) => row.stateSlug);
}

export async function getVendorOpportunityUrls() {
  const rows = await getVendorOpportunityRows();

  const urls = new Set<string>();

  for (const row of rows) {
    urls.add(`/vendor-opportunities/${row.stateSlug}`);

    if (row.districtSlug) {
      urls.add(`/vendor-opportunities/${row.stateSlug}/${row.districtSlug}`);
    }

    if (row.districtSlug && row.placeSlug) {
      urls.add(
        `/vendor-opportunities/${row.stateSlug}/${row.districtSlug}/${row.placeSlug}`
      );
    }
  }

  return Array.from(urls);
}

function categoryLabel(row: VendorOpportunitySeoRow) {
  if (row.category && row.category !== "all") return row.category;

  if (row.module === "materials") return "Construction Material";
  if (row.module === "services") return "Service Provider";
  if (row.module === "rentals") return "Rental Provider";
  if (row.module === "property") return "Property Seller";

  return "Vendor";
}

export function opportunityTitle(row: VendorOpportunitySeoRow) {
  if (row.opportunity_title) return row.opportunity_title;

  const location = row.place || row.district || row.state;
  return `Need ${categoryLabel(row)} vendors in ${location}`;
}

export function opportunityDescription(row: VendorOpportunitySeoRow) {
  if (row.opportunity_description) return row.opportunity_description;

  return `Local demand is active for ${categoryLabel(row).toLowerCase()} vendors in ${
    row.place || row.district || row.state
  }. Register your business on 3Bigha to receive local enquiries.`;
}
