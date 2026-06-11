import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type GeoNameMap = Map<string, string>;

async function loadGeoNameMap(table: string) {
  const { data } = await supabase.from(table).select("id,name").limit(1000);
  const map: GeoNameMap = new Map();

  for (const row of data || []) {
    if (row?.id && row?.name) map.set(String(row.id), String(row.name));
  }

  return map;
}

function geoName(map: GeoNameMap, id: string | null | undefined) {
  if (!id) return "—";
  return map.get(id) || "Unknown";
}

export default async function VendorRecruitmentPage() {
  const [
    recruitmentRes,
    stateNames,
    districtNames,
    subdivisionNames,
    blockNames,
    placeNames,
  ] = await Promise.all([
    supabase
      .from("marketplace_vendor_recruitment_queue")
      .select("*")
      .order("shortage_score", { ascending: false })
      .limit(200),
    loadGeoNameMap("geo_states"),
    loadGeoNameMap("geo_districts"),
    loadGeoNameMap("geo_subdivisions"),
    loadGeoNameMap("geo_blocks"),
    loadGeoNameMap("geo_places"),
  ]);

  const rows = recruitmentRes.data || [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            3Bigha Growth Operations
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Vendor Recruitment Command Center
          </h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            State, district, subdivision, block and locality-wise vendor demand.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-black uppercase text-slate-500">
              Recruitment Targets
            </div>
            <div className="mt-2 text-4xl font-black text-slate-950">
              {rows.length}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-black uppercase text-amber-700">
              Vendors Needed
            </div>
            <div className="mt-2 text-4xl font-black text-amber-950">
              {rows.reduce(
                (sum, row) => sum + Number(row.recommended_vendor_count || 0),
                0
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-xs font-black uppercase text-emerald-700">
              Pending Actions
            </div>
            <div className="mt-2 text-4xl font-black text-emerald-950">
              {rows.filter((row) => row.status === "pending").length}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Active Recruitment Targets
          </h2>

          <div className="mt-4 overflow-auto">
            <table className="min-w-[1200px] w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase text-slate-500">
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">District / City</th>
                  <th className="px-3 py-2">Subdivision</th>
                  <th className="px-3 py-2">Block</th>
                  <th className="px-3 py-2">Locality</th>
                  <th className="px-3 py-2">Shortage</th>
                  <th className="px-3 py-2">Need</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id} className="bg-slate-50">
                      <td className="px-3 py-3 font-black text-slate-950">
                        {row.module} · {row.category || "all"}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {geoName(stateNames, row.geo_state_id)}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {geoName(districtNames, row.geo_district_id)}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {geoName(subdivisionNames, row.geo_subdivision_id)}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {geoName(blockNames, row.geo_block_id)}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {geoName(placeNames, row.geo_place_id)}
                      </td>
                      <td className="px-3 py-3 font-black">
                        {row.shortage_score}
                      </td>
                      <td className="px-3 py-3 font-black text-amber-800">
                        {row.recommended_vendor_count}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {row.priority}
                      </td>
                      <td className="px-3 py-3 font-bold">
                        {row.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center font-bold text-slate-500">
                      No active recruitment targets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
