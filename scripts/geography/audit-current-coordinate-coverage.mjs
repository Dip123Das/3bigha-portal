import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const table of ["geo_states", "geo_districts", "geo_subdivisions", "geo_blocks", "geo_places"]) {
  let total = 0, good = 0, zero = 0;
  let lastId = null;

  while (true) {
    let q = supabase.from(table).select("id,latitude,longitude").order("id", { ascending: true }).limit(5000);
    if (lastId) q = q.gt("id", lastId);

    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;

    for (const r of data) {
      total++;
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (lat === 0 && lng === 0) zero++;
      if (lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98) good++;
    }

    lastId = data[data.length - 1].id;
  }

  console.log({ table, total, good, zero });
}
