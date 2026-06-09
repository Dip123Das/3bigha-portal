import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getStateBySlug(slug: string) {
  const { data, error } = await supabase
    .from("geo_states")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}
