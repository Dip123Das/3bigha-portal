import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveCustomerLgd(client: SupabaseClient, stateCode: number, districtCode: number) {
  if (![stateCode, districtCode].every((code) => Number.isSafeInteger(code) && code > 0)) return null;

  const [state, district] = await Promise.all([
    client.from("geo_lgd_states").select("name_en").eq("lgd_state_code", stateCode).eq("is_active", true).maybeSingle(),
    client.from("geo_lgd_districts").select("name_en").eq("lgd_district_code", districtCode)
      .eq("lgd_state_code", stateCode).eq("is_active", true).maybeSingle(),
  ]);
  if (state.error) throw state.error;
  if (district.error) throw district.error;
  if (!state.data || !district.data) return null;

  return {
    state: state.data.name_en as string,
    city: district.data.name_en as string,
    lgd_state_code: stateCode,
    lgd_district_code: districtCode,
  };
}
