import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ regions: [], units: [] });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: regions, error: regionError } = await supabase
    .from("measurement_regions")
    .select("id,state,district,city,block,mouza,region_slug,warning_note,is_verified")
    .eq("is_verified", true)
    .order("state", { ascending: true })
    .order("district", { ascending: true });

  if (regionError) {
    return NextResponse.json({ regions: [], units: [] });
  }

  const { data: units, error: unitError } = await supabase
    .from("measurement_units")
    .select("id,region_id,unit_name,unit_slug,sqft_value,notes,is_verified")
    .eq("is_verified", true)
    .order("unit_name", { ascending: true });

  if (unitError) {
    return NextResponse.json({ regions: regions || [], units: [] });
  }

  return NextResponse.json({
    regions: regions || [],
    units: units || [],
  });
}
