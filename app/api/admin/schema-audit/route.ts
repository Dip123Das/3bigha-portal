import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }
  const supabase = access.admin;
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
