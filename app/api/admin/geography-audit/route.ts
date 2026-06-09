import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countTable(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  return {
    table,
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

async function sampleTable(table: string) {
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

export async function GET() {
  const tables = [
    "geo_countries",
    "geo_states",
    "geo_districts",
    "geo_subdivisions",
    "geo_blocks",
    "geo_places",
  ];

  const counts = await Promise.all(tables.map(countTable));
  const samples = await Promise.all(tables.map(sampleTable));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    counts,
    samples,
  });
}
