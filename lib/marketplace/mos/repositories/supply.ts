export async function countVendorsForProfile(supabase: any, profile: any) {
  let query = supabase
    .from("business_profiles")
    .select("id", { count: "exact", head: true });

  if (profile?.geo_place_id) query = query.eq("geo_place_id", profile.geo_place_id);
  else if (profile?.geo_block_id) query = query.eq("geo_block_id", profile.geo_block_id);
  else if (profile?.geo_district_id) query = query.eq("geo_district_id", profile.geo_district_id);
  else if (profile?.district) query = query.ilike("district", profile.district);
  else if (profile?.state) query = query.ilike("state", profile.state);

  const { count, error } = await query;

  if (error) return 0;
  return count || 0;
}
