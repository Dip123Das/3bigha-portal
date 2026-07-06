import { createClient } from "@supabase/supabase-js";
import GeographyOperationsPanel from "@/components/admin/geography/GeographyOperationsPanel";
import GeographyEditorGrid from "@/components/admin/GeographyEditorGrid";

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


async function geographyHierarchy() {
  const [states, districts, subdivisions, blocks, places] = await Promise.all([
    supabase.from("geo_states").select("id,name,slug").order("name", { ascending: true }),
    supabase.from("geo_districts").select("id,state_id,name,slug").order("name", { ascending: true }),
    supabase.from("geo_subdivisions").select("id,district_id,name,slug").order("name", { ascending: true }),
    supabase.from("geo_blocks").select("id,district_id,subdivision_id,name,slug").order("name", { ascending: true }),
    supabase.from("geo_places").select("id,district_id,subdivision_id,block_id,name,slug,place_type,pincode").order("name", { ascending: true }).limit(500),
  ]);

  return {
    states: states.data ?? [],
    districts: districts.data ?? [],
    subdivisions: subdivisions.data ?? [],
    blocks: blocks.data ?? [],
    places: places.data ?? [],
  };
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

  const hierarchy = await geographyHierarchy();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="w-full">
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

        <GeographyOperationsPanel />

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




        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-xl font-black text-blue-950">
            Bulk Geography Import
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-blue-900">
            Use CSV import for large geography expansion. This is the safest way
            to add districts, subdivisions, blocks and places without manually
            entering thousands of records.
          </p>

          <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Required CSV Format
            </p>

            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs font-bold text-white">
{`state,district,subdivision,block,place,place_type,pincode
West Bengal,Cooch Behar,Cooch Behar Sadar,Cooch Behar II,Khagrabari,locality,736179
West Bengal,Cooch Behar,Dinhata,Dinhata I,Dinhata,town,736135`}
            </pre>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Git Bash Import Command
            </p>

            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs font-bold text-white">
{`node scripts/geography/import-geography-csv.js data/geography/your-file.csv`}
            </pre>
          </div>

          <p className="mt-4 text-xs font-bold text-blue-800">
            Recommended order: West Bengal complete → Assam → Bihar → Jharkhand
            → Odisha → all India.
          </p>
        </div>


        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Geography Editor
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Review, search and manage geography records.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <GeographyEditorGrid
              title="States"
              rows={hierarchy.states}
            />

            <GeographyEditorGrid
              title="Districts"
              rows={hierarchy.districts}
            />

            <GeographyEditorGrid
              title="Subdivisions"
              rows={hierarchy.subdivisions}
            />

            <GeographyEditorGrid
              title="Blocks"
              rows={hierarchy.blocks}
            />

            <GeographyEditorGrid
              title="Places"
              rows={hierarchy.places}
            />
          </div>
        </div>


        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Geography Hierarchy
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            State → District → Subdivision → Block → Place structure currently available in the geography master database.
          </p>

          <div className="mt-5 space-y-4">
            {hierarchy.states.map((state: any) => {
              const stateDistricts = hierarchy.districts.filter((district: any) => district.state_id === state.id);

              return (
                <details key={state.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-base font-black text-slate-950">
                    {state.name} · {stateDistricts.length} districts
                  </summary>

                  <div className="mt-4 space-y-3">
                    {stateDistricts.map((district: any) => {
                      const districtSubdivisions = hierarchy.subdivisions.filter((subdivision: any) => subdivision.district_id === district.id);
                      const districtBlocks = hierarchy.blocks.filter((block: any) => block.district_id === district.id);
                      const districtPlaces = hierarchy.places.filter((place: any) => place.district_id === district.id);

                      return (
                        <details key={district.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <summary className="cursor-pointer text-sm font-black text-slate-900">
                            {district.name} · {districtSubdivisions.length} subdivisions · {districtBlocks.length} blocks · {districtPlaces.length} places
                          </summary>

                          <div className="mt-3 space-y-3">
                            {districtSubdivisions.map((subdivision: any) => {
                              const subdivisionBlocks = hierarchy.blocks.filter((block: any) => block.subdivision_id === subdivision.id);
                              const subdivisionPlaces = hierarchy.places.filter((place: any) => place.subdivision_id === subdivision.id);

                              return (
                                <details key={subdivision.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                  <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-700">
                                    {subdivision.name} · {subdivisionBlocks.length} blocks · {subdivisionPlaces.length} places
                                  </summary>

                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    {subdivisionBlocks.map((block: any) => {
                                      const blockPlaces = hierarchy.places.filter((place: any) => place.block_id === block.id);

                                      return (
                                        <div key={block.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                          <div className="text-sm font-black text-slate-900">
                                            {block.name}
                                          </div>
                                          <div className="mt-1 text-xs font-bold text-slate-500">
                                            {blockPlaces.length} places
                                          </div>

                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {blockPlaces.length ? (
                                              blockPlaces.slice(0, 20).map((place: any) => (
                                                <span key={place.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                                                  {place.name}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-xs font-bold text-slate-400">No places yet</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
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
