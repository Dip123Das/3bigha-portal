import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type GeoNameMap = Map<string, string>;

type OpportunityRow = {
  id: string;
  module: string;
  category: string | null;
  opportunity_score: number;
  priority: string;
  kind: string | null;
  recommendation: string | null;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
  created_at: string;
};

type GrowthRow = {
  id: string;
  module: string;
  category: string | null;
  growth_score: number;
  growth_level: string;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_block_id: string | null;
};

type ExpansionRow = {
  id: string;
  module: string;
  category: string | null;
  growth_score: number;
  shortage_score: number;
  expansion_score: number;
  recommendation: string;
  reason: string;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_block_id: string | null;
};

type RecruitmentRow = {
  id: string;
  module: string;
  category: string | null;
  opportunity_score: number;
  shortage_score: number;
  recommended_vendor_count: number;
  priority: string;
  status: string;
  reason: string;
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_block_id: string | null;
};

async function countTable(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    count: count ?? 0,
    error: error?.message ?? null,
  };
}

async function opportunityRows() {
  const { data } = await supabase
    .from("marketplace_opportunity_zones")
    .select(
      "id,module,category,opportunity_score,priority,kind,recommendation,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id,created_at"
    )
    .order("opportunity_score", { ascending: false })
    .limit(30);

  return (data ?? []) as OpportunityRow[];
}

