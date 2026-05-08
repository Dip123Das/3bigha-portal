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

function fallbackData(module: SeoModule, city: string, district: string): LiveMarketplaceData {
  return {
    source: "fallback",
    stats: [
      { label: "Local discovery area", value: city || district },
      { label: "Marketplace module", value: module },
      { label: "RFQ enabled", value: "Yes" },
      { label: "AI matching", value: "Active" },
    ],
    items: [
      {
        title: `${city || district} marketplace discovery`,
        subtitle: `Explore local ${module} opportunities in ${district}.`,
        href: `/${module === "property" ? "property" : module}`,
      },
      {
        title: `Post requirement in ${district}`,
        subtitle: "Submit your need and connect with relevant local vendors.",
        href: "/rfq/general/new",
      },
      {
        title: `Search local ${module}`,
        subtitle: "Find nearby listings, vendors and service providers.",
        href: `/search?module=${module}&q=${encodeURIComponent(city || district)}`,
      },
    ],
  };
}

export async function getLiveMarketplaceData(
  module: SeoModule,
  city: string,
  district: string
): Promise<LiveMarketplaceData> {
  const supabase = getSupabase();

  if (!supabase) {
    return fallbackData(module, city, district);
  }

  try {
    if (module === "property") {
      const { count } = await supabase
        .from("property_listings")
        .select("id", { count: "exact", head: true });

      const { data } = await supabase
        .from("property_listings")
        .select("id,title,property_type,city,district,created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        source: "live",
        stats: [
          { label: "Property listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: city },
          { label: "RFQ enabled", value: "Yes" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.property_type || `Property in ${city}`,
          subtitle: `${item.city || city}, ${item.district || district}`,
          href: `/property/${item.id}`,
        })),
      };
    }

    if (module === "materials") {
      const { count } = await supabase
        .from("material_listings")
        .select("id", { count: "exact", head: true });

      const { data } = await supabase
        .from("material_listings")
        .select("id,title,category,city,district,created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        source: "live",
        stats: [
          { label: "Material listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: city },
          { label: "Vendor RFQ", value: "Active" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.category || `Building material in ${city}`,
          subtitle: `${item.city || city}, ${item.district || district}`,
          href: `/materials/${item.id}`,
        })),
      };
    }

    if (module === "services") {
      const { count } = await supabase
        .from("service_listings")
        .select("id", { count: "exact", head: true });

      const { data } = await supabase
        .from("service_listings")
        .select("id,title,service_type,city,district,created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        source: "live",
        stats: [
          { label: "Service listings", value: `${count || 0}+` },
          { label: "District", value: district },
          { label: "City / Area", value: city },
          { label: "Service RFQ", value: "Active" },
        ],
        items: (data || []).map((item: any) => ({
          title: item.title || item.service_type || `Service provider in ${city}`,
          subtitle: `${item.city || city}, ${item.district || district}`,
          href: `/services/${item.id}`,
        })),
      };
    }

    const { count } = await supabase
      .from("rental_listings")
      .select("id", { count: "exact", head: true });

    const { data } = await supabase
      .from("rental_listings")
      .select("id,title,rental_type,city,district,created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    return {
      source: "live",
      stats: [
        { label: "Rental listings", value: `${count || 0}+` },
        { label: "District", value: district },
        { label: "City / Area", value: city },
        { label: "Rental RFQ", value: "Active" },
      ],
      items: (data || []).map((item: any) => ({
        title: item.title || item.rental_type || `Rental option in ${city}`,
        subtitle: `${item.city || city}, ${item.district || district}`,
        href: `/rentals/${item.id}`,
      })),
    };
  } catch {
    return fallbackData(module, city, district);
  }
}