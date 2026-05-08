import { createClient } from "@supabase/supabase-js";
import type { VendorRecommendationInput } from "@/lib/seo/vendor-recommendation-engine";

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
      city,
      district,
      state,
      locality,
      subscription_plan,
      subscription_status,
      boost_expires_at,
      approval_status
    `
    )
    .limit(30);

  if (error || !data) return [];

  return data
    .filter((row: any) => {
      const vendorId = row.user_id || row.id;
      return vendorId && vendorId !== currentVendorId;
    })
    .map((row: any) => {
      const vendorId = row.user_id || row.id;
      const boostExpiresAt = row.boost_expires_at
        ? new Date(row.boost_expires_at).getTime()
        : 0;

      const isVerified =
        row.approval_status === "approved" ||
        row.subscription_status === "active";

      return {
        vendorId,
        businessName: row.business_name || "3Bigha Vendor",
        slug: slugify(row.business_name || vendorId),
        city: row.city || null,
        district: row.district || null,
        state: row.state || null,
        locality: row.locality || null,
        category: "Marketplace Vendor",
        services: ["Marketplace Service"],
        materials: ["Marketplace Supply"],
        reputationScore: isVerified ? 65 : 50,
        leaderboardScore: isVerified ? 68 : 50,
        authorityScore: isVerified ? 70 : 55,
        conversionRate: 0,
        isVerified,
        boostActive: boostExpiresAt > Date.now(),
      };
    });
}