import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function searchLocation(term: string) {
  const { data, error } = await supabase
    .from("geo_places")
    .select("*")
    .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
    .limit(20);

  if (error) return [];

  return data ?? [];
}
