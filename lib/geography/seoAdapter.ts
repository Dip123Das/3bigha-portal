import { createClient } from "@supabase/supabase-js";
import type { SeoModule } from "@/lib/geo/india-geo";
import { getSeoCategories } from "@/lib/seo/category-slugs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SeoGeoCity = {
  state: string;
  stateSlug: string;
  district: string;
  districtSlug: string;
  city: string;
  citySlug: string;
  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;
};

export async function getSeoGeoBySlugs(
  stateSlug: string,
  districtSlug: string,
  citySlug: string
): Promise<SeoGeoCity | null> {
  const { data, error } = await supabase
    .from("geo_places")
    .select(`
      id,
      name,
      slug,
      block_id,
      subdivision_id,
      district_id,
      state_id,
      geo_states:state_id(id,name,slug),
      geo_districts:district_id(id,name,slug),
      geo_subdivisions:subdivision_id(id,name,slug),
      geo_blocks:block_id(id,name,slug)
    `)
    .eq("slug", citySlug)
    .eq("geo_states.slug", stateSlug)
    .eq("geo_districts.slug", districtSlug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const state: any = Array.isArray((data as any).geo_states)
    ? (data as any).geo_states[0]
    : (data as any).geo_states;

  const district: any = Array.isArray((data as any).geo_districts)
    ? (data as any).geo_districts[0]
    : (data as any).geo_districts;

  const subdivision: any = Array.isArray((data as any).geo_subdivisions)
    ? (data as any).geo_subdivisions[0]
    : (data as any).geo_subdivisions;

  const block: any = Array.isArray((data as any).geo_blocks)
    ? (data as any).geo_blocks[0]
    : (data as any).geo_blocks;

  return {
    state: state?.name || "",
    stateSlug: state?.slug || stateSlug,
    district: district?.name || "",
    districtSlug: district?.slug || districtSlug,
    city: (data as any).name || "",
    citySlug: (data as any).slug || citySlug,
    geo_state_id: state?.id || (data as any).state_id || null,
    geo_district_id: district?.id || (data as any).district_id || null,
    geo_subdivision_id: subdivision?.id || (data as any).subdivision_id || null,
    geo_block_id: block?.id || (data as any).block_id || null,
    geo_place_id: (data as any).id || null,
  };
}

export async function getSeoGeoCities(limit = 500): Promise<SeoGeoCity[]> {
  const { data, error } = await supabase
    .from("geo_places")
    .select(`
      id,
      name,
      slug,
      block_id,
      subdivision_id,
      district_id,
      state_id,
      geo_states:state_id(id,name,slug),
      geo_districts:district_id(id,name,slug),
      geo_subdivisions:subdivision_id(id,name,slug),
      geo_blocks:block_id(id,name,slug)
    `)
    .order("name", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row: any) => {
    const state = Array.isArray(row.geo_states) ? row.geo_states[0] : row.geo_states;
    const district = Array.isArray(row.geo_districts) ? row.geo_districts[0] : row.geo_districts;
    const subdivision = Array.isArray(row.geo_subdivisions) ? row.geo_subdivisions[0] : row.geo_subdivisions;
    const block = Array.isArray(row.geo_blocks) ? row.geo_blocks[0] : row.geo_blocks;

    return {
      state: state?.name || "",
      stateSlug: state?.slug || "",
      district: district?.name || "",
      districtSlug: district?.slug || "",
      city: row.name || "",
      citySlug: row.slug || "",
      geo_state_id: state?.id || row.state_id || null,
      geo_district_id: district?.id || row.district_id || null,
      geo_subdivision_id: subdivision?.id || row.subdivision_id || null,
      geo_block_id: block?.id || row.block_id || null,
      geo_place_id: row.id || null,
    };
  });
}

export async function getSeoRegionalPathsFromDb(
  modules: readonly SeoModule[]
) {
  const cities = await getSeoGeoCities();

  return modules.flatMap((module) =>
    cities
      .filter((geo) => geo.stateSlug && geo.districtSlug && geo.citySlug)
      .map((geo) => ({
        module,
        state: geo.stateSlug,
        district: geo.districtSlug,
        city: geo.citySlug,
      }))
  );
}

export async function getSeoCategoryPathsFromDb(
  modules: readonly SeoModule[]
) {
  const cities = await getSeoGeoCities(500);

  return modules.flatMap((module) =>
    cities
      .filter((geo) => geo.stateSlug && geo.districtSlug && geo.citySlug)
      .flatMap((geo) =>
        getSeoCategories(module).map((category) => ({
          module,
          state: geo.stateSlug,
          district: geo.districtSlug,
          city: geo.citySlug,
          category: category.slug,
        }))
      )
  );
}


export async function getSeoStatePathsFromDb(modules: readonly SeoModule[]) {
  const { data, error } = await supabase
    .from("geo_states")
    .select("slug")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(100);

  if (error || !Array.isArray(data)) return [];

  const states = data
    .map((row: any) => String(row.slug || "").trim())
    .filter(Boolean);

  return modules.flatMap((module) =>
    states.map((state) => ({
      module,
      state,
    }))
  );
}

export async function getSeoDistrictPathsFromDb(modules: readonly SeoModule[]) {
  const { data, error } = await supabase
    .from("geo_districts")
    .select("slug, geo_states:state_id(slug)")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(500);

  if (error || !Array.isArray(data)) return [];

  const districts = data
    .map((row: any) => {
      const state = Array.isArray(row.geo_states) ? row.geo_states[0] : row.geo_states;

      return {
        state: state?.slug || "",
        district: row.slug || "",
      };
    })
    .filter((row) => row.state && row.district);

  return modules.flatMap((module) =>
    districts.map((item) => ({
      module,
      state: item.state,
      district: item.district,
    }))
  );
}

export async function getAllSeoUrlsFromDb(modules: readonly SeoModule[]) {
  const [states, districts, cities, categories] = await Promise.all([
    getSeoStatePathsFromDb(modules),
    getSeoDistrictPathsFromDb(modules),
    getSeoRegionalPathsFromDb(modules),
    getSeoCategoryPathsFromDb(modules),
  ]);

  return [
    ...states.map((item) => `/seo/${item.module}/${item.state}`),
    ...districts.map((item) => `/seo/${item.module}/${item.state}/${item.district}`),
    ...cities.map((item) => `/seo/${item.module}/${item.state}/${item.district}/${item.city}`),
    ...categories.map((item) => `/seo/${item.module}/${item.state}/${item.district}/${item.city}/category/${item.category}`),
  ];
}
