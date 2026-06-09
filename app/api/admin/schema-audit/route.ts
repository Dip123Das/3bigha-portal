import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const tables = [
    "property_listings",
    "material_listings",
    "service_listings",
    "rental_listings",
    "business_profiles",
  ];

  const result: Record<string, any> = {};

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .limit(1);

    result[table] = {
      error: error?.message ?? null,
      sample: data?.[0] ?? null,
    };
  }

  return NextResponse.json(result);
}
