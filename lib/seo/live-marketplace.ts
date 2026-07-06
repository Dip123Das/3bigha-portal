import { createClient } from "@supabase/supabase-js";
import type { SeoModule } from "@/lib/geo/india-geo";

export type LiveMarketplaceItem = {
  title: string;
  subtitle: string;
  href: string;
};

export type LiveMarketplaceData = {
  source: "live" | "fallback";
  stats: {
    label: string;
    value: string;
  }[];
  items: LiveMarketplaceItem[];
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}

function normalizeText(value: string) {
  return (value || "").trim();
}

function fallbackData(
  module: SeoModule,
  city: string,
  district: string,
  locality?: string
): LiveMarketplaceData {
  const area = normalizeText(locality || city || district);

  return {
    source: "fallback",
    stats: [
      { label: "Local discovery area", value: area },
      { label: "Marketplace module", value: module },
      { label: "RFQ enabled", value: "Yes" },
      { label: "AI matching", value: "Active" },
    ],
    items: [
      {
        title: `${area} marketplace discovery`,
        subtitle: `Explore local ${module} opportunities in ${district}.`,
        href: `/${module === "property" ? "property" : module}`,
      },
      {
        title: `Post requirement in ${area}`,
        subtitle: "Submit your need and connect with relevant local vendors.",
        href: `/rfq?module=${module}&q=${encodeURIComponent(area)}`,
      },
      {
        title: `Search local ${module}`,
        subtitle: "Find nearby listings, vendors and service providers.",
        href: `/search?module=${module}&q=${encodeURIComponent(area)}`,
      },
    ],
  };
}

function applyGeoFilters(query: any, district: string, city: string, locality?: string) {
  const cleanDistrict = normalizeText(district);
  const cleanCity = normalizeText(city);
  const cleanLocality = normalizeText(locality || "");

  if (cleanLocality) {
    return query.or(
      `locality.ilike.%${cleanLocality}%,city.ilike.%${cleanCity}%,district.ilike.%${cleanDistrict}%`
    );
  }

  if (cleanCity) {
    return query.or(`city.ilike.%${cleanCity}%,district.ilike.%${cleanDistrict}%`);
  }

  if (cleanDistrict) {
    return query.ilike("district", `%${cleanDistrict}%`);
  }

  return query;
}

export async function getLiveMarketplaceData(
  module: SeoModule,
  city: string,
  district: string,
  locality?: string
): Promise<LiveMarketplaceData> {
  const supabase = getSupabase();

  if (!supabase) {
    return fallbackData(module, city, district, locality);
  }

  try {
    if (module === "property") {
      const countQuery = applyGeoFilters(
        supabase.from("property_listings").select("id", { count: "exact", head: true }),
        district,
        city,
        locality
      );

      const { count } = await countQuery;

      const listQuery = applyGeoFilters(
        supabase
          .from("property_listings")
          .select("id,title,property_type,locality,city,district,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        district,
        city,
        locality
      );

      const { data } = await listQuery;

      return {
        source: "live",
        stats: [
          { label: "Property listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: locality || city },
          { label: "RFQ enabled", value: "Yes" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.property_type || `Property in ${locality || city}`,
          subtitle: `${item.locality || item.city || city}, ${item.district || district}`,
          href: `/property/${item.id}`,
        })),
      };
    }

    if (module === "materials") {
      const countQuery = applyGeoFilters(
        supabase.from("material_listings").select("id", { count: "exact", head: true }),
        district,
        city,
        locality
      );

      const { count } = await countQuery;

      const listQuery = applyGeoFilters(
        supabase
          .from("material_listings")
          .select("id,title,category,locality,city,district,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        district,
        city,
        locality
      );

      const { data } = await listQuery;

      return {
        source: "live",
        stats: [
          { label: "Material listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: locality || city },
          { label: "Vendor RFQ", value: "Active" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.category || `Building material in ${locality || city}`,
          subtitle: `${item.locality || item.city || city}, ${item.district || district}`,
          href: `/materials/${item.id}`,
        })),
      };
    }

    if (module === "services") {
      const countQuery = applyGeoFilters(
        supabase.from("service_listings").select("id", { count: "exact", head: true }),
        district,
        city,
        locality
      );

      const { count } = await countQuery;

      const listQuery = applyGeoFilters(
        supabase
          .from("service_listings")
          .select("id,title,service_type,locality,city,district,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        district,
        city,
        locality
      );

      const { data } = await listQuery;

      return {
        source: "live",
        stats: [
          { label: "Service listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: locality || city },
          { label: "Service RFQ", value: "Active" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.service_type || `Service provider in ${locality || city}`,
          subtitle: `${item.locality || item.city || city}, ${item.district || district}`,
          href: `/services/${item.id}`,
        })),
      };
    }

    const countQuery = applyGeoFilters(
      supabase.from("rental_listings").select("id", { count: "exact", head: true }),
      district,
      city,
      locality
    );

    const { count } = await countQuery;

    const listQuery = applyGeoFilters(
      supabase
        .from("rental_listings")
        .select("id,title,rental_type,locality,city,district,created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      district,
      city,
      locality
    );

    const { data } = await listQuery;

    return {
      source: "live",
      stats: [
        { label: "Rental listings", value: `${count || 0}+` },
        { label: "District", value: district },
        { label: "City / Area", value: locality || city },
        { label: "Rental RFQ", value: "Active" },
      ],
      items: (data || []).map((item: any) => ({
        title: item.title || item.rental_type || `Rental option in ${locality || city}`,
        subtitle: `${item.locality || item.city || city}, ${item.district || district}`,
        href: `/rentals/${item.id}`,
      })),
    };
  } catch {
    return fallbackData(module, city, district, locality);
  }
}