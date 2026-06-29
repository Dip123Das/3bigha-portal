import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tables = [
  "geo_lgd_states",
  "geo_lgd_districts",
  "geo_lgd_subdistricts",
  "geo_lgd_blocks",
  "geo_lgd_villages",
  "geo_lgd_block_villages",
  "geo_lgd_local_bodies",
  "geo_lgd_wards",
  "geo_lgd_settlements",
];

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(1);

  console.log("\nTABLE:", table);

  if (error) {
    console.log("ERROR:", error.message);
  } else {
    console.log(Object.keys(data?.[0] || {}));
  }
}
