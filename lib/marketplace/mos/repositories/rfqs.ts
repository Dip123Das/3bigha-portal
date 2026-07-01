function moneyFromMeta(meta: any) {
  const value =
    meta?.budget ??
    meta?.expectedBudget ??
    meta?.estimated_budget ??
    meta?.estimatedValue ??
    meta?.estimated_value ??
    0;

  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function getDemandRfqsForProfile(supabase: any, profile: any) {
  let query = supabase
    .from("rfqs")
    .select("id,requester_user_id,module,status,title,city,district,locality,pincode,created_at,meta,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .in("status", ["open", "active", "new"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (profile?.geo_place_id) query = query.eq("geo_place_id", profile.geo_place_id);
  else if (profile?.geo_block_id) query = query.eq("geo_block_id", profile.geo_block_id);
  else if (profile?.geo_district_id) query = query.eq("geo_district_id", profile.geo_district_id);
  else if (profile?.district) query = query.ilike("district", profile.district);
  else if (profile?.state) query = query.ilike("city", profile.city || profile.state);

  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];

  return data.map((row: any) => ({
    ...row,
    estimated_value: moneyFromMeta(row.meta),
  }));
}
