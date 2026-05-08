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

export type VendorReputationData = {
  totalMatches: number;
  totalSelected: number;
  totalConverted: number;
  rfqActivityCount: number;
  conversionRate: number;
  reputationScore: number;
};

export async function getVendorReputationData(
  vendorUserId: string
): Promise<VendorReputationData> {
  const fallback: VendorReputationData = {
    totalMatches: 0,
    totalSelected: 0,
    totalConverted: 0,
    rfqActivityCount: 0,
    conversionRate: 0,
    reputationScore: 50,
  };

  const supabase = getAdminClient();

  if (!supabase || !vendorUserId) {
    return fallback;
  }

  const { data: metrics } = await supabase
    .from("vendor_performance_metrics")
    .select("total_matches,total_selected,total_converted")
    .eq("vendor_user_id", vendorUserId)
    .maybeSingle();

  const totalMatches = Number(metrics?.total_matches || 0);
  const totalSelected = Number(metrics?.total_selected || 0);
  const totalConverted = Number(metrics?.total_converted || 0);

  const conversionRate =
    totalMatches > 0
      ? Math.round((totalConverted / totalMatches) * 100)
      : 0;

  const { count: rfqActivityCount } = await supabase
    .from("vendor_notifications")
    .select("id", { count: "exact", head: true })
    .eq("vendor_user_id", vendorUserId);

  const reputationScore = Math.min(
    100,
    Math.max(
      30,
      50 +
        Math.min(20, totalMatches * 2) +
        Math.min(15, totalSelected * 3) +
        Math.min(15, totalConverted * 5) +
        Math.min(10, Number(rfqActivityCount || 0))
    )
  );

  return {
    totalMatches,
    totalSelected,
    totalConverted,
    rfqActivityCount: Number(rfqActivityCount || 0),
    conversionRate,
    reputationScore,
  };
}