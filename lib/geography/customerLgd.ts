import type { SupabaseClient } from "@supabase/supabase-js";

type CustomerLgdSelection = {
  mode?: "rural" | "urban";
  subdivision?: { id: string } | null;
  block?: { id: string } | null;
  place?: { id: string } | null;
};

export async function resolveCustomerLgd(
  client: SupabaseClient,
  stateCode: number,
  districtCode: number,
  selection?: CustomerLgdSelection,
) {
  if (![stateCode, districtCode].every((code) => Number.isSafeInteger(code) && code > 0)) return null;

  const [state, district] = await Promise.all([
    client.from("geo_lgd_states").select("name_en").eq("lgd_state_code", stateCode).eq("is_active", true).maybeSingle(),
    client.from("geo_lgd_districts").select("name_en").eq("lgd_district_code", districtCode)
      .eq("lgd_state_code", stateCode).eq("is_active", true).maybeSingle(),
  ]);
  if (state.error) throw state.error;
  if (district.error) throw district.error;
  if (!state.data || !district.data) return null;

  // Keep district-only clients compatible. A full selection explicitly clears the unused branch.
  const area = selection ? await resolveCustomerLocalArea(client, districtCode, selection) : {};
  if (!area) return null;

  return {
    ...area,
    state: state.data.name_en as string,
    city: district.data.name_en as string,
    lgd_state_code: stateCode,
    lgd_district_code: districtCode,
  };
}

async function resolveCustomerLocalArea(
  client: SupabaseClient,
  districtCode: number,
  selection: CustomerLgdSelection,
) {
  const subdivision = selection.subdivision ? Number(selection.subdivision.id) : null;
  const block = selection.block ? Number(selection.block.id) : null;
  const place = selection.place ? Number(selection.place.id) : null;
  if ([subdivision, block, place].some((code) => code !== null && (!Number.isSafeInteger(code) || code <= 0))) {
    return null;
  }

  const urban = selection.mode === "urban";
  if (place !== null && block === null) return null;
  if (!urban && block !== null && subdivision === null) return null;

  const lookups = [];
  if (urban && block !== null) {
    lookups.push(
      client.from("geo_lgd_local_body_districts").select("lgd_local_body_code")
        .eq("lgd_local_body_code", block).eq("lgd_district_code", districtCode).limit(1).maybeSingle(),
      client.from("geo_lgd_local_bodies").select("lgd_local_body_code")
        .eq("lgd_local_body_code", block).eq("local_body_category", "URBAN").eq("is_active", true).maybeSingle(),
    );
    if (place !== null) {
      lookups.push(client.from("geo_lgd_wards").select("lgd_ward_code")
        .eq("lgd_ward_code", place).eq("lgd_local_body_code", block).eq("is_active", true).maybeSingle());
    }
  }
  if (!urban && subdivision !== null) {
    lookups.push(client.from("geo_lgd_subdistricts").select("lgd_subdistrict_code")
      .eq("lgd_subdistrict_code", subdivision).eq("lgd_district_code", districtCode).eq("is_active", true).maybeSingle());
    if (block !== null) {
      lookups.push(client.from("geo_lgd_blocks").select("lgd_block_code")
        .eq("lgd_block_code", block).eq("lgd_district_code", districtCode).eq("is_active", true).maybeSingle());
      if (place !== null) {
        lookups.push(
          client.from("geo_lgd_villages").select("lgd_village_code")
            .eq("lgd_village_code", place).eq("lgd_district_code", districtCode)
            .eq("lgd_subdistrict_code", subdivision).eq("is_active", true).maybeSingle(),
          client.from("geo_lgd_block_villages").select("lgd_village_code")
            .eq("lgd_block_code", block).eq("lgd_village_code", place).limit(1).maybeSingle(),
        );
      }
    }
  }

  const results = await Promise.all(lookups);
  for (const result of results) if (result.error) throw result.error;
  if (results.some((result) => !result.data)) return null;

  return {
    lgd_subdistrict_code: urban ? null : subdivision,
    lgd_block_code: urban ? null : block,
    lgd_village_code: urban ? null : place,
    lgd_local_body_code: urban ? block : null,
    lgd_ward_code: urban ? place : null,
  };
}
