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

async function samplePlaces() {
  const { data } = await supabase
    .from("geo_places")
    .select("id,name,slug")
    .order("name", { ascending: true })
    .limit(20);

  return data ?? [];
}

async function coverage(table: string) {
  const { count: total } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  const { count: mapped } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .not("geo_state_id", "is", null);

  const totalCount = total ?? 0;
  const mappedCount = mapped ?? 0;

  return {
    table,
    total: totalCount,
    mapped: mappedCount,
    pending: Math.max(totalCount - mappedCount, 0),
    percent: totalCount ? Math.round((mappedCount / totalCount) * 100) : 0,
  };
}

export default async function GeographyAdminPage() {
  const counts = await Promise.all([
    countTable("geo_countries"),
    countTable("geo_states"),
    countTable("geo_districts"),
    countTable("geo_subdivisions"),
    countTable("geo_blocks"),
    countTable("geo_places"),
  ]);

  const places = await samplePlaces();

  const coverageRows = await Promise.all([
    coverage("property_listings"),
    coverage("material_listings"),
    coverage("service_listings"),
    coverage("rental_listings"),
    coverage("business_profiles"),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-700">
            3Bigha Geography Intelligence
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Geography Control Center
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Monitor national geography master data before enabling large-scale
            search, RFQ routing, vendor matching and SEO geography expansion.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {counts.map((item) => (
            <div
              key={item.table}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                {item.table.replace("geo_", "").replace("_", " ")}
              </div>

              <div className="mt-3 text-4xl font-black text-slate-950">
                {item.count}
              </div>

              {item.error ? (
                <p className="mt-2 text-xs font-bold text-red-600">
                  {item.error}
                </p>
              ) : (
                <p className="mt-2 text-xs font-bold text-emerald-700">
                  Connected
                </p>
              )}
            </div>
          ))}
        </div>


        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Marketplace Geography Coverage
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Shows how many records already have geography IDs attached after resolver backfill.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {coverageRows.map((row) => (
              <div
                key={row.table}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {row.table.replace("_listings", "").replace("business_profiles", "vendors").replace("_", " ")}
                </div>

                <div className="mt-3 text-3xl font-black text-slate-950">
                  {row.percent}%
                </div>

                <div className="mt-2 text-xs font-bold text-slate-600">
                  {row.mapped} / {row.total} mapped
                </div>

                <div className="mt-1 text-xs font-bold text-amber-700">
                  {row.pending} pending
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Current Places Sample
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {places.length ? (
              places.map((place) => (
                <div
                  key={place.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="font-black text-slate-900">{place.name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {place.slug}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">
                No places found.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-amber-950">
            Next Data Priority
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
            Expand geo_places first. Recommended immediate target: Cooch Behar
            Town, Tufanganj, Dinhata, Mathabhanga, Mekhliganj, Natabari,
            Dinhata Road, Rail Ghumti, New Town and Pilkhana.
          </p>
        </div>
      </section>
    </main>
  );
}
