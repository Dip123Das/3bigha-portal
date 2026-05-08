import { createClient } from "@supabase/supabase-js";
import type { SeoModule } from "@/lib/geo/india-geo";

export type LiveDbMarketData = {
  source: "live" | "fallback";
  listingCount: number;
  latestCount: number;
  rfqEnabled: boolean;
};

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function tableForModule(module: SeoModule) {
  if (module === "property") return "property_listings";
  if (module === "materials") return "material_listings";
  if (module === "services") return "service_listings";
  return "rental_listings";
}

export async function getLiveDbMarketData({
  module,
  city,
  district,
}: {
  module: SeoModule;
  city: string;
  district: string;
}): Promise<LiveDbMarketData> {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      source: "fallback",
      listingCount: 0,
      latestCount: 0,
      rfqEnabled: true,
    };
  }

  try {
    const table = tableForModule(module);

    const countQuery = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .or(`city.ilike.%${city}%,district.ilike.%${district}%`);

    const { count } = await countQuery;

    const latestQuery = supabase
      .from(table)
      .select("id")
      .or(`city.ilike.%${city}%,district.ilike.%${district}%`)
      .order("created_at", { ascending: false })
      .limit(12);

    const { data } = await latestQuery;

    return {
      source: "live",
      listingCount: count || 0,
      latestCount: data?.length || 0,
      rfqEnabled: true,
    };
  } catch {
    return {
      source: "fallback",
      listingCount: 0,
      latestCount: 0,
      rfqEnabled: true,
    };
  }
}