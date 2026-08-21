import { createClient } from "@supabase/supabase-js";

import {
  loadCanonicalTrust,
  type CanonicalTrustModel,
} from "@/lib/trust";

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

export type VendorAuthorityData = {
  vendorId: string;
  businessName: string;
  slug: string;
  city: string | null;
  district: string | null;
  state: string | null;
  locality: string | null;

  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;

  deliveryRadiusKm?: number | null;
  preferredServiceArea?: string | null;
  statewideService?: boolean;
  nationwideService?: boolean;

  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  boostActive: boolean;
  isVerified: boolean;
  trust: CanonicalTrustModel;
};

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getVendorAuthorityDataBySlug(
  slug: string
): Promise<VendorAuthorityData | null> {
  const supabase = getAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("business_profiles")
    .select(
      `
      id,
      user_id,
      business_name,
      city,
      district,
      state,
      locality,

      geo_state_id,
      geo_district_id,
      geo_subdivision_id,
      geo_block_id,
      geo_place_id,

      delivery_radius_km,
      preferred_service_area,
      statewide_service,
      nationwide_service,

      subscription_plan,
      subscription_status,
      boost_expires_at,
      approval_status
    `
    );

  if (error || !data) {
    return null;
  }

  const matched = data.find((row: any) => {
    const rowSlug = normalizeSlug(row.business_name || row.id || "");
    return rowSlug === slug;
  });

  if (!matched) {
    return null;
  }

  const boostExpiresAt = matched.boost_expires_at
    ? new Date(matched.boost_expires_at).getTime()
    : 0;

  const vendorId = matched.user_id || matched.id;
  const trust = await loadCanonicalTrust(
    supabase,
    vendorId,
    {
      subject: "business",
    }
  );

  return {
    vendorId,
    businessName: matched.business_name || "3Bigha Vendor",
    slug,
    city: matched.city || null,
    district: matched.district || null,
    state: matched.state || null,
    locality: matched.locality || null,

    geo_state_id: matched.geo_state_id || null,
    geo_district_id: matched.geo_district_id || null,
    geo_subdivision_id: matched.geo_subdivision_id || null,
    geo_block_id: matched.geo_block_id || null,
    geo_place_id: matched.geo_place_id || null,

    deliveryRadiusKm: Number(matched.delivery_radius_km || 0) || null,
    preferredServiceArea: matched.preferred_service_area || null,
    statewideService: matched.statewide_service === true,
    nationwideService: matched.nationwide_service === true,

    subscriptionPlan: matched.subscription_plan || null,
    subscriptionStatus: matched.subscription_status || null,
    boostActive: boostExpiresAt > Date.now(),
    isVerified: trust.mayDisplayVerifiedBadge,
    trust,
  };
}
