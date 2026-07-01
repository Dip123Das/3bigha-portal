export async function getVendorBusinessProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id,user_id,business_name,city,district,state,locality,pincode,service_radius_km,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
