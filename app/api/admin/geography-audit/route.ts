import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

async function countTable(supabase: SupabaseClient, table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    table,
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

async function sampleTable(supabase: SupabaseClient, table: string) {
  const { data, error } = await supabase
    .from(table)
    .select("name,slug")
    .order("name", { ascending: true })
    .limit(20);

  return {
    table,
    rows: data ?? [],
    error: error?.message ?? null,
  };
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }
  const supabase = access.admin;
  const tables = [
    "geo_countries",
    "geo_states",
    "geo_districts",
    "geo_subdivisions",
    "geo_blocks",
    "geo_places",
  ];

  const counts = await Promise.all(tables.map((table) => countTable(supabase, table)));
  const samples = await Promise.all(tables.map((table) => sampleTable(supabase, table)));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    counts,
    samples,
  });
}
