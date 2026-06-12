import { createClient } from "@supabase/supabase-js";
import { calculateMarketplaceSelfOptimization } from "@/lib/marketplace/self-optimization-engine";

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
    conversionRes,
    autonomousRes,
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
    supabase
      .from("vendor_conversion_events")
      .select("event_type,module,category,opportunity_id,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id,created_at")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000),
    supabase
      .from("marketplace_autonomous_recruitment_intelligence")
      .select("*")
      .order("optimization_score", { ascending: false })
      .limit(30),
    loadGeoNameMap("geo_states"),
    loadGeoNameMap("geo_districts"),
    loadGeoNameMap("geo_subdivisions"),
    loadGeoNameMap("geo_blocks"),
    loadGeoNameMap("geo_places"),
  ]);

  const rows = recruitmentRes.data || [];
  const conversionEvents = conversionRes.data || [];
  const autonomousRows = autonomousRes.data || [];

  const recruitImmediately = autonomousRows.filter(
    (row) => row.decision === "recruit_immediately"
  );

  const autonomousIncreaseVisibility = autonomousRows.filter(
    (row) => row.decision === "increase_visibility"
  );

  const improveMessage = autonomousRows.filter(
    (row) => row.decision === "improve_message"
  );

  const watchAutonomous = autonomousRows.filter(
    (row) => row.decision === "watch"
  );

  const countEvent = (type: string) =>
    conversionEvents.filter((event) => event.event_type === type).length;

  const views = countEvent("opportunity_viewed");
  const clicks = countEvent("opportunity_clicked");
  const started = countEvent("registration_started");
  const completed = countEvent("registration_completed");
  const approved = countEvent("vendor_approved");
  const firstListings = countEvent("first_listing_created");

  const pct = (value: number, base: number) =>
    base > 0 ? `${Math.round((value / base) * 100)}%` : "—";


  const keyOf = (event: any) =>
    [
      event.opportunity_id || "no-opportunity",
      event.module || "unknown",
      event.category || "all",
      event.geo_state_id || "",
      event.geo_district_id || "",
      event.geo_subdivision_id || "",
      event.geo_block_id || "",
      event.geo_place_id || "",
    ].join("|");

  const attribution = new Map<string, any>();

  for (const event of conversionEvents) {
    const key = keyOf(event);
    const current =
      attribution.get(key) || {
        opportunity_id: event.opportunity_id,
        module: event.module || "unknown",
        category: event.category || "all",
        geo_state_id: event.geo_state_id,
        geo_district_id: event.geo_district_id,
        geo_subdivision_id: event.geo_subdivision_id,
        geo_block_id: event.geo_block_id,
        geo_place_id: event.geo_place_id,
        views: 0,
        clicks: 0,
        started: 0,
        completed: 0,
        approved: 0,
        firstListings: 0,
      };

    if (event.event_type === "opportunity_viewed") current.views += 1;
    if (event.event_type === "opportunity_clicked") current.clicks += 1;
    if (event.event_type === "registration_started") current.started += 1;
    if (event.event_type === "registration_completed") current.completed += 1;
    if (event.event_type === "vendor_approved") current.approved += 1;
    if (event.event_type === "first_listing_created") current.firstListings += 1;

    attribution.set(key, current);
  }

  const topOpportunities = Array.from(attribution.values())
    .filter((item) => item.views || item.clicks || item.firstListings)
    .map((item) => ({
      ...item,
      activationRate:
        item.views > 0 ? Math.round((item.firstListings / item.views) * 100) : 0,
      clickRate:
        item.views > 0 ? Math.round((item.clicks / item.views) * 100) : 0,
      recruitmentScore:
        item.firstListings * 30 +
        item.approved * 20 +
        item.completed * 12 +
        item.clicks * 3 +
        item.views,
    }))
    .sort((a, b) => b.recruitmentScore - a.recruitmentScore)
    .slice(0, 8);

  const geoAttribution = new Map<string, any>();

  for (const item of topOpportunities) {
    const geoKey = [
      item.module,
      item.category,
      item.geo_state_id || "",
      item.geo_district_id || "",
      item.geo_subdivision_id || "",
      item.geo_block_id || "",
      item.geo_place_id || "",
    ].join("|");

    const current =
      geoAttribution.get(geoKey) || {
        module: item.module,
        category: item.category,
        geo_state_id: item.geo_state_id,
        geo_district_id: item.geo_district_id,
        geo_subdivision_id: item.geo_subdivision_id,
        geo_block_id: item.geo_block_id,
        geo_place_id: item.geo_place_id,
        views: 0,
        clicks: 0,
        approved: 0,
        firstListings: 0,
        recruitmentScore: 0,
      };

    current.views += item.views;
    current.clicks += item.clicks;
    current.approved += item.approved;
    current.firstListings += item.firstListings;
    current.recruitmentScore += item.recruitmentScore;

    geoAttribution.set(geoKey, current);
  }

  const topGeographies = Array.from(geoAttribution.values())
    .sort((a, b) => b.recruitmentScore - a.recruitmentScore)
    .slice(0, 6);

  const optimizationRecommendations = rows
    .map((row) => {
      const matched = topOpportunities.find(
        (item) =>
          item.module === row.module &&
          (item.category || "all") === (row.category || "all") &&
          (item.geo_state_id || "") === (row.geo_state_id || "") &&
          (item.geo_district_id || "") === (row.geo_district_id || "") &&
          (item.geo_subdivision_id || "") === (row.geo_subdivision_id || "") &&
          (item.geo_block_id || "") === (row.geo_block_id || "") &&
          (item.geo_place_id || "") === (row.geo_place_id || "")
      );

      const result = calculateMarketplaceSelfOptimization({
        module: row.module,
        category: row.category,
        opportunityScore: row.opportunity_score,
        shortageScore: row.shortage_score,
        views: matched?.views || 0,
        clicks: matched?.clicks || 0,
        registrationsCompleted: matched?.completed || 0,
        approvedVendors: matched?.approved || 0,
        firstListings: matched?.firstListings || 0,
      });

      return {
        ...row,
        views: matched?.views || 0,
        clicks: matched?.clicks || 0,
        completed: matched?.completed || 0,
        approved: matched?.approved || 0,
        firstListings: matched?.firstListings || 0,
        ...result,
      };
    })
    .sort((a, b) => b.optimizationScore - a.optimizationScore)
    .slice(0, 9);

  const promoteNow = optimizationRecommendations.filter(
    (item) => item.recommendation === "promote_immediately"
  );

  const increaseVisibility = optimizationRecommendations.filter(
    (item) => item.recommendation === "increase_visibility"
  );

  const needsImprovement = optimizationRecommendations.filter(
    (item) => item.recommendation === "needs_improvement"
  );

  const funnel = [
    { label: "Views", value: views, rate: "100%" },
    { label: "CTA Clicks", value: clicks, rate: pct(clicks, views) },
    { label: "Registrations Started", value: started, rate: pct(started, clicks) },
    { label: "Registrations Completed", value: completed, rate: pct(completed, started) },
    { label: "Approved Vendors", value: approved, rate: pct(approved, completed) },
    { label: "First Listings", value: firstListings, rate: pct(firstListings, approved) },
  ];

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

        <div className="mt-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Vendor Conversion Analytics · Last 30 Days
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Opportunity to Vendor Activation Funnel
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Measures whether public vendor opportunities are generating real vendor registrations, approvals and first listings.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
              <div className="text-xs font-black uppercase text-emerald-700">
                Overall Activation
              </div>
              <div className="mt-1 text-3xl font-black text-emerald-950">
                {pct(firstListings, views)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-6">
            {funnel.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-black uppercase text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-3xl font-black text-slate-950">
                  {item.value}
                </div>
                <div className="mt-1 text-xs font-black text-emerald-700">
                  {item.rate}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-black uppercase text-blue-700">Click-through</div>
              <div className="mt-2 text-2xl font-black text-blue-950">{pct(clicks, views)}</div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="text-xs font-black uppercase text-violet-700">Registration Completion</div>
              <div className="mt-2 text-2xl font-black text-violet-950">{pct(completed, started)}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-black uppercase text-amber-700">Approval Rate</div>
              <div className="mt-2 text-2xl font-black text-amber-950">{pct(approved, completed)}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-black uppercase text-emerald-700">Vendor Activation</div>
              <div className="mt-2 text-2xl font-black text-emerald-950">{pct(firstListings, approved)}</div>
            </div>
          </div>
        </div>




        <div className="mt-6 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
            Autonomous Vendor Recruitment Intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Recruitment Action Decisions
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Uses shortage, opportunity, conversion and activation signals to decide where 3Bigha should recruit vendors now.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-black uppercase text-rose-700">Recruit Immediately</div>
              <div className="mt-2 text-3xl font-black text-rose-950">{recruitImmediately.length}</div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-black uppercase text-blue-700">Increase Visibility</div>
              <div className="mt-2 text-3xl font-black text-blue-950">{autonomousIncreaseVisibility.length}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-black uppercase text-amber-700">Improve Message</div>
              <div className="mt-2 text-3xl font-black text-amber-950">{improveMessage.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-600">Watch</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{watchAutonomous.length}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {autonomousRows.length ? (
              autonomousRows.slice(0, 10).map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        {row.module} · {row.category || "all"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {geoName(placeNames, row.geo_place_id)} · {geoName(districtNames, row.geo_district_id)}
                      </div>
                    </div>
                    <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                      {row.decision?.replaceAll("_", " ")} · {Math.round(Number(row.optimization_score || 0))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-black">
                    <div>Shortage<br /><span className="text-slate-950">{Math.round(Number(row.shortage_score || 0))}</span></div>
                    <div>Opportunity<br /><span className="text-slate-950">{Math.round(Number(row.opportunity_score || 0))}</span></div>
                    <div>Conversion<br /><span className="text-slate-950">{Math.round(Number(row.conversion_score || 0))}</span></div>
                    <div>Priority<br /><span className="text-rose-700">{row.action_priority}</span></div>
                  </div>

                  <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
                    {row.recommendation}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                No autonomous recruitment decisions yet. Run /api/system/autonomous-vendor-recruitment-refresh after marketplace intelligence refresh.
              </div>
            )}
          </div>
        </div>


        <div className="mt-6 rounded-3xl border border-fuchsia-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-700">
            Marketplace Self-Optimization Engine
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            AI Recruitment Priority Recommendations
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Combines shortage pressure, opportunity score and real conversion behavior to decide which vendor opportunities should receive more visibility.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-700">
                🔥 Promote Immediately
              </div>

              <div className="mt-4 grid gap-3">
                {promoteNow.length ? (
                  promoteNow.map((item, index) => (
                    <div key={`${item.id}-promote-${index}`} className="rounded-2xl border border-emerald-200 bg-white p-4">
                      <div className="text-sm font-black text-emerald-950">
                        {item.module} · {item.category || "all"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {geoName(placeNames, item.geo_place_id)} · {geoName(districtNames, item.geo_district_id)}
                      </div>
                      <div className="mt-3 text-3xl font-black text-emerald-800">
                        {item.optimizationScore}
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                        {item.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-bold text-slate-500">
                    No immediate promotion candidate yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-blue-700">
                📈 Increase Visibility
              </div>

              <div className="mt-4 grid gap-3">
                {increaseVisibility.length ? (
                  increaseVisibility.map((item, index) => (
                    <div key={`${item.id}-visibility-${index}`} className="rounded-2xl border border-blue-200 bg-white p-4">
                      <div className="text-sm font-black text-blue-950">
                        {item.module} · {item.category || "all"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {geoName(placeNames, item.geo_place_id)} · {geoName(districtNames, item.geo_district_id)}
                      </div>
                      <div className="mt-3 text-3xl font-black text-blue-800">
                        {item.optimizationScore}
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                        {item.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-white p-4 text-sm font-bold text-slate-500">
                    No visibility upgrade candidate yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-amber-700">
                ⚠ Needs Improvement
              </div>

              <div className="mt-4 grid gap-3">
                {needsImprovement.length ? (
                  needsImprovement.map((item, index) => (
                    <div key={`${item.id}-improve-${index}`} className="rounded-2xl border border-amber-200 bg-white p-4">
                      <div className="text-sm font-black text-amber-950">
                        {item.module} · {item.category || "all"}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {geoName(placeNames, item.geo_place_id)} · {geoName(districtNames, item.geo_district_id)}
                      </div>
                      <div className="mt-3 text-3xl font-black text-amber-800">
                        {item.optimizationScore}
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                        {item.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-white p-4 text-sm font-bold text-slate-500">
                    No weak opportunity detected yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Best Converting Opportunities
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Opportunity Attribution Intelligence
            </h2>

            <div className="mt-4 grid gap-3">
              {topOpportunities.length ? (
                topOpportunities.map((item, index) => (
                  <div key={`${item.module}-${item.category}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-950">
                          {item.module} · {item.category || "all"}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {geoName(placeNames, item.geo_place_id)} · {geoName(districtNames, item.geo_district_id)}
                        </div>
                      </div>
                      <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                        Score {item.recruitmentScore}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-6 gap-2 text-center text-xs font-black">
                      <div>Views<br /><span className="text-slate-950">{item.views}</span></div>
                      <div>Clicks<br /><span className="text-slate-950">{item.clicks}</span></div>
                      <div>Started<br /><span className="text-slate-950">{item.started}</span></div>
                      <div>Done<br /><span className="text-slate-950">{item.completed}</span></div>
                      <div>Approved<br /><span className="text-slate-950">{item.approved}</span></div>
                      <div>Listings<br /><span className="text-emerald-700">{item.firstListings}</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  No attributed conversion data yet. It will appear after visitors view, click and register from vendor opportunities.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Best Converting Geographies
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Geography Attribution Intelligence
            </h2>

            <div className="mt-4 grid gap-3">
              {topGeographies.length ? (
                topGeographies.map((item, index) => (
                  <div key={`${item.module}-${item.category}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-black text-slate-950">
                      {geoName(placeNames, item.geo_place_id)} · {geoName(districtNames, item.geo_district_id)}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {item.module} · {item.category || "all"}
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-black">
                      <div>Views<br /><span className="text-slate-950">{item.views}</span></div>
                      <div>Clicks<br /><span className="text-slate-950">{item.clicks}</span></div>
                      <div>Approved<br /><span className="text-slate-950">{item.approved}</span></div>
                      <div>Listings<br /><span className="text-emerald-700">{item.firstListings}</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  No geography conversion pattern detected yet.
                </div>
              )}
            </div>
          </div>
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