async function signalRows(table: string) {
  const { data } = await supabase
    .from(table)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

async function growthRows() {
  const { data } = await supabase
    .from("marketplace_growth_scores")
    .select("id,module,category,growth_score,growth_level,geo_state_id,geo_district_id,geo_block_id")
    .order("growth_score", { ascending: false })
    .limit(12);

  return (data ?? []) as GrowthRow[];
}

async function expansionRows() {
  const { data } = await supabase
    .from("marketplace_expansion_recommendations")
    .select("id,module,category,growth_score,shortage_score,expansion_score,recommendation,reason,geo_state_id,geo_district_id,geo_block_id")
    .order("expansion_score", { ascending: false })
    .limit(12);

  return (data ?? []) as ExpansionRow[];
}

async function recruitmentRows() {
  const { data } = await supabase
    .from("marketplace_vendor_recruitment_queue")
    .select("id,module,category,opportunity_score,shortage_score,recommended_vendor_count,priority,status,reason,geo_state_id,geo_district_id,geo_block_id")
    .order("shortage_score", { ascending: false })
    .limit(12);

  return (data ?? []) as RecruitmentRow[];
}

function label(value: string | null | undefined) {
  return value && String(value).trim() ? value : "—";
}

async function loadGeoNameMap(table: string) {
  const { data } = await supabase
    .from(table)
    .select("id,name")
    .limit(1000);

  const map: GeoNameMap = new Map();

  for (const row of data || []) {
    if (row?.id && row?.name) {
      map.set(String(row.id), String(row.name));
    }
  }

  return map;
}

function geoName(map: GeoNameMap, id: string | null | undefined) {
  if (!id) return "—";
  return map.get(id) || "Unknown";
}

function badgeTone(kind: string | null) {
  if (kind === "high_opportunity") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (kind === "vendor_shortage") return "bg-amber-100 text-amber-800 border-amber-200";
  if (kind === "oversupplied") return "bg-rose-100 text-rose-800 border-rose-200";
  if (kind === "balanced") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function MarketplaceIntelligenceAdminPage() {
  const [
    counts,
    opportunities,
    demandSignals,
    supplySignals,
    gapSignals,
    growthLeaders,
    expansionLeaders,
    recruitmentTargets,
    stateNames,
    districtNames,
    subdivisionNames,
    blockNames,
    placeNames,
  ] =
    await Promise.all([
      Promise.all([
        countTable("marketplace_demand_signals"),
        countTable("marketplace_supply_signals"),
        countTable("marketplace_gap_analysis"),
        countTable("marketplace_opportunity_zones"),
      ]),
      opportunityRows(),
      signalRows("marketplace_demand_signals"),
      signalRows("marketplace_supply_signals"),
      signalRows("marketplace_gap_analysis"),
      growthRows(),
      expansionRows(),
      recruitmentRows(),
      loadGeoNameMap("geo_states"),
      loadGeoNameMap("geo_districts"),
      loadGeoNameMap("geo_subdivisions"),
      loadGeoNameMap("geo_blocks"),
      loadGeoNameMap("geo_places"),
    ]);

  const highOpportunity = opportunities.filter(
    (row) => row.kind === "high_opportunity"
  ).length;

  const vendorShortage = opportunities.filter(
    (row) => row.kind === "vendor_shortage"
  ).length;

  const oversupplied = opportunities.filter(
    (row) => row.kind === "oversupplied"
  ).length;

  const expandNow = expansionLeaders.filter(
    (row) => row.recommendation === "expand"
  ).length;

  const watchZones = expansionLeaders.filter(
    (row) => row.recommendation === "watch"
  ).length;

  const marketplaceHealth =
    growthLeaders.length > 0
      ? Math.round(
          growthLeaders.reduce((sum, row) => sum + row.growth_score, 0) /
            growthLeaders.length
        )
      : 0;

  const topExpansion = expansionLeaders[0];
  const topGrowth = growthLeaders[0];

  const executiveSummary = topExpansion
    ? `${topExpansion.module} is the leading expansion candidate with score ${topExpansion.expansion_score}. Recommendation: ${topExpansion.recommendation}.`
    : "Run marketplace intelligence refresh to generate executive recommendations.";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
            3Bigha Marketplace Intelligence
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Demand-Supply Opportunity Center
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Monitor marketplace demand, supply saturation, vendor shortage,
            oversupply and opportunity zones across property, materials,
            services and rentals.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {counts.map((item) => (
            <div
              key={item.table}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                {item.table.replace("marketplace_", "").replaceAll("_", " ")}
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

        <div className="mt-6 rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Executive Summary
          </p>
          <h2 className="mt-2 text-2xl font-black text-indigo-950">
            Marketplace Health: {marketplaceHealth}/100
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-indigo-800">
            {executiveSummary}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Expand Now</div>
              <div className="mt-2 text-3xl font-black text-indigo-950">{expandNow}</div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Watch Zones</div>
              <div className="mt-2 text-3xl font-black text-indigo-950">{watchZones}</div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Growth Leader</div>
              <div className="mt-2 text-lg font-black text-indigo-950">{topGrowth?.module || "—"}</div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="text-xs font-black uppercase text-slate-500">Recruitment Targets</div>
              <div className="mt-2 text-3xl font-black text-indigo-950">{recruitmentTargets.length}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-700">
              High Opportunity
            </div>
            <div className="mt-3 text-4xl font-black text-emerald-950">
              {highOpportunity}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-wider text-amber-700">
              Vendor Shortage
            </div>
            <div className="mt-3 text-4xl font-black text-amber-950">
              {vendorShortage}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-wider text-rose-700">
              Oversupplied
            </div>
            <div className="mt-3 text-4xl font-black text-rose-950">
              {oversupplied}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MiniRanking
            title="Growth Score Leaderboard"
            rows={growthLeaders}
            scoreKey="growth_score"
            labelKey="growth_level"
            stateNames={stateNames}
            districtNames={districtNames}
            blockNames={blockNames}
          />

          <MiniRanking
            title="Expansion Recommendations"
            rows={expansionLeaders}
            scoreKey="expansion_score"
            labelKey="recommendation"
            stateNames={stateNames}
            districtNames={districtNames}
            blockNames={blockNames}
          />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Vendor Recruitment Targets
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recruitmentTargets.length ? (
              recruitmentTargets.map((row) => (
                <div key={row.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-black text-amber-950">
                    {row.module} · Need {row.recommended_vendor_count} vendors
                  </div>
                  <div className="mt-2 text-xs font-bold text-amber-800">
                    Priority: {row.priority} · Status: {row.status}
                  </div>
                  <div className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                    district: {geoName(districtNames, row.geo_district_id)}
                    <br />
                    block: {geoName(blockNames, row.geo_block_id)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-slate-500">
                No recruitment target crossed the shortage threshold.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Top Opportunity Zones
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Module</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Geo Level</th>
                  <th className="px-3 py-2">Recommendation</th>
                </tr>
              </thead>

              <tbody>
                {opportunities.map((row) => (
                  <tr
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <td className="px-3 py-3 font-black text-slate-900">
                      {row.module}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">
                      {label(row.category)}
                    </td>
                    <td className="px-3 py-3 font-black text-slate-950">
                      {row.opportunity_score}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">
                      {row.priority}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${badgeTone(
                          row.kind
                        )}`}
                      >
                        {label(row.kind)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-600">
                      state: {geoName(stateNames, row.geo_state_id)}
                      <br />
                      district: {geoName(districtNames, row.geo_district_id)}
                      <br />
                      block: {geoName(blockNames, row.geo_block_id)}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold leading-5 text-slate-600">
                      {label(row.recommendation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SignalPreview title="Latest Demand Signals" rows={demandSignals} />
          <SignalPreview title="Latest Supply Signals" rows={supplySignals} />
          <SignalPreview title="Latest Gap Analysis" rows={gapSignals} />
        </div>
      </section>
    </main>
  );
}

function MiniRanking({
  title,
  rows,
  scoreKey,
  labelKey,
  stateNames,
  districtNames,
  blockNames,
}: {
  title: string;
  rows: any[];
  scoreKey: string;
  labelKey: string;
  stateNames: GeoNameMap;
  districtNames: GeoNameMap;
  blockNames: GeoNameMap;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {row.module} · {label(row.category)}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    district: {geoName(districtNames, row.geo_district_id)} · block: {geoName(blockNames, row.geo_block_id)}
                  </div>
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  {row[scoreKey]}
                </div>
              </div>

              <div className="mt-2 text-xs font-bold text-slate-600">
                {String(row[labelKey] || "—")}
              </div>

              {row.reason ? (
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  {row.reason}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">
            No records generated yet.
          </p>
        )}
      </div>
    </div>
  );
}

function SignalPreview({
  title,
  rows,
}: {
  title: string;
  rows: any[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 6).map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-sm font-black text-slate-900">
                {row.module} · {label(row.category)}
              </div>

              <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600">
                {JSON.stringify(row, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">
            No signals generated yet. Run marketplace intelligence refresh.
          </p>
        )}
      </div>
    </div>
  );
}
