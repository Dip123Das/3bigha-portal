import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

for (const table of ["service_listings", "services", "service_providers"]) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  console.log("\n" + table);
  if (error) console.log("ERROR:", error.message);
  else {
    console.log(Object.keys(data?.[0] || {}).join(", "));
    console.log(data?.[0] || null);
  }
}
