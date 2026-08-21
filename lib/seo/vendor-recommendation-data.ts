import { createClient } from "@supabase/supabase-js";
import type { VendorRecommendationInput } from "@/lib/seo/vendor-recommendation-engine";
import { loadCanonicalTrustBulk } from "@/lib/trust";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferExpertise(row: any) {
  const text = [
    row.business_name,
    row.business_type,
    row.category,
    row.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("cement")) {
    return {
      category: "Construction Materials",
      services: ["Cement Supply", "Building Material Delivery"],
      materials: ["Cement", "Sand", "Bricks"],
    };
  }

  if (text.includes("steel") || text.includes("tmt")) {
    return {
      category: "Construction Materials",
      services: ["Steel Supply", "Construction Delivery"],
      materials: ["TMT Steel", "Steel", "Cement"],
    };
  }

  if (text.includes("electric")) {
    return {
      category: "Electrical Services",
      services: ["Electrical Work", "Wiring", "Repair"],
      materials: ["Wires", "Switches", "Electrical Fittings"],
    };
  }

  if (text.includes("plumb")) {
    return {
      category: "Plumbing Services",
      services: ["Plumbing Work", "Pipe Fitting", "Repair"],
      materials: ["Pipes", "Bathroom Fittings", "Plumbing Materials"],
    };
  }

  return {
    category: "Marketplace Vendor",
    services: ["Marketplace Service"],
    materials: ["Marketplace Supply"],
  };
}

export async function getVendorRecommendationCandidates(
  currentVendorId: string
): Promise<VendorRecommendationInput[]> {
  const supabase = getAdminClient();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("business_profiles")
    .select(
      `
      id,
      user_id,
      business_name,
      business_type,
      description,
      category,

      city,
      district,
      state,
      locality,
      pincode,

      geo_state_id,
      geo_district_id,
      geo_subdivision_id,
      geo_block_id,
      geo_place_id,

      delivery_radius_km,
      preferred_service_area,
      statewide_service,
      nationwide_service,

      preferred_geo_districts,
      preferred_geo_subdivisions,
      preferred_geo_blocks,
      preferred_geo_places,

      subscription_plan,
      subscription_status,
      boost_expires_at,
      approval_status
    `
    )
    .limit(50);

  if (error || !data) return [];

  const candidateRows = data.filter((row: any) => {
    const vendorId = row.user_id || row.id;
    return vendorId && vendorId !== currentVendorId;
  });

  const canonicalTrustByUserId =
    await loadCanonicalTrustBulk(
      supabase,
      candidateRows
        .map((row: any) => String(row.user_id || ""))
        .filter(Boolean),
      { subject: "business" }
    );

  return candidateRows
    .filter((row: any) => Boolean(row.user_id || row.id))
    .map((row: any) => {
      const vendorId = row.user_id || row.id;
      const boostExpiresAt = row.boost_expires_at
        ? new Date(row.boost_expires_at).getTime()
        : 0;

      const canonicalTrust =
        canonicalTrustByUserId.get(String(row.user_id || ""));

      const isVerified =
        canonicalTrust?.mayDisplayVerifiedBadge === true;

      const expertise = inferExpertise(row);

      return {
        vendorId,
        businessName: row.business_name || "3Bigha Vendor",
        slug: slugify(row.business_name || vendorId),
        city: row.city || null,
        district: row.district || null,
        state: row.state || null,
        locality: row.locality || null,
        pincode: row.pincode || null,

        geo_state_id: row.geo_state_id || null,
        geo_district_id: row.geo_district_id || null,
        geo_subdivision_id: row.geo_subdivision_id || null,
        geo_block_id: row.geo_block_id || null,
        geo_place_id: row.geo_place_id || null,

        delivery_radius_km: Number(row.delivery_radius_km || 0) || null,
        preferred_service_area: row.preferred_service_area || null,
        statewide_service: row.statewide_service === true,
        nationwide_service: row.nationwide_service === true,

        preferred_geo_districts: row.preferred_geo_districts || [],
        preferred_geo_subdivisions: row.preferred_geo_subdivisions || [],
        preferred_geo_blocks: row.preferred_geo_blocks || [],
        preferred_geo_places: row.preferred_geo_places || [],

        category: expertise.category,
        services: expertise.services,
        materials: expertise.materials,
        reputationScore: isVerified ? 68 : 52,
        leaderboardScore: isVerified ? 70 : 52,
        authorityScore: isVerified ? 72 : 56,
        conversionRate: 0,
        isVerified,
        boostActive: boostExpiresAt > Date.now(),
      };
    });
}
