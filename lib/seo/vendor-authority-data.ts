import { createClient } from "@supabase/supabase-js";

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
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  boostActive: boolean;
  isVerified: boolean;
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

  return {
    vendorId: matched.user_id || matched.id,
    businessName: matched.business_name || "3Bigha Vendor",
    slug,
    city: matched.city || null,
    district: matched.district || null,
    state: matched.state || null,
    locality: matched.locality || null,
    subscriptionPlan: matched.subscription_plan || null,
    subscriptionStatus: matched.subscription_status || null,
    boostActive: boostExpiresAt > Date.now(),
    isVerified:
      matched.approval_status === "approved" ||
      matched.subscription_status === "active",
  };
}